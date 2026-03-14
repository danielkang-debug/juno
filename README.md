# Juno — Midwife Productivity Suite

A day-planning tool for self-employed midwives who do home visits. Juno solves two core problems:

1. **Calendar** — schedule visits with patients across the week and month
2. **Routes** — visualize where patients live on a map and compute the optimal visit order to minimize travel time

The UI is bilingual (German/English) and designed around a fictional midwife named **Clara**.

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

# 2. Install dependencies
pip3 install flask

# 3. Start the server
python3 tools/server.py
```

Open **http://localhost:5001** in your browser. The password is `Juno2026`.

On first boot the app seeds 6 fictional patients (located across Germany) and geocodes their addresses via OpenStreetMap. This takes ~6 seconds due to API rate limiting. Progress is logged to the terminal.

---

## What the App Does

### Dashboard
- Live metrics: active births, today's visits, GA alerts (patients >= 40 weeks)
- Week strip showing appointment load per day
- Quick actions: plan route, view GA alerts, navigate to patients

### Calendar
- Month view with 4-level color-coded day cells (darker green = more appointments, gold outline = today)
- Appointment count shown in the top-right corner of each day cell
- Click any day to see the full appointment list with times and visit types
- Add, edit, or cancel appointments from the day detail view

### Routes
- Set a **home starting point** — address is geocoded once and persisted in `localStorage`
- Date picker to select any day
- **Optimize Route** runs a nearest-neighbor TSP heuristic, then fetches actual road paths from OSRM
- Full **round trip**: home -> appointments -> home with real road geometry drawn on the map
- Ordered stop list shows real drive times and distances per leg (falls back to Haversine estimate if OSRM is unavailable)
- **Drag-to-reorder** stops manually — map redraws instantly, new order auto-saved to DB
- Total round-trip travel time shown in the header

### Mothers
- Full patient list with status, gestational age, due date, phone
- GA alerts (>= 40 weeks) highlighted in red
- Add new patients — address is automatically geocoded and pinned on the map
- Edit patient details or discharge (soft delete)

---

## Architecture

### The A.N.T. 3-Layer Model

The backend follows a strict separation of concerns:

| Layer | Files | Responsibility |
|---|---|---|
| **1 — Architecture** | `architecture/*.md` | SOPs: define goals, inputs, logic, edge cases in plain English. Updated before code changes. |
| **2 — Navigation** | `tools/server.py` | Flask routes. Receives requests, delegates to Layer 3 tools, returns JSON. Contains zero business logic. |
| **3 — Tools** | `tools/db.py`, `tools/route.py` | Deterministic, independently testable Python functions. No Flask imports. No shared state between files. |

This means:
- **All SQL** lives in `db.py`. If you need a new query, it goes here.
- **All geography** (Haversine, TSP, geocoding, OSRM calls) lives in `route.py`. If you need a new geo computation, it goes here.
- **`server.py`** is glue — it validates input, calls `db` and `route` functions in the right order, and returns the result.

### Frontend Architecture

The frontend is a **vanilla JS single-page application** using ES modules (no build step, no bundler). `index.html` loads `js/main.js` as the entry point.

```
js/
├── main.js              # Entry point. DOMContentLoaded → router.init() → navigateTo('dashboard')
├── state.js             # Global mutable state (currentView, routeDate, homeLocation, lang)
├── router.js            # navigateTo(view, params) — hash-based routing, popstate, map cleanup
├── api.js               # Fetch wrappers: api.patients.list(), api.routes.optimize(), etc.
├── i18n.js              # DE/EN translations. t('key') returns localized string.
├── map.js               # Leaflet singleton: init, addPin, drawRoute, destroy
├── utils.js             # today(), formatDate(), showToast(), haversine(), escapeHtml()
│
├── views/
│   ├── index.js         # Re-exports all views as a { dashboard, calendar, routes, mothers } map
│   ├── dashboard.js     # Metrics, week strip, quick actions
│   ├── calendar.js      # Month grid + day detail with appointment cards
│   ├── routes.js        # Home start, date picker, optimize, map + draggable stop list
│   └── mothers.js       # Patient table with edit/discharge
│
├── modals/
│   ├── index.js         # Re-exports { patientModal, appointmentModal }
│   ├── patient.js       # Add/edit patient form (with inline geocoding feedback)
│   └── appointment.js   # Add/edit/cancel appointment form
│
└── components/
    ├── index.js         # Re-exports shared components
    ├── segmented-control.js  # Reusable segmented toggle (used for visit-type selection)
    └── ui.js            # Loading spinner, empty-state rendering
```

**How routing works:** `router.navigateTo('calendar')` sets `state.currentView`, pushes to `history`, calls `views.calendar.render()` which injects HTML into `#app-view` via `innerHTML`, then wires up event listeners. When leaving the Routes view, `mapManager.destroy()` is called to tear down the Leaflet instance (prevents "container already initialized" crash on return).

**How the API layer works:** `api.js` exports a namespaced object — `api.patients.list()`, `api.appointments.byDate('2026-03-14')`, etc. All methods are `async` and throw an `Error` with the server's message on non-2xx responses. Views `catch` and display errors via `showToast()`.

### Data Flow Example: Optimizing a Route

```
User clicks "Optimize Route"
  → views/routes.js calls api.routes.optimize(date, lat, lon, address)
    → POST /api/routes/optimize  (server.py)
      → db.list_appointments_by_date(date)                    (db.py)
      → route_module.optimize_route(appointments, start)       (route.py)
        ├─ Nearest-neighbor TSP via Haversine                  (pure math)
        └─ OSRM API call for real road geometry                (HTTP)
      → db.save_route(date, ordered_ids, total_minutes)        (db.py)
    ← { ordered_appointments, legs, road_geometry, ... }
  → views/routes.js calls mapManager.drawRoute() + renders stop list
```

---

## Project Structure

```
juno/
├── index.html             # SPA shell (sidebar nav, Leaflet CDN, prototype banner)
├── styles.css             # Full design system + all component styles
├── js/                    # Frontend SPA (ES modules, no build step)
│   ├── main.js            # Entry point
│   ├── state.js           # Global state
│   ├── router.js          # Hash-based SPA routing
│   ├── api.js             # Backend fetch wrappers
│   ├── i18n.js            # DE/EN translations (~160 keys)
│   ├── map.js             # Leaflet map manager
│   ├── utils.js           # Shared utilities
│   ├── views/             # One file per view (dashboard, calendar, routes, mothers)
│   ├── modals/            # Patient + appointment modals
│   └── components/        # Reusable UI components (segmented control, spinners)
│
├── tools/                 # Python backend
│   ├── server.py          # Layer 2: Flask API + static file serving (port 5001)
│   ├── db.py              # Layer 3: All SQLite CRUD. No Flask imports.
│   └── route.py           # Layer 3: Haversine, TSP, Nominatim geocoding, OSRM. No Flask imports.
│
├── architecture/          # Layer 1: SOPs (plain-English specs for each subsystem)
│   ├── patients.md        # Patient CRUD rules, geocoding policy, soft-delete
│   ├── calendar.md        # Calendar rendering, appointment lifecycle
│   ├── map-routing.md     # TSP algorithm, OSRM integration, drag reorder
│   └── api.md             # Endpoint contracts, error shapes, status codes
│
├── assets/
│   ├── logo.png
│   └── hero.png
│
├── claude.md              # Project Constitution (schemas, invariants, behavioral rules)
├── Procfile               # Railway deployment: gunicorn command
├── requirements.txt       # Python deps: flask, gunicorn, requests
├── package.json           # Optional: `npx serve` for static-only dev
├── .gitignore             # Excludes juno.db, .env, __pycache__, .claude/
│
├── task_plan.md           # Phase checklists (build planning)
├── findings.md            # Research notes, API docs, constraints
└── progress.md            # Running log of what was built
```

Files **not** committed: `juno.db` (SQLite database), `.env` (environment variables).

---

## Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Backend | Python 3.9+ / Flask | Single server, port 5001. Serves API + static files. |
| Database | SQLite | `juno.db` created on first run, never committed |
| Frontend | Vanilla JS (ES modules) | No npm install needed, no bundler, no transpilation |
| Map | Leaflet.js 1.9.4 + OpenStreetMap tiles | Free, no API key. CDN-loaded. |
| Geocoding | Nominatim (OpenStreetMap) | Free, 1 req/sec, results cached in SQLite |
| Route optimization | Nearest-neighbor TSP | Pure Python, Haversine distance, O(n^2) |
| Road routing | OSRM demo API | Returns real road geometry + drive times. Degrades gracefully. |
| i18n | Custom `i18n.js` | German default, English toggle. ~160 translation keys. |
| Deployment | Railway (optional) | Gunicorn via Procfile, env-based DB path |

---

## Database Schema

Three tables. All IDs are UUIDs. All dates/times are ISO strings.

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | UUID |
| name | TEXT | Required |
| address | TEXT | Required — geocoded on create/update |
| lat / lon | REAL | Cached from Nominatim. NULL until geocoded. |
| phone | TEXT | Default `''` |
| gestational_age_weeks | INTEGER | GA alert fires at >= 40 |
| gestational_age_days | INTEGER | |
| due_date | TEXT | ISO date (YYYY-MM-DD) |
| notes | TEXT | |
| status | TEXT | `active` / `postpartum` / `discharged` |
| created_at | TEXT | ISO datetime |

### `appointments`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | UUID |
| patient_id | TEXT (FK) | References patients.id |
| date | TEXT | ISO date |
| time | TEXT | HH:MM |
| visit_type | TEXT | `prenatal` / `birth` / `postnatal` |
| notes | TEXT | |
| status | TEXT | `scheduled` / `completed` / `cancelled` |
| created_at | TEXT | ISO datetime |

### `routes`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | UUID |
| date | TEXT (UNIQUE) | One route per day. `INSERT OR REPLACE` makes saves idempotent. |
| ordered_appointment_ids | TEXT | JSON array of appointment IDs in visit order |
| estimated_travel_minutes | INTEGER | Total transit time |
| saved_at | TEXT | ISO datetime |

---

## API Reference

All endpoints return JSON. Errors: `{"error": "message"}` with appropriate HTTP status.

### Patients
```
GET    /api/patients                   → [{id, name, address, lat, lon, ...}]
POST   /api/patients                   → 201 {patient}      Body: {name, address, ...}
PUT    /api/patients/<id>              → {patient}           Body: {fields to update}
DELETE /api/patients/<id>              → {ok: true}          Soft delete (status → discharged)
```

### Appointments
```
GET    /api/appointments?date=YYYY-MM-DD   → [{id, patient_id, patient_name, time, ...}]
GET    /api/appointments?month=YYYY-MM     → [{date, count}]    For calendar rendering
POST   /api/appointments                   → 201 {appointment}  Body: {patient_id, date, time, visit_type}
PUT    /api/appointments/<id>              → {appointment}       Body: {fields to update}
DELETE /api/appointments/<id>              → {ok: true}          Sets status → cancelled
```

### Routes
```
POST   /api/routes/optimize   → {ordered_appointments, legs, total_travel_minutes, road_geometry}
                                 Body: {date, start_lat?, start_lon?, start_address?}
POST   /api/routes/save       → {ok: true}
                                 Body: {date, ordered_appointment_ids, estimated_travel_minutes}
GET    /api/routes/<date>     → {id, date, ordered_appointment_ids, ...} or 404
```

### Geocoding
```
GET    /api/geocode?address=<string>   → {lat, lon, address} or 422
```

---

## Route Optimization — How It Works

### Step 1 — Visit order (TSP, `tools/route.py`)
1. Gather all appointments for the day where the patient has lat/lon
2. If a home starting point is set, pick the nearest appointment to home first
3. Greedily pick the nearest unvisited patient by Haversine distance until all are visited
4. Append ungeocodable patients at the end in time order
5. Append a return leg back to home

### Step 2 — Road geometry (OSRM)
A single call to the OSRM demo API with all waypoints returns:
- The actual road path as polyline coordinates (drawn on the map)
- Real drive durations and distances per leg

If OSRM is unavailable, the app falls back to Haversine estimates and straight-line polylines. No crash, no user-visible error.

### Manual reorder
After optimization, the user can drag stops up or down. The map redraws with straight lines (no OSRM call on drag) and the new order is saved to the DB immediately.

### Why nearest-neighbor instead of a real solver?
It's ~20% suboptimal in the worst case but is deterministic, instant for n < 20, and has zero dependencies. A proper solver (e.g. Google OR-Tools) can be dropped into `route.py` later without changing any other file.

---

## Geocoding

- **When:** called once on patient create or address update
- **How:** Nominatim API (OpenStreetMap), 1 req/sec rate limit enforced by `time.sleep(1.0)` in `route.py`
- **Caching:** result stored in SQLite (`lat`/`lon` columns). Nominatim is never called twice for the same address.
- **Failure:** `lat`/`lon` remain NULL. Patient appears in lists but not on the map. No crash.

---

## Internationalization (i18n)

The app defaults to **German** and supports an **English** toggle via a button in the prototype banner.

- All UI strings go through `t('key')` from `js/i18n.js`
- ~160 translation keys covering navigation, forms, alerts, date formatting
- Language preference persisted in `localStorage` (`juno_lang`)
- Views re-render on language switch

---

## Design System

CSS custom properties defined in `styles.css`:

| Variable | Value | Usage |
|---|---|---|
| `--sage-green` | `#A8BA9A` | Primary accent, buttons, active states |
| `--gold` | `#D4AF37` | Premium accent, today indicator |
| `--cream` | `#F9F8F4` | App background |
| `--text-dark` | `#2C332A` | Primary text |
| `--pending` | `#E6A8A8` | Alerts, errors, GA warnings |

Typography: **Inter** (body) + **Playfair Display** (headings), loaded from Google Fonts.

---

## Key Design Decisions

**SQLite over PostgreSQL** — Single-user local app. Zero infrastructure, fast for the load, trivially backed up. Migrating to PostgreSQL is a one-file change in `db.py`.

**No frontend framework** — Vanilla JS keeps the project dependency-free. The SPA pattern (`router.navigateTo()` + `innerHTML` injection) is simple to follow. The modular `js/` structure keeps individual files small and focused.

**ES modules over a bundler** — `<script type="module">` is natively supported in all modern browsers. No webpack, no npm install, no build step. The tradeoff is no tree-shaking or minification, but the total JS is ~2K lines so it doesn't matter.

**Soft deletes only** — Patients are never removed from the database, only marked `discharged`. This preserves appointment history and avoids foreign key cascading.

**Inline geocoding** — Geocoding happens in the same HTTP request as patient creation (~1s delay). The patient is immediately ready for route planning. A background job would be more scalable but over-engineered for this use case.

**OSRM with Haversine fallback** — Real road distances are more accurate, but the OSRM demo API has no SLA. Every code path that uses OSRM has a Haversine fallback, so the app never breaks if the API is down.

---

## Deployment

### Local (default)
```bash
pip3 install flask
python3 tools/server.py
# → http://localhost:5001
```

### Railway
The repo includes a `Procfile` and `requirements.txt` for one-click Railway deployment:
```
web: gunicorn -w 2 -b 0.0.0.0:$PORT tools.server:app
```

Set the `DATABASE_PATH` environment variable to control where SQLite stores its file (defaults to `juno.db` in the project root).

---

## Architectural Rules

These are enforced by convention and documented in `claude.md`:

1. **Single server** — Flask serves both the API and all static files. No CORS needed.
2. **`juno.db` is never committed** to version control.
3. **Nominatim rate limit** — max 1 req/sec, always cache results, never call twice for the same address.
4. **Route guard** — optimization requires >= 2 geocoded appointments. Otherwise returns a time-sorted list.
5. **No real PII** — all patient data is fictional. Not designed for production patient data.
6. **No build step** — Leaflet from CDN, JS via native ES modules. `python3 tools/server.py` is the only command.
7. **Map cleanup** — `mapManager.destroy()` must be called before leaving the Routes view.
8. **Layer discipline** — `db.py` never imports Flask. `route.py` never imports Flask or `db`. Business logic stays in Layer 3.

---

## Seed Data

On first boot, 6 fictional German patients are created and geocoded:

| Name | City |
|---|---|
| Lena Bergmann | Berlin |
| Maja Hoffmann | München |
| Sophie Richter | Hamburg |
| Clara Neumann | Köln |
| Anna Vogt | Göttingen |
| Emma Fischer | Leipzig |

---

## Roadmap

- [ ] OSRM on drag reorder — call OSRM after manual drag to update road geometry
- [ ] OpenRouteService — production routing API with free tier (2,000 req/day)
- [ ] Map picker fallback — show a map picker if Nominatim fails to find an address
- [ ] Patient notes history — timestamped visit notes per appointment
- [ ] PDF export — printable daily route sheet
- [ ] Authentication — login system for multi-user instances
- [ ] Mobile responsive — midwives use their phone in the field
