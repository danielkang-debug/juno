# Juno — Midwife Productivity Suite

A day-planning tool for self-employed midwives who do home visits. Juno solves two core problems:

1. **Calendar** — schedule visits with patients across the week and month
2. **Routes** — visualize where patients live on a map and compute the optimal visit order to minimize travel time

---

## Demo

![Dashboard](assets/hero.png)

---

## Getting Started

**Requirements:** Python 3.9+, internet connection (for map tiles and geocoding on first run)

```bash
# 1. Clone the repo
git clone https://github.com/danielkang-debug/juno.git
cd juno

# 2. Install the only dependency
pip3 install flask

# 3. Start the server
python3 tools/server.py
```

Open **http://localhost:5001** in your browser.

On first boot the app seeds 6 fictional patients and geocodes their addresses via OpenStreetMap. This takes ~6 seconds due to API rate limiting. Progress is logged to the terminal.

---

## What the App Does

### Dashboard
- Live metrics: active births, today's visits, GA alerts (patients ≥ 40 weeks)
- Week strip showing appointment load per day
- Quick actions: plan route, view GA alerts, navigate to patients

### Calendar
- Month view with 4-level color-coded day cells (darker green = more appointments, gold outline = today)
- Appointment count shown in the top-right corner of each day cell
- Click any day to see the full appointment list with times and visit types
- Add, edit, or cancel appointments from the day detail view

### Routes
- Set a **home starting point** — address is geocoded once and persisted across sessions
- Date picker to select any day
- **Optimize Route** button runs a nearest-neighbor TSP heuristic to find the most efficient visit order, then fetches the actual road path from OSRM
- Full **round trip**: route runs home → appointments → home with real road geometry drawn on the map
- Ordered stop list shows real drive times and distances per leg (from OSRM, falls back to Haversine estimate if OSRM is unavailable)
- **Drag-to-reorder** stops manually — map route redraws instantly and the new order is auto-saved
- Total round-trip travel time shown in the header

### Mothers
- Full patient list with status, gestational age, due date, phone
- GA alerts (≥ 40 weeks) highlighted in red
- Add new patients — address is automatically geocoded and pinned on the map
- Edit patient details or discharge (soft delete)

---

## Architecture

The project follows the **B.L.A.S.T. protocol** and **A.N.T. 3-layer architecture**, which separates concerns to keep business logic deterministic and the system easy to extend.

```
juno/
├── claude.md              # Project Constitution (schemas, rules, invariants)
├── .env                   # Environment variables (API keys for future integrations)
│
├── architecture/          # Layer 1 — SOPs (the "why" and "how" for each system)
│   ├── patients.md
│   ├── calendar.md
│   ├── map-routing.md
│   └── api.md
│
├── tools/                 # Layer 3 — Deterministic Python scripts
│   ├── db.py              # All SQL. No Flask imports.
│   ├── route.py           # All geography. No Flask, no DB imports.
│   └── server.py          # Layer 2: Flask routing. Calls db + route tools.
│
├── index.html             # SPA shell (sidebar, nav, Leaflet CDN)
├── styles.css             # Design system + component styles
├── script.js              # Full SPA frontend
│
├── assets/
│   ├── logo.png
│   └── hero.png
│
├── task_plan.md           # Phase checklists
├── findings.md            # Research notes, constraints, API documentation
└── progress.md            # Running log of what was built, errors, fixes
```

### The 3 Layers

| Layer | Files | Responsibility |
|---|---|---|
| 1 — Architecture | `architecture/*.md` | SOPs: define goals, inputs, logic, edge cases in plain English. Updated before code changes. |
| 2 — Navigation | `tools/server.py` | Flask routes. Receives requests, calls Layer 3 tools in the right order, returns responses. Contains no business logic. |
| 3 — Tools | `tools/db.py`, `tools/route.py` | Deterministic, independently testable Python functions. No shared state. |

---

## Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Backend | Python 3 + Flask | Single server, port 5001 |
| Database | SQLite | `juno.db` in project root, never committed |
| Frontend | Vanilla JS + HTML + CSS | No build step, no npm |
| Map | Leaflet.js v1.9.4 + OpenStreetMap | Free, no API key. Designed to swap to Google Maps later. |
| Geocoding | Nominatim (OpenStreetMap) | Free, 1 req/sec rate limit, results cached in SQLite |
| Route optimization | Nearest-neighbor TSP heuristic | Pure Python, Haversine formula, O(n²) |
| Road routing | OSRM demo API | Free, no API key. Returns real road geometry + drive times. Falls back to Haversine if unavailable. |

