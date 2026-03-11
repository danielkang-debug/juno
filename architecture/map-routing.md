# Map & Routing SOP

## Purpose
Visualize where patients live on a map and compute the optimal visit order to minimize total travel time for a given day.

## Geocoding (see also: patients.md)
- Geocoding is triggered when a patient is created or their address changes
- Coordinates (`lat`, `lon`) are stored in the `patients` table
- Nominatim (OpenStreetMap) is used — free, no API key required
- Rate limit: 1 request/second enforced by `time.sleep(1.0)`

## Route Optimization Algorithm

### Input
List of appointments for a given date, each enriched with patient `lat`/`lon`.

### Pre-processing
1. Filter appointments: only include those where `patient.lat IS NOT NULL`
2. Sort remaining by scheduled `time` (ascending) — this determines the start point

### Guard Conditions
- If `len(geocoded_appointments) < 2`: return appointments in time order, `legs=[]`, `total_travel_minutes=0`
- Ungeocodable appointments are appended at the end in time order (not routed)

### Nearest-Neighbor Heuristic
```
current = geocoded_appointments[0]  # earliest by time = starting point
unvisited = geocoded_appointments[1:]
route = [current]

while unvisited:
    nearest = min(unvisited, key=lambda apt: haversine(current.lat, current.lon, apt.lat, apt.lon))
    route.append(nearest)
    unvisited.remove(nearest)
    current = nearest
```

### Travel Time Estimation
```
travel_minutes(distance_km, avg_speed_kmh=30.0) = int((distance_km / avg_speed_kmh) * 60)
```
30 km/h average is conservative for urban/mixed driving with stops.

### Haversine Formula
```python
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
```

### Output Shape
```json
{
  "ordered_appointments": [...],
  "legs": [
    {"from_id": "uuid", "to_id": "uuid", "distance_km": 4.2, "minutes": 8}
  ],
  "total_travel_minutes": 42,
  "geocoded_count": 4,
  "skipped_count": 1
}
```

## API Endpoints

### POST /api/routes/optimize
- Body: `{"date": "YYYY-MM-DD"}`
- Fetches appointments for that date from DB
- Runs `optimize_route()`
- Saves result via `db.save_route()` (INSERT OR REPLACE — idempotent)
- Returns the optimization result

### GET /api/routes/:date
- Returns the saved route for a date (from `routes` table)
- Returns 404 if no route saved yet for that date

## Leaflet Map Implementation

### Initialization
```javascript
mapManager.init('map')
// Default center if no pins: [51.1657, 10.4515] (center of Germany), zoom 7
// If pins: fitBounds() to all marker positions, zoom 13
```

### Tile Layer
```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map)
```

### Patient Pins
```javascript
L.marker([apt.lat, apt.lon])
    .bindPopup(`<strong>${apt.patient_name}</strong><br>${apt.time} — ${apt.visit_type}`)
    .addTo(map)
```

### Route Polyline
```javascript
L.polyline(coordPairs, { color: '#A8BA9A', weight: 3, opacity: 0.85 }).addTo(map)
```

### Map Lifecycle (Critical)
- `mapManager.destroy()` MUST be called before navigating away from the Routes view
- The `router.navigateTo()` function calls `mapManager.destroy()` whenever `state.currentView === 'routes'`
- This prevents the Leaflet "Map container is already initialized" error

## Future Google Maps Swap
All map interactions are isolated in `mapManager` in `script.js`.
To swap from Leaflet to Google Maps:
1. Replace CDN links in `index.html`
2. Replace `mapManager.init()`, `.addPatientPin()`, `.drawRoute()`, `.destroy()` implementations
3. No backend changes required
4. No `styles.css` changes required (only `#map` container needs to exist in DOM)
