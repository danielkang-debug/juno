# Juno — Findings & Research

## Environment
- **Python version:** 3.9.6 (system)
- **Flask:** NOT pre-installed — must `pip3 install flask` in Phase 2
- **SQLite3:** Available in Python stdlib — no install needed
- **Platform:** macOS Darwin 25.2.0

## Nominatim API (Geocoding)
- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Parameters:** `q={encoded_address}&format=json&limit=1`
- **Response:** Array of results. Use `result[0]['lat']` and `result[0]['lon']`
- **Rate limit:** Max 1 request per second (enforced by `time.sleep(1.0)` after every call)
- **User-Agent:** MUST include identifying header — use `"Juno-Midwife-App/1.0"`
- **ToS:** Free for light use. No API key required. Results are WGS84 coordinates.
- **Failure mode:** Returns empty array `[]` if address not found. Handle gracefully: return (None, None)
- **Encoding:** Use `urllib.parse.quote()` or `urllib.parse.urlencode()` for the address query

## Leaflet.js (Map)
- **Version:** 1.9.4
- **CSS CDN:** `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- **JS CDN:** `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
- **Tile layer:** OpenStreetMap — `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Attribution:** `© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`
- **Key APIs:**
  - `L.map(containerId)` — initialize map
  - `map.setView([lat, lon], zoom)` — set initial view
  - `L.tileLayer(url, options).addTo(map)` — add tile layer
  - `L.marker([lat, lon]).bindPopup(html).addTo(map)` — add pin
  - `L.polyline([[lat,lon], ...], {color: '#A8BA9A'}).addTo(map)` — route line
  - `map.fitBounds(bounds)` — zoom to fit all markers
  - `map.remove()` — destroy map (MUST call before re-rendering the container)
- **Critical:** If the `#map` container DOM node is re-created by innerHTML, the old map reference is stale. Always call `map.remove()` before navigating away from the routes view.

## Haversine Formula
Pure Python, no external libraries needed.
```
R = 6371  # Earth radius in km
φ1, φ2 = lat1 in radians, lat2 in radians
Δφ = (lat2 - lat1) in radians
Δλ = (lon2 - lon1) in radians
a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
c = 2·atan2(√a, √(1−a))
d = R·c  (km)
```

## Route Optimization
- **Algorithm:** Nearest-neighbor TSP heuristic
- **Complexity:** O(n²) — fine for n ≤ 20 (midwives see 5-10 patients/day)
- **Quality:** Not globally optimal, but fast and deterministic. Good enough for this scale.
- **Travel time estimate:** distance_km / 30.0 * 60 → minutes (30 km/h avg urban speed)
- **Start point:** First appointment by scheduled time (not a fixed depot)

## Flask Static File Serving
- Set `static_folder=ROOT_DIR` where ROOT_DIR = parent of `tools/`
- Serve `index.html` from `GET /`
- Serve other assets from `GET /<path:filename>` via `send_from_directory`
- All API routes prefixed `/api/`
- Run on port 5001 (avoids conflicts with common dev servers on 5000)

## Seed Patient Addresses (verified real addresses for Nominatim)
- Kastanienallee 12, 10435 Berlin → Berlin, Prenzlauer Berg
- Schillerstraße 5, 80336 München → Munich, near main station
- Eppendorfer Baum 7, 20249 Hamburg → Hamburg, Eppendorf
- Habsburger Str. 9, 50674 Köln → Cologne, Belgisches Viertel
- Weender Str. 22, 37073 Göttingen → Göttingen city center
- Eisenbahnstraße 14, 04315 Leipzig → Leipzig, East

## Constraints Discovered
- `@app.before_first_request` is deprecated in Flask 2.3+. Use `with app.app_context()` in `if __name__ == '__main__'` block instead, or register via `app.before_request` with a guard flag.
- SQLite `row_factory = sqlite3.Row` allows dict-like access: `row['column_name']`
- Converting sqlite3.Row to dict: `dict(row)` — needed before `jsonify()`
