# Patients SOP

## Purpose
Manage the list of mothers (patients) that the midwife visits. Each patient has a physical address used for geocoding and route planning.

## Data Contract
- `id`: UUID generated in Python via `uuid.uuid4()`
- `status` lifecycle: `active` → `postpartum` → `discharged`
- `address` is the raw geocoding input; `lat`/`lon` are the cached output
- `gestational_age_weeks` + `gestational_age_days` stored separately for easy GA alert logic
- `due_date` is informational — not used for route logic

## CRUD Rules

### GET /api/patients
- Returns patients with `status IN ('active', 'postpartum')`
- Does NOT return discharged patients by default
- Optional: `?include_discharged=true` to include all

### POST /api/patients
- Required fields: `name`, `address`
- Insert patient row first, then call `geocode_address(address)` in the same request
- Store returned `lat`/`lon` in DB if successful
- Return 201 with full patient dict (including coords if geocoded)

### PUT /api/patients/:id
- Update only the fields present in request body
- If `address` field is in the update: re-geocode and update `lat`/`lon`
- Return 200 with updated patient dict, or 404 if not found

### DELETE /api/patients/:id
- Soft delete only: `UPDATE patients SET status='discharged' WHERE id=?`
- Return 200 `{"ok": true}`, or 404 if not found
- Never removes a row from the database

## Geocoding Policy
```
geocode_address(address: str) → (lat: float, lon: float) | (None, None)
```
1. **DB check first:** Before calling Nominatim, check if any patient already has `lat/lon` cached for the same address. If yes, reuse cached coords.
2. **Nominatim call:** POST to `https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1`
   - Header: `User-Agent: Juno-Midwife-App/1.0`
3. **Rate limit:** `time.sleep(1.0)` after EVERY Nominatim call, regardless of success or failure
4. **On success:** Return `(float(result[0]['lat']), float(result[0]['lon']))`
5. **On failure (empty array, network error, any exception):** Log warning to stderr, return `(None, None)`. Never raise.
6. **Cache:** After successful geocode, always call `db.update_patient_coords(id, lat, lon)` to persist

## GA Alert Rule
- `gestational_age_weeks >= 40` → flag as alert
- Surface in Dashboard Quick Actions and Mothers table
- Does not restrict any CRUD operations — alert is informational only

## Status Definitions
- `active`: Currently pregnant and under care
- `postpartum`: Has given birth, still receiving postnatal visits
- `discharged`: Care relationship ended. Not shown in default patient list.
