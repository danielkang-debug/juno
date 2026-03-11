# API SOP

## Flask Setup
- Entry point: `python3 tools/server.py`
- Port: `5001`
- Debug mode: `True` (development only)
- Static files: served from `juno/` root directory
- API prefix: `/api/`
- No CORS headers needed: frontend and API share the same origin

## Error Response Format
```json
{"error": "descriptive message", "status": 400}
```
HTTP status codes:
- `200` — OK
- `201` — Created
- `400` — Bad Request (missing required fields)
- `404` — Not Found
- `500` — Internal Server Error

## Startup Sequence (runs once on first request)
```
1. db.init_db()                          → CREATE TABLE IF NOT EXISTS x3
2. if patients table is empty:
   a. db.seed_mock_data()               → INSERT 6 fictional patients + appointments
   b. for each patient with lat=NULL:
      geocode_address(patient.address)  → call Nominatim (1 req/sec)
      db.update_patient_coords()        → cache result
   c. Print progress: "Geocoding patient N/6: {name}..."
```

## Endpoint Reference

### Static Routes
```
GET /                    → send index.html from juno/ root
GET /<path:filename>     → send static file (styles.css, script.js, assets/*)
```

### Patient Endpoints
```
GET    /api/patients              → list_patients() (active + postpartum only)
POST   /api/patients              → create_patient() + geocode_address()
PUT    /api/patients/<id>         → update_patient() [re-geocode if address changed]
DELETE /api/patients/<id>         → delete_patient() [soft delete]
```

Request body for POST/PUT (all optional except name+address for POST):
```json
{
  "name": "string",
  "address": "string",
  "phone": "string",
  "gestational_age_weeks": 38,
  "gestational_age_days": 2,
  "due_date": "YYYY-MM-DD",
  "notes": "string",
  "status": "active|postpartum|discharged"
}
```

### Appointment Endpoints
```
GET    /api/appointments?date=YYYY-MM-DD   → list_appointments_by_date()
GET    /api/appointments?month=YYYY-MM     → list_appointments_by_month()
POST   /api/appointments                   → create_appointment()
PUT    /api/appointments/<id>              → update_appointment()
DELETE /api/appointments/<id>              → cancel_appointment()
```

Request body for POST/PUT:
```json
{
  "patient_id": "uuid",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "visit_type": "prenatal|birth|postnatal",
  "notes": "string"
}
```

### Route Endpoints
```
POST /api/routes/optimize    → optimize + save route for a date
GET  /api/routes/<date>      → get saved route for YYYY-MM-DD
```

POST body: `{"date": "YYYY-MM-DD"}`

POST response:
```json
{
  "ordered_appointments": [...],
  "legs": [{"from_id": "...", "to_id": "...", "distance_km": 4.2, "minutes": 8}],
  "total_travel_minutes": 42,
  "geocoded_count": 4,
  "skipped_count": 0
}
```

GET response (from saved route in DB):
```json
{
  "id": "uuid",
  "date": "YYYY-MM-DD",
  "ordered_appointment_ids": ["uuid1", "uuid2"],
  "estimated_travel_minutes": 42,
  "saved_at": "ISO datetime"
}
```

## Input Validation Rules
- POST /api/patients: `name` and `address` are required. Return 400 if missing.
- POST /api/appointments: `patient_id`, `date`, `time`, `visit_type` are required.
- POST /api/routes/optimize: `date` is required. Return 400 if missing.
- PUT endpoints: No required fields (partial updates allowed).

## Seed Data Spec
6 fictional patients with real German addresses:

| Name | Address | GA wks | GA days | Status |
|---|---|---|---|---|
| Lena Bergmann | Kastanienallee 12, 10435 Berlin | 38 | 2 | active |
| Maja Hoffmann | Schillerstraße 5, 80336 München | 40 | 0 | active |
| Sophie Richter | Eppendorfer Baum 7, 20249 Hamburg | 35 | 5 | active |
| Clara Neumann | Habsburger Str. 9, 50674 Köln | 0 | 0 | postpartum |
| Anna Vogt | Weender Str. 22, 37073 Göttingen | 39 | 1 | active |
| Emma Fischer | Eisenbahnstraße 14, 04315 Leipzig | 36 | 4 | active |

Seeded appointments: 2–3 per patient, spread across the current week (Mon–Fri), using realistic times (08:00–17:00).
