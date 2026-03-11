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


def optimize_route(appointments):
    """
    Top-level route optimization. Called by server.py.

    Args:
        appointments: raw dicts from db.list_appointments_by_date()
                      Each dict must include lat, lon (may be None), id, time, patient_name.

    Returns:
        {
            "ordered_appointments": [...],
            "legs": [{"from_id", "to_id", "distance_km", "minutes"}],
            "total_travel_minutes": int,
            "geocoded_count": int,
            "skipped_count": int
        }
    """
    # Split into geocoded (can be routed) and ungeocoded (appended at end)
    geocoded = [a for a in appointments if a.get("lat") is not None and a.get("lon") is not None]
    skipped = [a for a in appointments if a.get("lat") is None or a.get("lon") is None]

    # Sort geocoded by scheduled time as starting heuristic
    geocoded.sort(key=lambda a: a.get("time", ""))

    # Guard: need at least 2 geocoded points to draw a route
    if len(geocoded) < 2:
        # Return time-sorted list, no legs
        ordered = sorted(appointments, key=lambda a: a.get("time", ""))
        return {
            "ordered_appointments": ordered,
            "legs": [],
            "total_travel_minutes": 0,
            "geocoded_count": len(geocoded),
            "skipped_count": len(skipped),
        }

    # Run nearest-neighbor heuristic
    ordered_geocoded = nearest_neighbor_route(geocoded, start_index=0)

    # Build legs between consecutive stops
    legs = []
    total_minutes = 0
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

    # Append ungeocodable appointments at the end in time order
    skipped_sorted = sorted(skipped, key=lambda a: a.get("time", ""))
    ordered_all = ordered_geocoded + skipped_sorted

    return {
        "ordered_appointments": ordered_all,
        "legs": legs,
        "total_travel_minutes": total_minutes,
        "geocoded_count": len(geocoded),
        "skipped_count": len(skipped),
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
