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

from flask import Flask, jsonify, request, send_from_directory, session
import tools.db as db
import tools.route as route_module

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
app.secret_key = os.environ.get('JUNO_SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

_initialized = False


def startup():
    """Initialize DB on first use. No auto-seeding — users start with empty data."""
    global _initialized
    if _initialized:
        return
    _initialized = True
    db.init_db()
    print("[juno] Database initialized.")


@app.before_request
def ensure_initialized():
    startup()


# ---------------------------------------------------------------------------
# Auth — Middleware & Endpoints
# ---------------------------------------------------------------------------

@app.before_request
def require_auth():
    """Protect all /api/* endpoints except /api/auth/*. Static files are public."""
    path = request.path
    if path.startswith('/api/auth/') or path.startswith('/api/admin/'):
        return
    if not path.startswith('/api/'):
        return
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    """POST /api/auth/register  {email, password, name}
    Creates a new user account. Sets session. Returns user info or 409/400."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()

    if not email or not password or not name:
        return jsonify({"error": "email, password, and name are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if db.get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists"}), 409

    user = db.create_user(email, password, name)
    session['user_id'] = user['id']
    return jsonify(user), 201


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    """POST /api/auth/login  {email, password}
    Verifies credentials. Sets session. Returns user info or 401."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = db.get_user_by_email(email)
    if not user or not db.verify_password(user['password_hash'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session['user_id'] = user['id']
    return jsonify({"id": user['id'], "email": user['email'], "name": user['name'], "created_at": user['created_at']})


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    """POST /api/auth/logout — clears the session."""
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    """GET /api/auth/me — returns current user info from session, or 401."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    user = db.get_user_by_id(user_id)
    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 401
    return jsonify(user)


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
    response = send_from_directory(ROOT_DIR, filename)
    # Disable caching for JS/CSS in development so edits are always picked up
    if filename.endswith(('.js', '.css', '.html')):
        response.headers['Cache-Control'] = 'no-store'
    return response


# ---------------------------------------------------------------------------
# Patient Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/patients", methods=["GET"])
def get_patients():
    """GET /api/patients?include_discharged=true|false
    Returns all active+postpartum patients by default; pass include_discharged=true for all."""
    user_id = session['user_id']
    include_discharged = request.args.get("include_discharged") == "true"
    patients = db.list_patients(user_id, include_discharged=include_discharged)
    return jsonify(patients)


@app.route("/api/patients", methods=["POST"])
def create_patient():
    """POST /api/patients  {name, address, phone?, gestational_age_weeks?, ...}
    Creates patient and immediately geocodes address via Nominatim (~1s delay).
    Returns 400 if name or address missing. lat/lon may be null if geocoding fails."""
    user_id = session['user_id']
    data = request.get_json() or {}
    if not data.get("name") or not data.get("address"):
        return jsonify({"error": "name and address are required"}), 400

    patient = db.create_patient(user_id, data)

    # Geocode immediately; lat/lon remain null if Nominatim fails (non-fatal)
    lat, lon = route_module.geocode_address(patient["address"])
    if lat is not None:
        db.update_patient_coords(patient["id"], lat, lon)
        patient["lat"] = lat
        patient["lon"] = lon

    return jsonify(patient), 201


@app.route("/api/patients/<patient_id>", methods=["PUT"])
def update_patient(patient_id):
    """PUT /api/patients/:id  {any patient fields}
    Re-geocodes if address changed; clears lat/lon to null on geocoding failure."""
    user_id = session['user_id']
    data = request.get_json() or {}
    existing = db.get_patient(user_id, patient_id)
    if not existing:
        return jsonify({"error": "Patient not found"}), 404

    address_changed = "address" in data and data["address"] != existing["address"]
    patient = db.update_patient(user_id, patient_id, data)

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
    """DELETE /api/patients/:id  — soft delete: sets status='discharged', never removes rows."""
    user_id = session['user_id']
    success = db.delete_patient(user_id, patient_id)
    if not success:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Appointment Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    """GET /api/appointments?date=YYYY-MM-DD  → list of appointments with joined patient data
    GET /api/appointments?month=YYYY-MM       → [{date, count}, ...] for calendar dot rendering
    Exactly one query param required; returns 400 otherwise."""
    user_id = session['user_id']
    date_str = request.args.get("date")
    month_str = request.args.get("month")

    if date_str:
        return jsonify(db.list_appointments_by_date(user_id, date_str))
    elif month_str:
        return jsonify(db.list_appointments_by_month(user_id, month_str))
    else:
        return jsonify({"error": "Provide ?date=YYYY-MM-DD or ?month=YYYY-MM"}), 400


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    """POST /api/appointments  {patient_id, date, time, visit_type, notes?, appointment_kind?, duration_minutes?, window_end?}
    appointment_kind: 'fixed' (exact time) or 'flexible' (time=window_start, window_end required).
    Returns 400 if any required field is missing."""
    user_id = session['user_id']
    data = request.get_json() or {}
    required = ["patient_id", "date", "time", "visit_type"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    apt = db.create_appointment(user_id, data)
    if not apt:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify(apt), 201


@app.route("/api/appointments/<apt_id>", methods=["PUT"])
def update_appointment(apt_id):
    """PUT /api/appointments/:id  {any appointment fields}"""
    user_id = session['user_id']
    data = request.get_json() or {}
    apt = db.update_appointment(user_id, apt_id, data)
    if not apt:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify(apt)


@app.route("/api/appointments/<apt_id>", methods=["DELETE"])
def cancel_appointment(apt_id):
    """DELETE /api/appointments/:id  — soft cancel: sets status='cancelled', never removes rows."""
    user_id = session['user_id']
    success = db.cancel_appointment(user_id, apt_id)
    if not success:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Route Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/geocode", methods=["GET"])
def geocode_address():
    """GET /api/geocode?address=<string>  → {lat, lon, address}
    Calls Nominatim (1 req/sec rate limit). Returns 422 if address not found."""
    address = request.args.get("address", "").strip()
    if not address:
        return jsonify({"error": "address is required"}), 400
    lat, lon = route_module.geocode_address(address)
    if lat is None:
        return jsonify({"error": "Could not geocode address"}), 422
    return jsonify({"lat": lat, "lon": lon, "address": address})


@app.route("/api/routes/optimize", methods=["POST"])
def optimize_route():
    """POST /api/routes/optimize  {date, start_lat?, start_lon?, start_address?}
    Runs nearest-neighbor TSP on the day's geocoded appointments, then tries OSRM
    for real road geometry (falls back to haversine estimates if OSRM is unavailable).
    Auto-saves the result; re-optimizing the same date overwrites the saved route.

    Response shape:
      {
        ordered_appointments: [...],       # full apt+patient dicts in visit order
        legs: [{from_id, to_id, distance_km, minutes}],
        total_travel_minutes: int,
        geocoded_count: int,               # apts included in TSP
        skipped_count: int,                # apts with no lat/lon (appended at end)
        start_location: {lat, lon, address} | null,
        road_geometry: [[lat,lon], ...]    # actual road path, null if OSRM failed
      }
    """
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

    user_id = session['user_id']
    appointments = db.list_appointments_by_date(user_id, date_str)
    result = route_module.optimize_route(appointments, start_location=start_location)

    # Persist the optimized order; INSERT OR REPLACE makes this idempotent
    ordered_ids = [a["id"] for a in result["ordered_appointments"]]
    db.save_route(user_id, date_str, ordered_ids, result["total_travel_minutes"])

    return jsonify(result)


@app.route("/api/routes/save", methods=["POST"])
def save_route():
    """POST /api/routes/save  {date, ordered_appointment_ids, estimated_travel_minutes?}
    Manually persist a route order (e.g. after drag-to-reorder). Idempotent per date."""
    data = request.get_json() or {}
    date_str = data.get("date")
    ordered_ids = data.get("ordered_appointment_ids", [])
    total_minutes = int(data.get("estimated_travel_minutes", 0))
    if not date_str:
        return jsonify({"error": "date is required"}), 400
    user_id = session['user_id']
    db.save_route(user_id, date_str, ordered_ids, total_minutes)
    return jsonify({"ok": True})


@app.route("/api/routes/<date_str>", methods=["GET"])
def get_route(date_str):
    """GET /api/routes/YYYY-MM-DD  → saved route or 404 if none exists for this date."""
    user_id = session['user_id']
    saved = db.get_route(user_id, date_str)
    if not saved:
        return jsonify({"error": "No saved route for this date"}), 404
    return jsonify(saved)


# ---------------------------------------------------------------------------
# Admin Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/admin/users", methods=["GET"])
def admin_list_users():
    """GET /api/admin/users — lists all registered users (no passwords)."""
    users = db.list_all_users()
    return jsonify(users)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5001)
