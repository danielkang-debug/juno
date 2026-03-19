# Juno v2 — Midwife Route Planner

A day-planning tool for self-employed midwives who do home visits. The core feature is **route optimization**: given a list of appointments (fixed and flexible), Juno finds the most efficient visit order while respecting time constraints.

## Quick Start

```bash
python3 tools/server.py
```

Open **http://localhost:5002** in your browser.

No build step, no npm, no dependencies beyond Python 3 + Flask.

## What It Does

1. **Morning routine**: Open the app, see today's appointments, tap "Optimize Route"
2. **Smart optimization**: Fixed appointments stay locked. Flex appointments are reordered for shortest travel time using real driving distances (OSRM)
3. **Export to Google Maps**: One tap opens the full route in Google Maps
4. **Notify mothers**: Pre-generated messages with ETAs — copy, WhatsApp, or call each mother
5. **Driver mode**: Track progress through appointments, mark visits complete, add notes
6. **Import**: Upload CSV or iCal files to bulk-add appointments

## Tech Stack

- **Backend**: Python 3, Flask, SQLite
- **Frontend**: Vanilla JS (ES modules), Tailwind CSS (CDN), Leaflet.js (maps), Lucide (icons)
- **Fonts**: DM Sans (Google Fonts)
- **Route optimization**: Time-window TSP with OSRM distance matrix
- **Geocoding**: Nominatim (OpenStreetMap)

## Project Structure

```
juno-v2/
├── index.html          # SPA shell
├── js/
│   ├── app.js          # Entry point
│   ├── api.js          # API client
│   ├── router.js       # Hash-based SPA router
│   ├── state.js        # Reactive state store
│   ├── map.js          # Leaflet wrapper
│   ├── import.js       # CSV/iCal parser
│   └── views/
│       ├── auth.js     # Login / register
│       ├── today.js    # Main screen (route planning)
│       ├── driver.js   # Driver tracking mode
│       ├── patients.js # Mother list
│       └── calendar.js # Month view
├── tools/
│   ├── server.py       # Flask API (port 5002)
│   ├── db.py           # SQLite data layer
│   └── route.py        # Time-window TSP + OSRM + geocoding
└── juno.db             # SQLite database (auto-created, git-ignored)
```

## Route Optimization Algorithm

The optimizer handles two types of appointments:

- **Fixed**: Must happen at the scheduled time (e.g., 14:00 sharp)
- **Flexible**: Can happen anytime within a window (e.g., 9:00–13:00)

**How it works:**

1. Fixed appointments become "anchor points" that divide the day into segments
2. Within each segment, all permutations of flex appointments are evaluated
3. Travel times come from the OSRM distance matrix (one API call for all location pairs)
4. The ordering with the shortest total travel time that fits all time windows is selected
5. ETAs are calculated for each stop

For typical midwife schedules (5–10 appointments), this runs in milliseconds.
