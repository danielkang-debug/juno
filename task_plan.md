# Juno — Task Plan (B.L.A.S.T.)

## North Star
A clean, working prototype of a midwife day-planning tool with:
1. Working calendar to schedule patient visits
2. Working map to visualize patient locations and optimize the daily route

---

## Phase 0 — Protocol Init
- [x] Create `claude.md` (Project Constitution)
- [x] Create `task_plan.md` (this file)
- [x] Create `findings.md`
- [x] Create `progress.md`

## Phase 1 — B: Blueprint (Architecture SOPs)
- [ ] Create `architecture/patients.md`
- [ ] Create `architecture/calendar.md`
- [ ] Create `architecture/map-routing.md`
- [ ] Create `architecture/api.md`

## Phase 2 — L: Link (Environment Verification)
- [ ] Install Flask: `pip3 install flask`
- [ ] Verify Nominatim API responds correctly
- [ ] Create `.env` placeholder file

## Phase 3 — A: Architect (Python Tools)
- [ ] Build `tools/db.py` — SQLite CRUD layer
  - [ ] `get_conn()`, `init_db()`
  - [ ] Patient CRUD (list, get, create, update, delete, update_coords)
  - [ ] Appointment CRUD (by_date, by_month, create, update, cancel)
  - [ ] Route CRUD (get, save)
  - [ ] `seed_mock_data()` with 6 fictional patients
- [ ] Build `tools/route.py` — Geography & optimization
  - [ ] `haversine()`, `travel_minutes()`
  - [ ] `nearest_neighbor_route()`
  - [ ] `optimize_route()`
  - [ ] `geocode_address()`
- [ ] Build `tools/server.py` — Flask API
  - [ ] Static file serving (`/`, `/<path>`)
  - [ ] Patient endpoints (GET, POST, PUT, DELETE)
  - [ ] Appointment endpoints (GET by date/month, POST, PUT, DELETE)
  - [ ] Route endpoints (POST optimize, GET by date)
  - [ ] `startup()` hook: init_db + seed + geocode

## Phase 4 — S: Stylize (Frontend)
- [ ] Update `index.html` — add Leaflet CDN links
- [ ] Extend `styles.css` — append new component styles after existing line 248
  - [ ] Calendar additions (heavy-load, today, calendar-nav, weekday labels)
  - [ ] Map & route styles (#map, route-stop, travel-segment)
  - [ ] Patient table (patient-table, status-badge, ga-alert)
  - [ ] Modal overlay & form (modal-overlay, modal-box, form-grid)
  - [ ] Buttons (btn-secondary, btn-danger)
  - [ ] Toast notifications
- [ ] Rebuild `script.js` — full SPA
  - [ ] CONFIG, state
  - [ ] api namespace (fetch wrappers + endpoints)
  - [ ] router (navigateTo, nav wiring)
  - [ ] utils (today, formatDate, showToast, gaLabel, isGAAlert)
  - [ ] mapManager (Leaflet singleton)
  - [ ] views.dashboard
  - [ ] views.calendar + renderDayDetail
  - [ ] views.routes + renderRouteResult
  - [ ] views.mothers
  - [ ] modals.patientModal
  - [ ] modals.appointmentModal
  - [ ] DOMContentLoaded init

## Phase 5 — T: Trigger (Validation)
- [ ] Run `python3 tools/server.py`
- [ ] Verify juno.db created
- [ ] Verify 6 patients seeded + geocoded
- [ ] Verify Dashboard metrics (non-zero numbers)
- [ ] Verify Calendar month view (colored day cells)
- [ ] Verify Routes view (map + pins + polyline)
- [ ] Verify adding patient → geocodes → appears in Mothers
- [ ] Verify adding/cancelling appointments
- [ ] Verify edge cases (ungeocodable address, 0/1 appointment days)
