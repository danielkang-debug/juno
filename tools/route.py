"""
tools/route.py — Juno Geographic Computation Layer
Haversine distance, nearest-neighbor TSP, Nominatim geocoding.
No Flask imports. No DB imports.
"""

import math
import sys
import time
import json
import urllib.request
import urllib.parse


# ---------------------------------------------------------------------------
# Distance & Travel Time
# ---------------------------------------------------------------------------

def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km using the Haversine formula."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def travel_minutes(distance_km, avg_speed_kmh=30.0):
    """Estimate travel time in minutes at average urban speed (30 km/h)."""
    return int((distance_km / avg_speed_kmh) * 60)


# ---------------------------------------------------------------------------
# Nearest-Neighbor Route Optimization
# ---------------------------------------------------------------------------

def nearest_neighbor_route(appointments, start_index=0):
    """
    Nearest-neighbor TSP heuristic.

    Args:
        appointments: list of dicts, each must have 'lat' and 'lon' (non-None)
        start_index: index of the starting appointment (default 0 = earliest by time)

    Returns:
        Reordered list of appointments in visit order.
    """
    if not appointments:
        return []
    if len(appointments) == 1:
        return appointments[:]

    route = [appointments[start_index]]
    unvisited = [a for i, a in enumerate(appointments) if i != start_index]

    while unvisited:
        current = route[-1]
        nearest = min(
            unvisited,
            key=lambda a: haversine(current["lat"], current["lon"], a["lat"], a["lon"])
        )
        route.append(nearest)
        unvisited.remove(nearest)

    return route


def fetch_osrm_route(waypoints):
    """
    Call the OSRM demo API to get road-following geometry and real travel times.

    Args:
        waypoints: list of (lat, lon) tuples in visit order

    Returns:
        {
            "geometry": [[lat, lon], ...],   # actual road path for Leaflet
            "legs": [{"distance_km", "minutes"}, ...],
            "total_minutes": int,
            "total_km": float,
        }
        or None on any failure (caller falls back to haversine data).
    """
    if len(waypoints) < 2:
        return None

    # OSRM expects lon,lat order
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    url = (
        f"http://router.project-osrm.org/route/v1/driving/{coords_str}"
        f"?overview=full&geometries=geojson&steps=false"
    )

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Juno-Midwife-App/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())

        if data.get("code") != "Ok" or not data.get("routes"):
            print(f"[osrm] Unexpected response: {data.get('code')}", file=sys.stderr)
            return None

        route = data["routes"][0]

        # Convert geometry coordinates from [lon, lat] → [lat, lon] for Leaflet
        geometry = [[c[1], c[0]] for c in route["geometry"]["coordinates"]]

        legs = [
            {
                "distance_km": round(leg["distance"] / 1000, 2),
                "minutes": max(1, int(leg["duration"] / 60)),
            }
            for leg in route.get("legs", [])
        ]

        return {
            "geometry": geometry,
            "legs": legs,
            "total_minutes": max(1, int(route["duration"] / 60)),
            "total_km": round(route["distance"] / 1000, 2),
        }

    except Exception as e:
        print(f"[osrm] Routing failed, falling back to haversine: {e}", file=sys.stderr)
        return None


