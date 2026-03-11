"""
tools/db.py — Juno Data Layer
All SQL lives here. No Flask imports. No external dependencies.
"""

import sqlite3
import uuid
import json
from datetime import datetime, date, timedelta
from typing import Optional, List

DB_PATH = "juno.db"


def get_conn():
    """Return a connection with row_factory and foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't exist. Safe to call multiple times."""
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                lat REAL,
                lon REAL,
                phone TEXT DEFAULT '',
                gestational_age_weeks INTEGER DEFAULT 0,
                gestational_age_days INTEGER DEFAULT 0,
                due_date TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL REFERENCES patients(id),
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                visit_type TEXT DEFAULT 'prenatal',
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'scheduled',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                date TEXT UNIQUE NOT NULL,
                ordered_appointment_ids TEXT NOT NULL,
                estimated_travel_minutes INTEGER DEFAULT 0,
                saved_at TEXT NOT NULL
            );
        """)


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

def list_patients(include_discharged: bool = False) -> list:
    with get_conn() as conn:
        if include_discharged:
            rows = conn.execute(
                "SELECT * FROM patients ORDER BY name"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM patients WHERE status IN ('active', 'postpartum') ORDER BY name"
            ).fetchall()
        return [dict(r) for r in rows]


def get_patient(patient_id: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()
        return dict(row) if row else None


def create_patient(data: dict) -> dict:
    patient_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO patients (id, name, address, phone,
                gestational_age_weeks, gestational_age_days,
                due_date, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            data.get("name", ""),
            data.get("address", ""),
            data.get("phone", ""),
            int(data.get("gestational_age_weeks", 0)),
            int(data.get("gestational_age_days", 0)),
            data.get("due_date", ""),
            data.get("notes", ""),
            data.get("status", "active"),
            now,
        ))
    return get_patient(patient_id)


def update_patient(patient_id: str, data: dict):
    patient = get_patient(patient_id)
    if not patient:
        return None
    # Merge existing with updates
    fields = ["name", "address", "phone", "gestational_age_weeks",
              "gestational_age_days", "due_date", "notes", "status"]
    updates = {}
    for f in fields:
        if f in data:
            updates[f] = data[f]
    if not updates:
        return patient
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [patient_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE patients SET {set_clause} WHERE id = ?", values)
    return get_patient(patient_id)


def delete_patient(patient_id: str) -> bool:
    """Soft delete: set status to discharged."""
    patient = get_patient(patient_id)
    if not patient:
        return False
    with get_conn() as conn:
        conn.execute(
            "UPDATE patients SET status = 'discharged' WHERE id = ?",
            (patient_id,)
        )
    return True


def update_patient_coords(patient_id: str, lat: float, lon: float) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE patients SET lat = ?, lon = ? WHERE id = ?",
            (lat, lon, patient_id)
        )


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------

def list_appointments_by_date(date_str: str) -> list:
    """Return appointments joined with patient data for a given date."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT
                a.id, a.patient_id, a.date, a.time, a.visit_type,
                a.notes, a.status, a.created_at,
                p.name as patient_name, p.address, p.lat, p.lon,
                p.gestational_age_weeks, p.gestational_age_days,
                p.status as patient_status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.date = ? AND a.status != 'cancelled'
            ORDER BY a.time ASC
        """, (date_str,)).fetchall()
        return [dict(r) for r in rows]


def list_appointments_by_month(month_str: str) -> list:
    """Return count of appointments per day for a given month (YYYY-MM)."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT date, COUNT(*) as count
            FROM appointments
            WHERE date LIKE ? AND status != 'cancelled'
            GROUP BY date
        """, (f"{month_str}-%",)).fetchall()
        return [dict(r) for r in rows]


def create_appointment(data: dict) -> dict:
    apt_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO appointments (id, patient_id, date, time, visit_type, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
        """, (
            apt_id,
            data["patient_id"],
            data["date"],
            data["time"],
            data.get("visit_type", "prenatal"),
            data.get("notes", ""),
            now,
        ))
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,)).fetchone()
        return dict(row)


def update_appointment(apt_id: str, data: dict):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,)).fetchone()
        if not row:
            return None
    fields = ["patient_id", "date", "time", "visit_type", "notes", "status"]
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [apt_id]
        with get_conn() as conn:
            conn.execute(f"UPDATE appointments SET {set_clause} WHERE id = ?", values)
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,)).fetchone()
        return dict(row)


