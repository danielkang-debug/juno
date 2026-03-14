// -----------------------------------------------------------------------------
// js/map.js - Leaflet Map Integration
//
// Wraps Leaflet into a singleton mapManager object. A single instance is reused
// within the Routes view; call destroy() before navigating away (architectural
// invariant) to prevent Leaflet's "container already initialized" error on return.
//
// Road geometry flow:
//   1. After route optimization, fetchRoadGeometry() hits OSRM for polyline6 geometry.
//   2. drawRoute() decodes the polyline6 string via _decodePolyline6() and draws
//      a solid line. If OSRM fails (network error / < 2 waypoints), drawRoute()
//      falls back to straight Haversine lines shown as dashed.
// -----------------------------------------------------------------------------

export const mapManager = {
    _map: null,
    _pins: [],
    _routeLines: [],

    init(elementId) {
        if (this._map) return;
        this._map = L.map(elementId).setView([51.1657, 10.4515], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this._map);
    },

    // Required by architectural invariant: call before navigating away from routes
    // view to prevent Leaflet's "container already initialized" error on return.
    destroy() {
        if (!this._map) return;
        this._map.remove();
        this._map = null;
        this._pins = [];
        this._routeLines = [];
    },

    clearPins() {
        this._pins.forEach(p => p.remove());
        this._pins = [];
        this.clearRoute();
    },

    clearRoute() {
        this._routeLines.forEach(l => l.remove());
        this._routeLines = [];
    },

    addPin(lat, lon, popupHtml, number = null, violated = false) {
        const violatedClass = violated ? ' pin-violated' : '';
        const icon = L.divIcon({
            className: 'custom-pin',
            html: number ? `<div class="pin-number${violatedClass}">${number}</div>` : '<div class="pin-dot"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        const m = L.marker([lat, lon], { icon }).addTo(this._map);
        if (popupHtml) m.bindPopup(popupHtml);
        this._pins.push(m);
        return m;
    },

    addHomePin(lat, lon, address) {
        const icon = L.divIcon({
            className: 'home-pin',
            html: '🏠',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const m = L.marker([lat, lon], { icon }).addTo(this._map);
        m.bindPopup(`<strong>Home</strong><br>${address}`);
        this._pins.push(m);
    },

    drawRoute(apts, startLocation, roadGeometry = null) {
        this.clearRoute();
        const coords = [];
        if (startLocation?.lat != null) coords.push([startLocation.lat, startLocation.lon]);
        apts.forEach(a => { if (a.lat != null) coords.push([a.lat, a.lon]); });
        if (startLocation?.lat != null) coords.push([startLocation.lat, startLocation.lon]);

        if (roadGeometry) {
            const points = this._decodePolyline6(roadGeometry);
            const line = L.polyline(points, { color: '#2D5A27', weight: 4, opacity: 0.7 }).addTo(this._map);
            this._routeLines.push(line);
        } else {
            const line = L.polyline(coords, { color: '#2D5A27', weight: 3, dashArray: '5, 8', opacity: 0.5 }).addTo(this._map);
            this._routeLines.push(line);
        }

        if (coords.length > 0) {
            this._map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
        }
    },

    // Fetch real road geometry from OSRM for a prettier route line.
    // Falls back gracefully (returns null) on network error or insufficient waypoints.
    async fetchRoadGeometry(waypoints) {
        if (waypoints.length < 2) return null;
        try {
            const coords = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline6`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.code === 'Ok' && data.routes?.length > 0) {
                return data.routes[0].geometry;
            }
        } catch (e) {
            console.warn('OSRM failed', e);
        }
        return null;
    },

    _decodePolyline6(str) {
        let index = 0, lat = 0, lng = 0, shift = 0, result = 0, byte = null;
        const points = [];
        const factor = 1e6;
        while (index < str.length) {
            byte = null; shift = 0; result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
            byte = null; shift = 0; result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
            points.push([lat / factor, lng / factor]);
        }
        return points;
    }
};
