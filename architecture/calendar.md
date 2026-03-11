# Calendar SOP

## Purpose
Allow the midwife to see and manage scheduled visits across days and months. The calendar is the primary scheduling interface.

## Query Patterns

### Month view (appointment count per day)
```sql
SELECT date, COUNT(*) as count
FROM appointments
WHERE date LIKE 'YYYY-MM-%'
  AND status != 'cancelled'
GROUP BY date
```
Returns a list of `{date, count}` objects used to color day cells.

### Day view (full appointment details)
```sql
SELECT a.*, p.name as patient_name, p.address, p.lat, p.lon,
       p.gestational_age_weeks, p.gestational_age_days, p.status as patient_status
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.date = 'YYYY-MM-DD'
  AND a.status != 'cancelled'
ORDER BY a.time ASC
```
Returns merged objects used to render the day timeline.

## Visit Types
- `prenatal`: Scheduled before the due date (pregnancy check-up, monitoring)
- `birth`: Active birth attendance — highest priority
- `postnatal`: After delivery — monitoring mother and newborn

## Appointment Lifecycle
`scheduled` → `completed` | `cancelled`
- No direct transition from `cancelled` back to `scheduled` — create a new appointment instead

## Frontend Behavior

### Month View
- 7-column grid (Monday–Sunday)
- Show blank cells for days before the 1st of the month (offset by `dayOfWeek`)
- Day cell classes:
  - `.active-load` → count ≥ 1
  - `.heavy-load` → count ≥ 3
  - `.today` → matches today's ISO date
  - `.weekend` → Saturday (6) or Sunday (0) by JS `getDay()`
- Clicking a day: call `views.calendar.renderDayDetail(isoDate)`
- Previous/Next month nav buttons re-fetch and re-render

### Day Detail View
- Header: formatted date + "← Back" link to month view
- Chronological list of appointment cards
- Each card: patient name, visit type badge, scheduled time
- Click appointment card: open `openAppointmentModal(null, appointment)` to edit/cancel
- "+ Add Appointment" button: open `openAppointmentModal(isoDate)` with date pre-filled

## API Endpoints

### GET /api/appointments?date=YYYY-MM-DD
Returns day view data (appointments JOIN patients for the given date).

### GET /api/appointments?month=YYYY-MM
Returns month view data (count per day).

### POST /api/appointments
Required: `patient_id`, `date`, `time`, `visit_type`
Optional: `notes`
Returns 201 with full appointment dict.

### PUT /api/appointments/:id
Update any field. Returns 200 with updated dict.

### DELETE /api/appointments/:id
Soft cancel: `UPDATE appointments SET status='cancelled'`.
Returns 200 `{"ok": true}`.