def cancel_appointment(apt_id: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM appointments WHERE id = ?", (apt_id,)).fetchone()
        if not row:
            return False
        conn.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", (apt_id,))
    return True


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def get_route(date_str: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM routes WHERE date = ?", (date_str,)
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        result["ordered_appointment_ids"] = json.loads(result["ordered_appointment_ids"])
        return result


def save_route(date_str: str, ordered_ids: list, travel_minutes: int):
    route_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO routes (id, date, ordered_appointment_ids, estimated_travel_minutes, saved_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            route_id,
            date_str,
            json.dumps(ordered_ids),
            travel_minutes,
            now,
        ))
    return get_route(date_str)


# ---------------------------------------------------------------------------
# Seed Data
# ---------------------------------------------------------------------------

def seed_mock_data() -> None:
    """Insert 6 fictional patients + appointments for the current week."""
    patients_data = [
        {
            "name": "Lena Bergmann",
            "address": "Kastanienallee 12, 10435 Berlin",
            "phone": "+49 30 12345678",
            "gestational_age_weeks": 38,
            "gestational_age_days": 2,
            "due_date": (date.today() + timedelta(days=12)).isoformat(),
            "notes": "Second pregnancy. All checks normal.",
            "status": "active",
        },
        {
            "name": "Maja Hoffmann",
            "address": "Schillerstraße 5, 80336 München",
            "phone": "+49 89 98765432",
            "gestational_age_weeks": 40,
            "gestational_age_days": 0,
            "due_date": date.today().isoformat(),
            "notes": "Due today. Monitor closely.",
            "status": "active",
        },
        {
            "name": "Sophie Richter",
            "address": "Eppendorfer Baum 7, 20249 Hamburg",
            "phone": "+49 40 11223344",
            "gestational_age_weeks": 35,
            "gestational_age_days": 5,
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "notes": "Mild swelling observed. Monitoring blood pressure.",
            "status": "active",
        },
        {
            "name": "Clara Neumann",
            "address": "Habsburger Str. 9, 50674 Köln",
            "phone": "+49 221 55667788",
            "gestational_age_weeks": 0,
            "gestational_age_days": 0,
            "due_date": (date.today() - timedelta(days=10)).isoformat(),
            "notes": "Gave birth 10 days ago. Postnatal check-ups ongoing.",
            "status": "postpartum",
        },
        {
            "name": "Anna Vogt",
            "address": "Weender Str. 22, 37073 Göttingen",
            "phone": "+49 551 33445566",
            "gestational_age_weeks": 39,
            "gestational_age_days": 1,
            "due_date": (date.today() + timedelta(days=6)).isoformat(),
            "notes": "First pregnancy. Very motivated and well-prepared.",
            "status": "active",
        },
        {
            "name": "Emma Fischer",
            "address": "Eisenbahnstraße 14, 04315 Leipzig",
            "phone": "+49 341 77889900",
            "gestational_age_weeks": 36,
            "gestational_age_days": 4,
            "due_date": (date.today() + timedelta(days=23)).isoformat(),
            "notes": "Twin pregnancy. Extra monitoring required.",
            "status": "active",
        },
    ]

    created_patients = []
    for p_data in patients_data:
        patient = create_patient(p_data)
        created_patients.append(patient)

    # Seed appointments across this week (Mon–Fri relative to today)
    today = date.today()
    # Find Monday of this week
    monday = today - timedelta(days=today.weekday())

    # Schedule 2–3 appointments per patient across the week
    appointment_slots = [
        # (day_offset_from_monday, time, visit_type)
        (0, "09:00", "prenatal"),   # Lena - Mon
        (1, "10:30", "prenatal"),   # Maja - Tue
        (1, "14:00", "birth"),      # Maja - Tue (active birth)
        (2, "09:30", "prenatal"),   # Sophie - Wed
        (2, "11:00", "postnatal"),  # Clara - Wed
        (3, "08:30", "prenatal"),   # Anna - Thu
        (3, "13:00", "prenatal"),   # Emma - Thu
        (4, "10:00", "prenatal"),   # Lena - Fri
        (4, "15:00", "postnatal"),  # Clara - Fri
        (0, "16:00", "prenatal"),   # Anna - Mon
    ]

    patient_cycle = [
        created_patients[0],  # Lena - Mon 09:00
        created_patients[1],  # Maja - Tue 10:30
        created_patients[1],  # Maja - Tue 14:00 (birth)
        created_patients[2],  # Sophie - Wed 09:30
        created_patients[3],  # Clara - Wed 11:00
        created_patients[4],  # Anna - Thu 08:30
        created_patients[5],  # Emma - Thu 13:00
        created_patients[0],  # Lena - Fri 10:00
        created_patients[3],  # Clara - Fri 15:00
        created_patients[4],  # Anna - Mon 16:00
    ]

    for i, (day_offset, time_str, visit_type) in enumerate(appointment_slots):
        apt_date = (monday + timedelta(days=day_offset)).isoformat()
        patient = patient_cycle[i]
        create_appointment({
            "patient_id": patient["id"],
            "date": apt_date,
            "time": time_str,
            "visit_type": visit_type,
        })