def optimize_route(appointments, start_location=None):
    """
    Top-level route optimization. Called by server.py.

    Args:
        appointments: raw dicts from db.list_appointments_by_date()
                      Each dict must include lat, lon (may be None), id, time, patient_name.
        start_location: optional dict with keys 'lat', 'lon', 'address'. If provided,
                        the route begins from this point and a home leg is prepended.

    Returns:
        {
            "ordered_appointments": [...],
            "legs": [{"from_id", "to_id", "distance_km", "minutes"}],
            "total_travel_minutes": int,
            "geocoded_count": int,
            "skipped_count": int,
            "start_location": dict | None
        }
    """
    # Split into geocoded (can be routed) and ungeocoded (appended at end)
    geocoded = [a for a in appointments if a.get("lat") is not None and a.get("lon") is not None]
    skipped = [a for a in appointments if a.get("lat") is None or a.get("lon") is None]

    # Sort geocoded by scheduled time as starting heuristic
    geocoded.sort(key=lambda a: a.get("time", ""))

    # Guard: need at least 2 geocoded points to draw a route
    if len(geocoded) < 2:
        ordered = sorted(appointments, key=lambda a: a.get("time", ""))
        return {
            "ordered_appointments": ordered,
            "legs": [],
            "total_travel_minutes": 0,
            "geocoded_count": len(geocoded),
            "skipped_count": len(skipped),
            "start_location": start_location,
        }

    # Determine starting appointment: nearest to home, or first by time
    has_home = start_location and start_location.get("lat") is not None
    if has_home:
        home_lat = start_location["lat"]
        home_lon = start_location["lon"]
        start_idx = min(
            range(len(geocoded)),
            key=lambda i: haversine(home_lat, home_lon, geocoded[i]["lat"], geocoded[i]["lon"])
        )
    else:
        start_idx = 0

    ordered_geocoded = nearest_neighbor_route(geocoded, start_index=start_idx)

    # Build legs — optionally prepend a home→first_stop leg
    legs = []
    total_minutes = 0

    if has_home:
        first = ordered_geocoded[0]
        home_dist = haversine(home_lat, home_lon, first["lat"], first["lon"])
        home_mins = travel_minutes(home_dist)
        legs.append({
            "from_id": "home",
            "to_id": first["id"],
            "distance_km": round(home_dist, 2),
            "minutes": home_mins,
        })
        total_minutes += home_mins

    for i in range(1, len(ordered_geocoded)):
        prev = ordered_geocoded[i - 1]
        curr = ordered_geocoded[i]
        dist_km = haversine(prev["lat"], prev["lon"], curr["lat"], curr["lon"])
        mins = travel_minutes(dist_km)
        legs.append({
            "from_id": prev["id"],
            "to_id": curr["id"],
            "distance_km": round(dist_km, 2),
            "minutes": mins,
        })
        total_minutes += mins

    # Append return-home leg from last geocoded stop back to home
    if has_home:
        last = ordered_geocoded[-1]
        return_dist = haversine(last["lat"], last["lon"], home_lat, home_lon)
        return_mins = travel_minutes(return_dist)
        legs.append({
            "from_id": last["id"],
            "to_id": "home",
            "distance_km": round(return_dist, 2),
            "minutes": return_mins,
        })
        total_minutes += return_mins

    # Build OSRM waypoints: home → ordered geocoded apts → home
    osrm_waypoints = []
    if has_home:
        osrm_waypoints.append((home_lat, home_lon))
    osrm_waypoints.extend([(a["lat"], a["lon"]) for a in ordered_geocoded])
    if has_home:
        osrm_waypoints.append((home_lat, home_lon))

    road_geometry = None
    if len(osrm_waypoints) >= 2:
        osrm = fetch_osrm_route(osrm_waypoints)
        if osrm:
            road_geometry = osrm["geometry"]
            total_minutes = osrm["total_minutes"]
            for i, ol in enumerate(osrm["legs"]):
                if i < len(legs):
                    legs[i]["distance_km"] = ol["distance_km"]
                    legs[i]["minutes"] = ol["minutes"]

    # Append ungeocodable appointments at the end in time order
    skipped_sorted = sorted(skipped, key=lambda a: a.get("time", ""))
    ordered_all = ordered_geocoded + skipped_sorted

    return {
        "ordered_appointments": ordered_all,
        "legs": legs,
        "total_travel_minutes": total_minutes,
        "geocoded_count": len(geocoded),
        "skipped_count": len(skipped),
        "start_location": start_location,
        "road_geometry": road_geometry,
    }


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def geocode_address(address):
    """
    Geocode an address using the Nominatim API (OpenStreetMap).

    Rate limit: enforces 1 req/sec via time.sleep(1.0) after every call.
    Never raises — all exceptions are caught and logged to stderr.

    Returns:
        (lat: float, lon: float) on success
        (None, None) on any failure
    """
    try:
        params = urllib.parse.urlencode({
            "q": address,
            "format": "json",
            "limit": 1,
        })
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Juno-Midwife-App/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            results = json.loads(response.read())

        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
        else:
            print(f"[geocode] No results for: {address}", file=sys.stderr)
            return None, None

    except Exception as e:
        print(f"[geocode] Error for '{address}': {e}", file=sys.stderr)
        return None, None
    finally:
        # Always enforce rate limit, regardless of success or failure
        time.sleep(1.0)
