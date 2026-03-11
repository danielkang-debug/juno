"""
tools/server.py — Juno Flask API Server
Layer 2: Navigation (routes requests to db + route tools).
Serves static files from the juno/ project root.
Run: python3 tools/server.py
"""

import sys
import os

# Allow imports from juno/ root (for tools.db and tools.route)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, request, send_from_directory
import tools.db as db
import tools.route as route_module

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

_initialized = False


def startup():
    """Initialize DB and seed data on first use."""
    global _initialized
    if _initialized:
        return
    _initialized = True

    db.init_db()

    if not db.list_patients(include_discharged=True):
        print("[juno] First run — seeding mock data...")
        db.seed_mock_data()
        patients = db.list_patients()
        total = len(patients)
        for i, patient in enumerate(patients, 1):
            if patient["lat"] is None:
                print(f"[juno] Geocoding patient {i}/{total}: {patient['name']}...")
                lat, lon = route_module.geocode_address(patient["address"])
                if lat is not None:
                    db.update_patient_coords(patient["id"], lat, lon)
                    print(f"[juno]   → {lat:.4f}, {lon:.4f}")
                else:
                    print(f"[juno]   → geocoding failed, skipping")
        print("[juno] Seed complete.")
    else:
        print("[juno] Database loaded.")


@app.before_request
def ensure_initialized():
    startup()


# ---------------------------------------------------------------------------
# Static File Serving
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(ROOT_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    # Don't serve files from tools/ or architecture/ directories
    if filename.startswith("tools/") or filename.startswith("architecture/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(ROOT_DIR, filename)


# ---------------------------------------------------------------------------
# Patient Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/patients", methods=["GET"])
def get_patients():
    include_discharged = request.args.get("include_discharged") == "true"
    patients = db.list_patients(include_discharged=include_discharged)
    return jsonify(patients)


@app.route("/api/patients", methods=["POST"])
def create_patient():
    data = request.get_json() or {}
    if not data.get("name") or not data.get("address"):
        return jsonify({"error": "name and address are required"}), 400

    patient = db.create_patient(data)

    # Geocode immediately
    lat, lon = route_module.geocode_address(patient["address"])
    if lat is not None:
        db.update_patient_coords(patient["id"], lat, lon)
        patient["lat"] = lat
        patient["lon"] = lon

    return jsonify(patient), 201


@app.route("/api/patients/<patient_id>", methods=["PUT"])
def update_patient(patient_id):
    data = request.get_json() or {}
    existing = db.get_patient(patient_id)
    if not existing:
        return jsonify({"error": "Patient not found"}), 404

    address_changed = "address" in data and data["address"] != existing["address"]
    patient = db.update_patient(patient_id, data)

    if address_changed:
        lat, lon = route_module.geocode_address(patient["address"])
        if lat is not None:
            db.update_patient_coords(patient_id, lat, lon)
            patient["lat"] = lat
            patient["lon"] = lon
        else:
            db.update_patient_coords(patient_id, None, None)
            patient["lat"] = None
            patient["lon"] = None

    return jsonify(patient)


@app.route("/api/patients/<patient_id>", methods=["DELETE"])
def delete_patient(patient_id):
    success = db.delete_patient(patient_id)
    if not success:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Appointment Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    date_str = request.args.get("date")
    month_str = request.args.get("month")

    if date_str:
        return jsonify(db.list_appointments_by_date(date_str))
    elif month_str:
        return jsonify(db.list_appointments_by_month(month_str))
    else:
        return jsonify({"error": "Provide ?date=YYYY-MM-DD or ?month=YYYY-MM"}), 400


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json() or {}
    required = ["patient_id", "date", "time", "visit_type"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    apt = db.create_appointment(data)
    return jsonify(apt), 201


@app.route("/api/appointments/<apt_id>", methods=["PUT"])
def update_appointment(apt_id):
    data = request.get_json() or {}
    apt = db.update_appointment(apt_id, data)
    if not apt:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify(apt)


@app.route("/api/appointments/<apt_id>", methods=["DELETE"])
def cancel_appointment(apt_id):
    success = db.cancel_appointment(apt_id)
    if not success:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Route Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/geocode", methods=["GET"])
def geocode_address():
    address = request.args.get("address", "").strip()
    if not address:
        return jsonify({"error": "address is required"}), 400
    lat, lon = route_module.geocode_address(address)
    if lat is None:
        return jsonify({"error": "Could not geocode address"}), 422
    return jsonify({"lat": lat, "lon": lon, "address": address})


@app.route("/api/routes/optimize", methods=["POST"])
def optimize_route():
    data = request.get_json() or {}
    date_str = data.get("date")
    if not date_str:
        return jsonify({"error": "date is required"}), 400

    # Optional home starting point (pre-geocoded by frontend)
    start_location = None
    start_lat = data.get("start_lat")
    start_lon = data.get("start_lon")
    if start_lat is not None and start_lon is not None:
        start_location = {
            "lat": float(start_lat),
            "lon": float(start_lon),
            "address": data.get("start_address", ""),
        }

    appointments = db.list_appointments_by_date(date_str)
    result = route_module.optimize_route(appointments, start_location=start_location)

    # Save the optimized route
    ordered_ids = [a["id"] for a in result["ordered_appointments"]]
    db.save_route(date_str, ordered_ids, result["total_travel_minutes"])

    return jsonify(result)


@app.route("/api/routes/save", methods=["POST"])
def save_route():
    data = request.get_json() or {}
    date_str = data.get("date")
    ordered_ids = data.get("ordered_appointment_ids", [])
    total_minutes = int(data.get("estimated_travel_minutes", 0))
    if not date_str:
        return jsonify({"error": "date is required"}), 400
    db.save_route(date_str, ordered_ids, total_minutes)
    return jsonify({"ok": True})


@app.route("/api/routes/<date_str>", methods=["GET"])
def get_route(date_str):
    saved = db.get_route(date_str)
    if not saved:
        return jsonify({"error": "No saved route for this date"}), 404
    return jsonify(saved)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5001)