---

## Database Schema

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID primary key |
| name | TEXT | Required |
| address | TEXT | Required — used for geocoding |
| lat / lon | REAL | Cached from Nominatim. NULL until geocoded. |
| phone | TEXT | |
| gestational_age_weeks / days | INTEGER | GA alert fires at ≥ 40 weeks |
| due_date | TEXT | ISO date |
| notes | TEXT | |
| status | TEXT | `active` / `postpartum` / `discharged` |
| created_at | TEXT | ISO datetime |

### `appointments`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID primary key |
| patient_id | TEXT | FK → patients.id |
| date | TEXT | ISO date |
| time | TEXT | HH:MM |
| visit_type | TEXT | `prenatal` / `birth` / `postnatal` |
| notes | TEXT | |
| status | TEXT | `scheduled` / `completed` / `cancelled` |
| created_at | TEXT | ISO datetime |

### `routes`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID primary key |
| date | TEXT | UNIQUE — enables `INSERT OR REPLACE` (idempotent) |
| ordered_appointment_ids | TEXT | JSON array of appointment IDs in optimized order |
| estimated_travel_minutes | INTEGER | Total estimated transit time |
| saved_at | TEXT | ISO datetime |

---

## API Reference

All endpoints return JSON. Errors follow `{"error": "message"}` with the appropriate HTTP status.

### Patients
```
GET    /api/patients                   List active + postpartum patients
POST   /api/patients                   Create patient (geocodes address inline)
PUT    /api/patients/<id>              Update patient (re-geocodes if address changed)
DELETE /api/patients/<id>              Soft delete (sets status = 'discharged')
```

### Appointments
```
GET    /api/appointments?date=YYYY-MM-DD    Appointments for a day (joined with patient data)
GET    /api/appointments?month=YYYY-MM      Appointment count per day for a month
POST   /api/appointments                    Create appointment
PUT    /api/appointments/<id>               Update appointment
DELETE /api/appointments/<id>               Cancel appointment
```

### Routes
```
POST   /api/routes/optimize    Body: {date, start_lat?, start_lon?, start_address?}. Optimize + save route. Returns ordered list + legs + road_geometry.
POST   /api/routes/save        Body: {date, ordered_appointment_ids, estimated_travel_minutes}. Save a manually reordered route.
GET    /api/routes/<date>      Get previously saved route for a date.
GET    /api/geocode?address=   Geocode an address. Returns {lat, lon, address}.
```

---

## Route Optimization

Route planning is a two-step process:

### Step 1 — Visit order (TSP, backend)
A **nearest-neighbor TSP heuristic** determines which patient to visit in which order:

1. Take all appointments for the day where the patient has a geocoded address
2. If a home starting point is set, pick the nearest appointment to home as the first stop
3. Greedily pick the nearest unvisited patient (by Haversine straight-line distance) until all are visited
4. Append any ungeocodable patients at the end in time order
5. Append a return leg back to home

Haversine is fast and good enough as an ordering heuristic — road distances are roughly proportional to straight-line distances.

### Step 2 — Road geometry (OSRM)
After the order is determined, a single call is made to the **OSRM demo API** with all waypoints. OSRM returns:
- The actual road path as a GeoJSON LineString (drawn on the Leaflet map)
- Real drive durations and distances per leg (replaces the Haversine estimates in the stop list)

If OSRM is unavailable the app falls back to Haversine estimates and straight-line polylines — no crash, no user-visible error.

### Manual reorder
After optimization the midwife can drag stops up or down. The map redraws with straight lines (no OSRM call on drag to avoid latency) and the new order is saved to the DB immediately.

### Why not a real TSP solver?
Nearest-neighbor is ~20% suboptimal in the worst case but is deterministic, instant for n < 20, and dependency-free. A solver like Google OR-Tools can be dropped into `tools/route.py` later without touching any other file.

---

## Geocoding

Patient addresses are geocoded using the **Nominatim API** (free, powered by OpenStreetMap):

- Called once when a patient is created or their address is updated
- Result (`lat`, `lon`) is cached in the SQLite DB — Nominatim is never called twice for the same address
- Rate limit: 1 request/second (enforced by `time.sleep(1.0)` in `tools/route.py`)
- If geocoding fails: `lat`/`lon` remain `NULL`, the patient still appears in lists but without a map pin

