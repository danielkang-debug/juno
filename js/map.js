/**
 * map.js — Leaflet wrapper (singleton)
 */

let map = null;
let markers = [];
let routeLines = [];

export const mapManager = {
    init(elementId) {
        if (map) this.destroy();

        const el = document.getElementById(elementId);
        if (!el) return null;

        map = L.map(elementId, {
            zoomControl: true,
            attributionControl: false,
        }).setView([51.1657, 10.4515], 6); // Center of Germany

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
        }).addTo(map);

        return map;
    },

    destroy() {
        if (map) {
            map.remove();
            map = null;
        }
        markers = [];
        routeLines = [];
    },

    isInitialized() {
        return map !== null;
    },

    addPin(lat, lon, popupHtml, number) {
        if (!map) return null;
        const icon = L.divIcon({
            className: '',
            html: `<div class="map-pin">${number}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        if (popupHtml) marker.bindPopup(popupHtml);
        markers.push(marker);
        return marker;
    },

    addHomePin(lat, lon, label) {
        if (!map) return null;
        const icon = L.divIcon({
            className: '',
            html: `<div class="map-pin map-pin-home"><i data-lucide="home" style="width:14px;height:14px"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        if (label) marker.bindPopup(label);
        markers.push(marker);
        // Re-init lucide for the icon inside the pin
        if (window.lucide) lucide.createIcons();
        return marker;
    },

    drawRoute(geometry) {
        if (!map || !geometry || geometry.length < 2) return;
        const line = L.polyline(geometry, {
            color: '#1c1917',
            weight: 3,
            opacity: 0.7,
        }).addTo(map);
        routeLines.push(line);
        return line;
    },

    drawDashedRoute(waypoints) {
        if (!map || !waypoints || waypoints.length < 2) return;
        const line = L.polyline(waypoints, {
            color: '#1c1917',
            weight: 2,
            opacity: 0.5,
            dashArray: '8, 8',
        }).addTo(map);
        routeLines.push(line);
        return line;
    },

    fitBounds(padding = 50) {
        if (!map || markers.length === 0) return;
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [padding, padding] });
    },

    clearMarkers() {
        markers.forEach(m => m.remove());
        markers = [];
    },

    clearRoutes() {
        routeLines.forEach(l => l.remove());
        routeLines = [];
    },

    invalidateSize() {
        if (map) setTimeout(() => map.invalidateSize(), 100);
    },
};
