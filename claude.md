# Juno — Project Constitution

## Identity
- **App name:** Juno — Midwife Productivity Suite
- **Purpose:** Day-planning tool for self-employed midwives who do home visits
- **Target user:** Self-employed midwives managing 5–10 patients per day
- **Persona:** Midwife named Clara (used in UI copy)

---

## Data Schemas

### patients
```json
{
  "id": "TEXT (UUID, PK)",
  "name": "TEXT (required)",
  "address": "TEXT (required, used for geocoding)",
  "lat": "REAL | NULL (cached from Nominatim)",
  "lon": "REAL | NULL (cached from Nominatim)",
  "phone": "TEXT (default '')",
  "gestational_age_weeks": "INTEGER (default 0)",
  "gestational_age_days": "INTEGER (default 0)",
  "due_date": "TEXT (ISO date YYYY-MM-DD, default '')",
  "notes": "TEXT (default '')",
  "status": "TEXT (active | postpartum | discharged, default 'active')",
  "created_at": "TEXT (ISO datetime)"
}
```

### appointments
```json
{
  "id": "TEXT (UUID, PK)",
  "patient_id": "TEXT (FK → patients.id)",
  "date": "TEXT (ISO date YYYY-MM-DD)",
  "time": "TEXT (HH:MM)",
  "visit_type": "TEXT (prenatal | birth | postnatal)",
  "notes": "TEXT (default '')",
  "status": "TEXT (scheduled | completed | cancelled, default 'scheduled')",
  "created_at": "TEXT (ISO datetime)"
}
```

### routes
```json
{
  "id": "TEXT (UUID, PK)",
  "date": "TEXT (ISO date, UNIQUE — enables INSERT OR REPLACE)",
  "ordered_appointment_ids": "TEXT (JSON-encoded array of appointment IDs)",
  "estimated_travel_minutes": "INTEGER (default 0)",
  "saved_at": "TEXT (ISO datetime)"
}
```

---

## Architectural Invariants

1. **Single server rule:** Flask is the sole server. It serves both the API (`/api/*`) and all static files (`/`, `/styles.css`, `/script.js`, etc.) from the project root. No CORS needed.
2. **Database location:** SQLite file lives at `juno/juno.db`. Never commit it. Never share it.
3. **Geocoding policy:** Max 1 request/sec to Nominatim. Always cache result in DB after first call. Never call Nominatim for an address that already has lat/lon in DB. User-Agent header must identify the app.
4. **Route optimization guard:** Route optimization requires ≥2 appointments with non-NULL lat/lon. If fewer, return time-sorted list with legs=[] and total_travel_minutes=0.
5. **No real PII:** All patient data is fictional/synthetic. The system is never to be used with real patient data in development.
6. **No build step:** Leaflet.js loaded from CDN. No npm, no webpack, no transpilation. The app runs with `python3 tools/server.py` and nothing else.

---

## Behavioral Rules

- **Soft delete only:** DELETE `/api/patients/:id` sets `status='discharged'` — never removes rows from DB.
- **Route upsert:** `POST /api/routes/optimize` uses `INSERT OR REPLACE` on `(date)` — idempotent. Re-optimizing a day overwrites the saved route.
- **Calendar month query:** `SELECT date, COUNT(*) FROM appointments WHERE date LIKE 'YYYY-MM-%' AND status != 'cancelled' GROUP BY date`
- **GA alert threshold:** `gestational_age_weeks >= 40` triggers an alert. Surface prominently in Dashboard and Mothers view.
- **Geocoding failure:** If Nominatim fails for a patient address, `lat/lon` remain NULL. Map renders without that pin. No server crash, no user-visible error beyond a console warning.
- **Map destroy on navigate:** The Leaflet map instance must be destroyed (`map.remove()`) before navigating away from the Routes view to prevent "container already initialized" errors on return.

---

## Architecture Overview (A.N.T. 3-Layer)

```
Layer 1 — Architecture (architecture/*.md)
    Technical SOPs: goals, inputs, tool logic, edge cases.
    Rule: If logic changes, update the SOP before updating code.

Layer 2 — Navigation (tools/server.py)
    Flask routes + request routing. Calls Layer 3 tools in correct order.
    Does not contain business logic — delegates to db.py and route.py.

Layer 3 — Tools (tools/db.py, tools/route.py)
    Deterministic Python scripts. Atomic and testable independently.
    db.py: All SQL. No Flask imports.
    route.py: All geography. No Flask imports. No DB imports.
```

---

## Maintenance Log

| Date | Change | Files Affected |
|---|---|---|
| 2026-03-10 | Initial project constitution created | claude.md |