### Swapping to Google Maps
All map logic is isolated in `mapManager` in `script.js`. To swap Leaflet for Google Maps:
1. Replace CDN links in `index.html`
2. Reimplement `mapManager.init()`, `.addPin()`, `.drawRoute()`, `.destroy()`
3. No backend changes needed

---

## Frontend Architecture

`script.js` is a single-file SPA organized into clearly named modules:

```
CONFIG          Constants (map center, route color)
state           Global mutable state (current view, selected date, home location)
api             Fetch wrappers + namespaced endpoint calls (patients, appointments, routes, geocode)
router          navigateTo(view, params) — wires nav clicks, destroys map on leave
utils           today(), formatDate(), showToast(), haversine(), travelMinutes(), confirm(), escapeHtml()
mapManager      Leaflet singleton: init(), addPin(), addHomePin(), drawRoute(apts, home, roadGeometry), clearPins(), destroy()
views
  └─ dashboard  Metrics, week strip, quick actions, Add Mother shortcut
  └─ calendar   Month grid + day detail with appointment cards
  └─ routeView  Home start, date picker, optimize button, map + draggable stop list
      ├─ _recalcLegs()         Client-side Haversine leg recalculation (used on drag)
      ├─ _renderRouteResult()  Renders map + stop list; accepts optional OSRM road geometry
      └─ _attachDragHandlers() HTML5 drag-and-drop with event delegation on the list card
  └─ mothers    Patient table with edit/discharge
modals
  └─ patient    Add/edit patient form (with inline geocoding feedback)
  └─ appointment Add/edit/cancel appointment form
init            DOMContentLoaded → router.init() → navigateTo('dashboard')
```

**Key implementation rules:**
- `mapManager.destroy()` is called every time the user navigates away from the Routes view (prevents Leaflet "container already initialized" crash on return)
- All API calls are `async/await` — views show a loading spinner while fetching
- `utils.escapeHtml()` is used on all user-provided strings rendered to the DOM (XSS prevention)

---

## Design System

The UI uses a calm, professional palette defined as CSS custom properties in `styles.css`:

| Variable | Value | Usage |
|---|---|---|
| `--sage-green` | `#A8BA9A` | Primary accent, buttons, active states |
| `--gold` | `#D4AF37` | Premium accent, today indicator |
| `--cream` | `#F9F8F4` | App background |
| `--text-dark` | `#2C332A` | Primary text |
| `--pending` | `#E6A8A8` | Alerts, errors, GA warnings |

Typography: **Inter** (body) + **Playfair Display** (headings)

---

## Key Design Decisions

**SQLite over PostgreSQL** — This is a single-user local app. SQLite requires zero infrastructure, is faster for the load, and the file is trivially backed up. Migrating to PostgreSQL later is a one-file change in `db.py`.

**No frontend framework** — Vanilla JS keeps the project dependency-free and easy to hand off. The SPA pattern (`router.navigateTo()` + `innerHTML` injection) is straightforward to follow and extend.

**Soft deletes only** — Patients are never removed from the database, only marked `discharged`. This preserves appointment history and avoids foreign key issues.

**Inline geocoding** — Geocoding happens in the same HTTP request as patient creation. This adds ~1s to the response but means the patient is immediately ready for route planning. A background job would be more scalable but is over-engineered for this use case.

---

## Architectural Rules (from `claude.md`)

1. Flask is the sole server — serves both the API and all static files. No CORS needed.
2. `juno.db` is never committed to version control.
3. Nominatim: max 1 req/sec. Always cache results. Never call twice for the same address.
4. Route optimization requires ≥ 2 appointments with non-NULL coordinates.
5. All patient data is fictional — the system is not designed for real PII in its current state.
6. No build step — Leaflet from CDN, no npm, no webpack.

---

## Roadmap

The following are natural next steps, roughly in priority order:

- [ ] **OSRM on drag reorder** — call OSRM after a manual drag to update road geometry (currently falls back to straight lines on drag)
- [ ] **Switch to OpenRouteService** — production-grade routing API with a free tier (2,000 req/day) for when OSRM demo isn't suitable
- [ ] **Real-time geocoding fallback** — show a map picker if Nominatim fails to find an address
- [ ] **Patient notes history** — timestamped visit notes per appointment
- [ ] **Export** — PDF route sheet for the day (printable)
- [ ] **Authentication** — login system if multiple midwives share an instance
- [ ] **Cloud deployment** — move from local SQLite to PostgreSQL + host on Railway/Render
- [ ] **Mobile responsive layout** — midwives use their phone in the field
