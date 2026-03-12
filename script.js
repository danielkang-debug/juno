// Juno Application — SPA Frontend
// Architecture: CONFIG → LANG → state → t() → api → router → utils → mapManager → views → modals → init

// =============================================================================
// CONFIG
// =============================================================================
const CONFIG = {
    MAP_DEFAULT: [51.1657, 10.4515], // Center of Germany
    MAP_ZOOM: 6,
    MAP_ZOOM_CITY: 13,
    ROUTE_COLOR: '#2D5A27',
};

// =============================================================================
// LANG — i18n strings (de = default)
// =============================================================================
const LANG = {
    de: {
        // Nav
        nav_dashboard: 'Dashboard',
        nav_calendar: 'Kalender',
        nav_routes: 'Routen',
        nav_mothers: 'Mütter',
        nav_settings: 'Einstellungen',

        // Dashboard
        welcome: 'Willkommen zurück, Clara',
        visits_today: (n) => `${n} Besuch${n !== 1 ? 'e' : ''} heute`,
        active_births: 'Aktive Geburten',
        visits_today_label: 'Besuche heute',
        ga_alerts_label: 'GA-Warnungen (≥40W)',
        daily_pulse: 'Dein Tagesüberblick',
        daily_pulse_sub: 'Alle Routen für minimale Fahrzeit optimiert.',
        this_week: 'Diese Woche',
        quick_actions: 'Schnellaktionen',
        plan_route: '🗺 Route für heute planen',
        ga_alert_item: (name, ga) => `⚠️ GA-Warnung: ${name} (${ga})`,
        no_ga_alerts: '✓ Keine GA-Warnungen heute',
        view_mothers: (n) => `👩 Alle Mütter ansehen (${n})`,
        add_mother: '+ Mutter hinzufügen',
        new_appointment: '+ Neuer Termin',

        // Calendar
        calendar_title: 'Kalender',
        calendar_sub: 'Klicke auf einen Tag für Termine',
        cal_prev: '‹ Zurück',
        cal_next: 'Weiter ›',
        weekdays_short: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
        apt_count: (n) => `${n} Termin${n !== 1 ? 'e' : ''} geplant`,
        back_to_calendar: '← Zurück zum Kalender',
        appointments_title: 'Termine',
        view_route: 'Route anzeigen',
        add_appointment: '+ Termin hinzufügen',
        no_apts_day: 'Keine Termine für diesen Tag.',
        apt_tooltip: (n) => `${n} Termin${n !== 1 ? 'e' : ''}`,

        // Routes
        route_title: 'Routenplaner',
        route_sub: 'Optimiere deine Besuchsreihenfolge für weniger Fahrzeit',
        starting_point: 'Startpunkt',
        no_home: 'Nicht gesetzt — Route startet beim ersten Termin',
        home_placeholder: 'z. B. Musterstr. 1, 10115 Berlin',
        set_btn: 'Setzen',
        clear_btn: 'Löschen',
        geocoding: 'Adresse wird gesucht…',
        geocode_fail: 'Adresse nicht gefunden — bitte genauer angeben.',
        home_saved: 'Startpunkt gespeichert',
        enter_address: 'Bitte zuerst eine Adresse eingeben',
        optimize_btn: 'Route optimieren',
        optimizing: 'Optimiere…',
        route_optimized: (mins) => `Route optimiert — ${mins} Min. Fahrzeit gesamt`,
        select_date_hint: 'Datum wählen und Route optimieren klicken',
        no_apts_route: 'Keine Termine für dieses Datum.',
        go_to_calendar: 'Zum Kalender',
        stop_starting: 'Startpunkt',
        to_first_stop: (mins, km) => `↓ ${mins} Min · ${km} km zum ersten Halt`,
        optimized_route: 'Optimierte Route',
        apts_label: 'Termine',
        total_travel: (mins) => `~${mins} Min gesamt`,
        no_location_warn_route: (n) => `⚠️ ${n} Patient${n !== 1 ? 'innen' : 'in'} ohne Kartenstandort — am Ende`,
        no_apts_empty: 'Keine Termine für dieses Datum.',
        return_home: 'Zurück zum Startpunkt',
        travel_leg: (mins, km) => `↓ ${mins} Min · ${km} km`,

        // Mothers
        mothers_title: 'Mütter',
        mothers_sub: (n) => `${n} aktive${n !== 1 ? ' Patientinnen' : ' Patientin'}`,
        col_name: 'Name',
        col_status: 'Status',
        col_ga: 'SSW',
        col_due: 'ET',
        col_phone: 'Telefon',
        col_actions: 'Aktionen',
        no_location_warn: '⚠ Kein Kartenstandort',
        status_active: 'Schwanger',
        status_postpartum: 'Wochenbett',
        status_discharged: 'Entlassen',
        no_patients: 'Noch keine Patientinnen.',
        add_first_mother: '+ Erste Mutter hinzufügen',
        edit_btn: 'Bearbeiten',
        discharge_btn: 'Entlassen',
        discharge_confirm: (name) => `${name} entlassen? Sie wird aus der aktiven Liste entfernt.`,
        discharged_toast: (name) => `${name} entlassen`,

        // Visit types
        type_prenatal: 'Vorsorge',
        type_birth: 'Geburt',
        type_postnatal: 'Nachsorge',

        // GA label
        ga_label: (w, d) => `${w}W ${d}T`,

        // Patient modal
        edit_mother: 'Mutter bearbeiten',
        add_mother_modal: 'Mutter hinzufügen',
        label_fullname: 'Vollständiger Name *',
        label_address: 'Adresse *',
        label_address_hint: '(für Karte & Route)',
        placeholder_name: 'z. B. Maria Schmidt',
        placeholder_address: 'z. B. Musterstr. 1, 10115 Berlin',
        label_phone: 'Telefon',
        label_status: 'Status',
        label_ga_weeks: 'SSW',
        label_ga_days: 'SS-Tage',
        label_due_date: 'Entbindungstermin',
        label_notes: 'Notizen',
        cancel_btn: 'Abbrechen',
        save_changes: 'Änderungen speichern',
        add_mother_btn: 'Mutter hinzufügen',
        saving: 'Speichere…',
        adding: 'Hinzufügen…',
        geocoding_address: 'Adresse wird gesucht…',
        changes_saved: 'Änderungen gespeichert',
        mother_added: 'Mutter hinzugefügt',
        name_address_required: 'Name und Adresse sind erforderlich',
        select_patient_opt: 'active',
        opt_pregnant: 'Schwanger',
        opt_postpartum: 'Wochenbett',

        // Appointment modal
        edit_apt: 'Termin bearbeiten',
        new_apt: 'Neuer Termin',
        label_patient: 'Patientin *',
        label_date: 'Datum *',
        label_time: 'Uhrzeit *',
        label_visit_type: 'Besuchsart *',
        select_patient: '— Patientin wählen —',
        cancel_apt_btn: 'Termin absagen',
        close_btn: 'Schließen',
        schedule_btn: 'Planen',
        cancel_apt_confirm: 'Diesen Termin absagen?',
        apt_cancelled: 'Termin abgesagt',
        apt_updated: 'Termin aktualisiert',
        apt_scheduled: 'Termin geplant',
        patient_date_time_required: 'Patientin, Datum und Uhrzeit sind erforderlich',
        saving_apt: 'Speichere…',

        // Confirm dialog
        confirm_cancel: 'Abbrechen',
        confirm_ok: 'Bestätigen',

        // Misc
        loading: 'Juno wird geladen…',
        loading_spinner: 'Wird geladen…',
        error_prefix: 'Fehler',

        // Banner
        banner: '⚠️ Prototyp — Bitte keine sensiblen oder echten Patientendaten eingeben.',
        lang_toggle: 'EN',
        locale: 'de-DE',
    },

    en: {
        // Nav
        nav_dashboard: 'Dashboard',
        nav_calendar: 'Calendar',
        nav_routes: 'Routes',
        nav_mothers: 'Mothers',
        nav_settings: 'Settings',

        // Dashboard
        welcome: 'Welcome back, Clara',
        visits_today: (n) => `${n} visit${n !== 1 ? 's' : ''} today`,
        active_births: 'Active Births',
        visits_today_label: 'Visits Today',
        ga_alerts_label: 'GA Alerts (≥40w)',
        daily_pulse: 'Your Daily Pulse',
        daily_pulse_sub: 'All routines optimized for minimum travel time.',
        this_week: 'This Week',
        quick_actions: 'Quick Actions',
        plan_route: '🗺 Plan today\'s route',
        ga_alert_item: (name, ga) => `⚠️ GA alert: ${name} (${ga})`,
        no_ga_alerts: '✓ No GA alerts today',
        view_mothers: (n) => `👩 View all mothers (${n})`,
        add_mother: '+ Add Mother',
        new_appointment: '+ New Appointment',

        // Calendar
        calendar_title: 'Calendar',
        calendar_sub: 'Click a day to view or schedule appointments',
        cal_prev: '‹ Prev',
        cal_next: 'Next ›',
        weekdays_short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        apt_count: (n) => `${n} appointment${n !== 1 ? 's' : ''} scheduled`,
        back_to_calendar: '← Back to Calendar',
        appointments_title: 'Appointments',
        view_route: 'View Route',
        add_appointment: '+ Add Appointment',
        no_apts_day: 'No appointments scheduled for this day.',
        apt_tooltip: (n) => `${n} appointment${n !== 1 ? 's' : ''}`,

        // Routes
        route_title: 'Route Planner',
        route_sub: 'Optimize your visit order to save travel time',
        starting_point: 'Starting Point',
        no_home: 'Not set — route starts from first appointment',
        home_placeholder: 'e.g. Musterstr. 1, 10115 Berlin',
        set_btn: 'Set',
        clear_btn: 'Clear',
        geocoding: 'Geocoding…',
        geocode_fail: 'Could not find that address — try a more specific address.',
        home_saved: 'Starting point saved',
        enter_address: 'Enter an address first',
        optimize_btn: 'Optimize Route',
        optimizing: 'Optimizing…',
        route_optimized: (mins) => `Route optimized — ${mins} min total travel`,
        select_date_hint: 'Select a date and click Optimize Route',
        no_apts_route: 'No appointments scheduled for this date.',
        go_to_calendar: 'Go to Calendar',
        stop_starting: 'Starting Point',
        to_first_stop: (mins, km) => `↓ ${mins} min · ${km} km to first stop`,
        optimized_route: 'Optimized Route',
        apts_label: 'Appointments',
        total_travel: (mins) => `~${mins} min total`,
        no_location_warn_route: (n) => `⚠️ ${n} patient${n !== 1 ? 's' : ''} without map location — shown at end`,
        no_apts_empty: 'No appointments for this date.',
        return_home: 'Return Home',
        travel_leg: (mins, km) => `↓ ${mins} min · ${km} km`,

        // Mothers
        mothers_title: 'Mothers',
        mothers_sub: (n) => `${n} active patient${n !== 1 ? 's' : ''}`,
        col_name: 'Name',
        col_status: 'Status',
        col_ga: 'GA',
        col_due: 'Due Date',
        col_phone: 'Phone',
        col_actions: 'Actions',
        no_location_warn: '⚠ No map location',
        status_active: 'Pregnant',
        status_postpartum: 'Postpartum',
        status_discharged: 'Discharged',
        no_patients: 'No patients yet.',
        add_first_mother: '+ Add Your First Mother',
        edit_btn: 'Edit',
        discharge_btn: 'Discharge',
        discharge_confirm: (name) => `Discharge ${name}? This will remove them from your active list.`,
        discharged_toast: (name) => `${name} discharged`,

        // Visit types
        type_prenatal: 'Prenatal',
        type_birth: 'Birth',
        type_postnatal: 'Postnatal',

        // GA label
        ga_label: (w, d) => `${w}w ${d}d`,

        // Patient modal
        edit_mother: 'Edit Mother',
        add_mother_modal: 'Add Mother',
        label_fullname: 'Full Name *',
        label_address: 'Address *',
        label_address_hint: '(used for map & route)',
        placeholder_name: 'e.g. Maria Schmidt',
        placeholder_address: 'e.g. Musterstr. 1, 10115 Berlin',
        label_phone: 'Phone',
        label_status: 'Status',
        label_ga_weeks: 'GA Weeks',
        label_ga_days: 'GA Days',
        label_due_date: 'Due Date',
        label_notes: 'Notes',
        cancel_btn: 'Cancel',
        save_changes: 'Save Changes',
        add_mother_btn: 'Add Mother',
        saving: 'Saving…',
        adding: 'Adding…',
        geocoding_address: 'Geocoding address…',
        changes_saved: 'Changes saved',
        mother_added: 'Mother added',
        name_address_required: 'Name and address are required',
        opt_pregnant: 'Pregnant',
        opt_postpartum: 'Postpartum',

        // Appointment modal
        edit_apt: 'Edit Appointment',
        new_apt: 'New Appointment',
        label_patient: 'Patient *',
        label_date: 'Date *',
        label_time: 'Time *',
        label_visit_type: 'Visit Type *',
        select_patient: '— Select a patient —',
        cancel_apt_btn: 'Cancel Appointment',
        close_btn: 'Close',
        schedule_btn: 'Schedule',
        cancel_apt_confirm: 'Cancel this appointment?',
        apt_cancelled: 'Appointment cancelled',
        apt_updated: 'Appointment updated',
        apt_scheduled: 'Appointment scheduled',
        patient_date_time_required: 'Patient, date, and time are required',
        saving_apt: 'Saving…',

        // Confirm dialog
        confirm_cancel: 'Cancel',
        confirm_ok: 'Confirm',

        // Misc
        loading: 'Loading Juno…',
        loading_spinner: 'Loading…',
        error_prefix: 'Error',

        // Banner
        banner: '⚠️ Prototype — Do not enter sensitive or real patient data.',
        lang_toggle: 'DE',
        locale: 'en-GB',
    },
};

// =============================================================================
// STATE
// =============================================================================
const state = {
    currentView: null,
    calendarMonth: new Date(),
    routeDate: null,
    leafletMap: null,
    homeLocation: JSON.parse(localStorage.getItem('juno_home') || 'null'),
    lang: localStorage.getItem('juno_lang') || 'de',
};

// =============================================================================
// t() — translation helper
// =============================================================================
function t(key, ...args) {
    const val = LANG[state.lang][key];
    if (val === undefined) return key;
    if (typeof val === 'function') return val(...args);
    return val;
}

// =============================================================================
// API
// =============================================================================
const api = {
    async _fetch(path, options = {}) {
        const res = await fetch(path, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
    },
    get(path)         { return api._fetch(path); },
    post(path, body)  { return api._fetch(path, { method: 'POST',   body: JSON.stringify(body) }); },
    put(path, body)   { return api._fetch(path, { method: 'PUT',    body: JSON.stringify(body) }); },
    delete(path)      { return api._fetch(path, { method: 'DELETE' }); },

    patients: {
        list: ()           => api.get('/api/patients'),
        create: (data)     => api.post('/api/patients', data),
        update: (id, data) => api.put(`/api/patients/${id}`, data),
        delete: (id)       => api.delete(`/api/patients/${id}`),
    },
    appointments: {
        byDate:  (date)   => api.get(`/api/appointments?date=${date}`),
        byMonth: (month)  => api.get(`/api/appointments?month=${month}`),
        create:  (data)   => api.post('/api/appointments', data),
        update:  (id, d)  => api.put(`/api/appointments/${id}`, d),
        cancel:  (id)     => api.delete(`/api/appointments/${id}`),
    },
    routes: {
        optimize: (date, startLat, startLon, startAddress) => api.post('/api/routes/optimize', {
            date,
            ...(startLat != null ? { start_lat: startLat, start_lon: startLon, start_address: startAddress || '' } : {}),
        }),
        get:      (date)  => api.get(`/api/routes/${date}`),
        save:     (date, orderedIds, totalMinutes) => api.post('/api/routes/save', {
            date,
            ordered_appointment_ids: orderedIds,
            estimated_travel_minutes: totalMinutes,
        }),
    },
    geocode: (address) => api.get(`/api/geocode?address=${encodeURIComponent(address)}`),
};

// =============================================================================
// UTILS
// =============================================================================
const utils = {
    today() {
        return new Date().toISOString().slice(0, 10);
    },

    monthKey(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    },

    formatDate(iso) {
        const locale = t('locale');
        const d = new Date(iso + 'T12:00:00');
        return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },

    formatMonthYear(d) {
        const locale = t('locale');
        return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    },

    formatTime(hhmm) {
        if (!hhmm) return '';
        if (state.lang === 'de') return hhmm; // German uses 24h
        const [h, m] = hhmm.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    },

    gaLabel(weeks, days) {
        return t('ga_label', weeks, days);
    },

    visitTypeLabel(type) {
        const map = { prenatal: t('type_prenatal'), birth: t('type_birth'), postnatal: t('type_postnatal') };
        return map[type] || type;
    },

    statusLabel(status) {
        if (status === 'active') return t('status_active');
        if (status === 'postpartum') return t('status_postpartum');
        return t('status_discharged');
    },

    isGAAlert(weeks) {
        return parseInt(weeks) >= 40;
    },

    showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    },

    visitBadge(type) {
        return `<span class="visit-badge ${type}">${utils.visitTypeLabel(type)}</span>`;
    },

    escapeHtml(str) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(str || ''));
        return d.innerHTML;
    },

    async fetchOSRMGeometry(waypoints) {
        if (!waypoints || waypoints.length < 2) return null;
        try {
            const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
            const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,
                { headers: { 'User-Agent': 'Juno-Midwife-App/1.0' } }
            );
            const data = await res.json();
            if (data.code !== 'Ok' || !data.routes?.length) return null;
            return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        } catch (e) {
            console.warn('[osrm] frontend geometry fetch failed:', e);
            return null;
        }
    },

    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371.0;
        const toRad = x => x * Math.PI / 180;
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    travelMinutes(distKm) {
        return Math.round((distKm / 30) * 60);
    },

    confirm(message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '2000';
            overlay.innerHTML = `
                <div class="modal-box" style="width:380px;max-width:95vw;">
                    <p style="margin-bottom:1.5rem;line-height:1.5;">${utils.escapeHtml(message)}</p>
                    <div class="form-actions" style="margin-top:0;padding-top:0;border-top:none;">
                        <button class="btn-secondary" id="confirm-no">${t('confirm_cancel')}</button>
                        <button class="btn-danger" id="confirm-yes">${t('confirm_ok')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
            overlay.querySelector('#confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
            overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
        });
    },
};

// =============================================================================
// MAP MANAGER — Leaflet singleton
// =============================================================================
const mapManager = {
    _map: null,
    _markers: [],
    _polyline: null,

    init(containerId = 'map') {
        this.destroy();
        const el = document.getElementById(containerId);
        if (!el) return;
        this._map = L.map(containerId).setView(CONFIG.MAP_DEFAULT, CONFIG.MAP_ZOOM);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(this._map);
    },

    addPin(lat, lon, popupHtml, number = null) {
        if (!this._map) return;
        let marker;
        if (number != null) {
            const icon = L.divIcon({
                className: '',
                html: `<div style="background:${CONFIG.ROUTE_COLOR};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;">${number}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });
            marker = L.marker([lat, lon], { icon }).bindPopup(popupHtml).addTo(this._map);
        } else {
            marker = L.marker([lat, lon]).bindPopup(popupHtml).addTo(this._map);
        }
        this._markers.push(marker);
        return marker;
    },

    addHomePin(lat, lon, address) {
        if (!this._map) return;
        const icon = L.divIcon({
            className: '',
            html: '<div style="background:#2C332A;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.35);">🏠</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
        });
        const marker = L.marker([lat, lon], { icon }).bindPopup(`<strong>${t('stop_starting')}</strong><br>${address || ''}`).addTo(this._map);
        this._markers.push(marker);
        return marker;
    },

    drawRoute(orderedApts, startLocation = null, roadGeometry = null) {
        if (!this._map) return;

        let coords;
        if (roadGeometry && roadGeometry.length >= 2) {
            coords = roadGeometry;
        } else {
            const aptCoords = orderedApts
                .filter(a => a.lat != null && a.lon != null)
                .map(a => [a.lat, a.lon]);
            if (aptCoords.length === 0) return;
            coords = [];
            if (startLocation && startLocation.lat != null) coords.push([startLocation.lat, startLocation.lon]);
            coords.push(...aptCoords);
            if (startLocation && startLocation.lat != null) coords.push([startLocation.lat, startLocation.lon]);
        }

        if (this._polyline) {
            this._polyline.remove();
        }
        this._polyline = L.polyline(coords, {
            color: CONFIG.ROUTE_COLOR,
            weight: 5,
            opacity: 0.9,
        }).addTo(this._map);

        const bounds = L.latLngBounds(coords);
        this._map.fitBounds(bounds, { padding: [40, 40] });
    },

    clearPins() {
        this._markers.forEach(m => m.remove());
        this._markers = [];
        if (this._polyline) { this._polyline.remove(); this._polyline = null; }
    },

    destroy() {
        if (this._map) {
            this._map.remove();
            this._map = null;
            this._markers = [];
            this._polyline = null;
        }
    },
};

// =============================================================================
// ROUTER
// =============================================================================
const router = {
    navigateTo(view, params = {}) {
        if (state.currentView === 'routes') {
            mapManager.destroy();
        }

        state.currentView = view;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.id === `nav-${view}`);
        });

        const appView = document.getElementById('app-view');
        appView.innerHTML = `<div class="loading-spinner">${t('loading_spinner')}</div>`;

        const viewMap = {
            dashboard: () => views.dashboard.render(params),
            calendar:  () => views.calendar.render(params),
            routes:    () => views.routeView.render(params),
            mothers:   () => views.mothers.render(params),
        };

        if (viewMap[view]) {
            viewMap[view]().catch(err => {
                appView.innerHTML = `<div class="loading-spinner" style="color:var(--pending)">${t('error_prefix')}: ${utils.escapeHtml(err.message)}</div>`;
                console.error(err);
            });
        }
    },

    init() {
        document.querySelectorAll('.nav-item[id^="nav-"]').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const view = item.id.replace('nav-', '');
                if (['dashboard', 'calendar', 'routes', 'mothers'].includes(view)) {
                    router.navigateTo(view);
                }
            });
        });
    },
};

// =============================================================================
// NAV + BANNER update helpers
// =============================================================================
function updateNav() {
    const navKeys = ['dashboard', 'calendar', 'routes', 'mothers', 'settings'];
    navKeys.forEach(key => {
        const el = document.getElementById(`nav-${key}`);
        if (el) el.textContent = t(`nav_${key}`);
    });
}

function updateBanner() {
    const text = document.getElementById('banner-text');
    const btn  = document.getElementById('lang-toggle');
    if (text) text.textContent = t('banner');
    if (btn)  btn.textContent  = t('lang_toggle');
}

// =============================================================================
// VIEWS
// =============================================================================
const views = {

    // -------------------------------------------------------------------------
    // DASHBOARD
    // -------------------------------------------------------------------------
    dashboard: {
        async render() {
            const [apts, patients] = await Promise.all([
                api.appointments.byDate(utils.today()),
                api.patients.list(),
            ]);

            const activeBirths  = apts.filter(a => a.visit_type === 'birth').length;
            const scheduled     = apts.length;
            const gaAlerts      = patients.filter(p => utils.isGAAlert(p.gestational_age_weeks));

            const month = utils.monthKey(new Date());
            const monthData = await api.appointments.byMonth(month);
            const countByDay = {};
            monthData.forEach(r => { countByDay[r.date] = r.count; });

            const today = utils.today();
            const locale = t('locale');
            const weekDays = [];
            for (let i = -3; i <= 3; i++) {
                const d = new Date(today + 'T12:00:00');
                d.setDate(d.getDate() + i);
                const iso = d.toISOString().slice(0, 10);
                weekDays.push({ iso, label: d.toLocaleDateString(locale, { weekday: 'short' }), day: d.getDate(), count: countByDay[iso] || 0 });
            }

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);margin-bottom:4px;">${t('welcome')}</h1>
                        <p style="color:var(--text-muted);">${new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} · ${t('visits_today', scheduled)}</p>
                    </div>
                    <div style="display:flex;gap:0.75rem;">
                        <button class="btn-secondary" id="dash-add-mother">${t('add_mother')}</button>
                        <button class="btn-primary" id="dash-new-apt">${t('new_appointment')}</button>
                    </div>
                </header>

                <div class="dashboard-grid">
                    <div class="metric-container">
                        <div class="metric-card">
                            <span>${t('active_births')}</span>
                            <strong>${activeBirths}</strong>
                        </div>
                        <div class="metric-card">
                            <span>${t('visits_today_label')}</span>
                            <strong>${String(scheduled).padStart(2,'0')}</strong>
                        </div>
                        <div class="metric-card ${gaAlerts.length > 0 ? 'ga-alert' : ''}">
                            <span>${t('ga_alerts_label')}</span>
                            <strong>${gaAlerts.length}</strong>
                        </div>
                    </div>

                    <section class="card hero-card" style="grid-column:span 12;">
                        <div class="hero-content">
                            <h2>${t('daily_pulse')}</h2>
                            <p>${t('daily_pulse_sub')}</p>
                        </div>
                    </section>

                    <section class="card" style="grid-column:span 7;">
                        <h2>${t('this_week')}</h2>
                        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:1rem;">
                            ${weekDays.map(d => `
                                <div class="day-cell ${d.iso === today ? 'today' : ''} ${d.count >= 4 ? 'apt-4' : d.count === 3 ? 'apt-3' : d.count === 2 ? 'apt-2' : d.count === 1 ? 'apt-1' : ''}"
                                     style="cursor:pointer;flex-direction:column;gap:4px;display:flex;align-items:center;justify-content:center;position:relative;"
                                     data-date="${d.iso}">
                                    ${d.count > 0 ? `<span style="position:absolute;top:3px;right:5px;font-size:0.6rem;opacity:0.85;line-height:1;">${d.count}</span>` : ''}
                                    <span style="font-size:0.65rem;opacity:0.7;">${d.label}</span>
                                    <span>${d.day}</span>
                                </div>
                            `).join('')}
                        </div>
                    </section>

                    <section class="card" style="grid-column:span 5;">
                        <h2>${t('quick_actions')}</h2>
                        <ul style="list-style:none;display:flex;flex-direction:column;gap:4px;margin-top:0.75rem;">
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);cursor:pointer;color:var(--text-dark);" id="qa-plan-route">
                                ${t('plan_route')}
                            </li>
                            ${gaAlerts.length > 0 ? gaAlerts.map(p => `
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);" class="ga-alert">
                                ${t('ga_alert_item', utils.escapeHtml(p.name), utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days))}
                            </li>`).join('') : `
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);color:var(--text-muted);">
                                ${t('no_ga_alerts')}
                            </li>`}
                            <li style="padding:10px 0;cursor:pointer;color:var(--text-dark);" id="qa-view-mothers">
                                ${t('view_mothers', patients.length)}
                            </li>
                        </ul>
                    </section>
                </div>
            `;

            document.getElementById('dash-new-apt').addEventListener('click', () => modals.appointment(utils.today()));
            document.getElementById('dash-add-mother').addEventListener('click', () => modals.patient(null, () => views.dashboard.render()));
            document.getElementById('qa-plan-route')?.addEventListener('click', () => router.navigateTo('routes', { date: utils.today() }));
            document.getElementById('qa-view-mothers')?.addEventListener('click', () => router.navigateTo('mothers'));
            document.querySelectorAll('[data-date]').forEach(cell => {
                cell.addEventListener('click', () => router.navigateTo('calendar', { date: cell.dataset.date }));
            });
        },
    },

    // -------------------------------------------------------------------------
    // CALENDAR
    // -------------------------------------------------------------------------
    calendar: {
        async render(params = {}) {
            if (params.date) {
                return views.calendar.renderDayDetail(params.date);
            }

            if (params.month) {
                state.calendarMonth = new Date(params.month + '-01T12:00:00');
            }

            const month = utils.monthKey(state.calendarMonth);
            const monthData = await api.appointments.byMonth(month);
            const countByDay = {};
            monthData.forEach(r => { countByDay[r.date] = r.count; });

            const today = utils.today();
            const firstDay = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth(), 1);
            const daysInMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 0).getDate();

            let startOffset = firstDay.getDay() - 1;
            if (startOffset < 0) startOffset = 6;

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);">${t('calendar_title')}</h1>
                        <p style="color:var(--text-muted);">${t('calendar_sub')}</p>
                    </div>
                    <button class="btn-primary" id="cal-new-apt">${t('new_appointment')}</button>
                </header>

                <div class="card">
                    <div class="calendar-nav">
                        <button id="cal-prev">${t('cal_prev')}</button>
                        <h2 style="margin:0;">${utils.formatMonthYear(state.calendarMonth)}</h2>
                        <button id="cal-next">${t('cal_next')}</button>
                    </div>

                    <div class="calendar-weekdays">
                        ${t('weekdays_short').map(d => `<div class="weekday-label">${d}</div>`).join('')}
                    </div>

                    <div class="month-grid">
                        ${Array(startOffset).fill('<div></div>').join('')}
                        ${Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const iso = `${month}-${String(day).padStart(2, '0')}`;
                            const count = countByDay[iso] || 0;
                            const dow = new Date(iso + 'T12:00:00').getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            const cls = [
                                isWeekend ? 'weekend' : '',
                                count >= 4 ? 'apt-4' : count === 3 ? 'apt-3' : count === 2 ? 'apt-2' : count === 1 ? 'apt-1' : '',
                                iso === today ? 'today' : '',
                            ].filter(Boolean).join(' ');
                            return `<div class="day-cell ${cls}" data-date="${iso}" title="${t('apt_tooltip', count)}" style="position:relative;">
                                ${count > 0 ? `<span style="position:absolute;top:3px;right:5px;font-size:0.6rem;opacity:0.85;line-height:1;">${count}</span>` : ''}
                                ${day}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;

            document.getElementById('cal-prev').addEventListener('click', () => {
                state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
                views.calendar.render();
            });
            document.getElementById('cal-next').addEventListener('click', () => {
                state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
                views.calendar.render();
            });
            document.getElementById('cal-new-apt').addEventListener('click', () => modals.appointment(today));
            document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
                cell.addEventListener('click', () => views.calendar.renderDayDetail(cell.dataset.date));
            });
        },

        async renderDayDetail(isoDate) {
            const apts = await api.appointments.byDate(isoDate);

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <button class="day-detail-back" id="back-to-month">${t('back_to_calendar')}</button>
                        <h1 style="color:var(--text-dark);">${utils.formatDate(isoDate)}</h1>
                        <p style="color:var(--text-muted);">${t('apt_count', apts.length)}</p>
                    </div>
                    <div style="display:flex;gap:0.75rem;">
                        <button class="btn-secondary" id="btn-view-route">${t('view_route')}</button>
                        <button class="btn-primary" id="btn-add-apt">${t('add_appointment')}</button>
                    </div>
                </header>

                <div style="display:grid;grid-template-columns:1fr;gap:1.5rem;max-width:720px;">
                    <section class="card">
                        <h2>${t('appointments_title')}</h2>
                        <div id="apt-list" style="margin-top:1rem;">
                            ${apts.length === 0 ? `
                                <div class="empty-state">
                                    <p>${t('no_apts_day')}</p>
                                    <button class="btn-primary" id="empty-add-apt">${t('add_appointment')}</button>
                                </div>
                            ` : apts.map(a => `
                                <div class="time-slot">
                                    <div class="slot-time">${utils.formatTime(a.time)}</div>
                                    <div class="apt-card ${a.visit_type}" data-id="${a.id}">
                                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                            <strong>${utils.escapeHtml(a.patient_name)}</strong>
                                            ${utils.visitBadge(a.visit_type)}
                                        </div>
                                        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">${utils.escapeHtml(a.address)}</div>
                                        ${a.notes ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;font-style:italic;">${utils.escapeHtml(a.notes)}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            `;

            document.getElementById('back-to-month').addEventListener('click', () => views.calendar.render());
            document.getElementById('btn-add-apt').addEventListener('click', () => modals.appointment(isoDate, null, () => views.calendar.renderDayDetail(isoDate)));
            document.getElementById('btn-view-route').addEventListener('click', () => router.navigateTo('routes', { date: isoDate }));
            document.getElementById('empty-add-apt')?.addEventListener('click', () => modals.appointment(isoDate, null, () => views.calendar.renderDayDetail(isoDate)));

            document.querySelectorAll('.apt-card[data-id]').forEach(card => {
                const apt = apts.find(a => a.id === card.dataset.id);
                card.addEventListener('click', () => modals.appointment(isoDate, apt, () => views.calendar.renderDayDetail(isoDate)));
            });
        },
    },

    // -------------------------------------------------------------------------
    // ROUTES VIEW
    // -------------------------------------------------------------------------
    routeView: {
        async render(params = {}) {
            const date = params.date || state.routeDate || utils.today();
            state.routeDate = date;

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);">${t('route_title')}</h1>
                        <p style="color:var(--text-muted);">${t('route_sub')}</p>
                    </div>
                </header>

                <div class="card" style="padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <span style="font-size:1.1rem;">🏠</span>
                        <strong style="font-size:0.9rem;color:var(--text-dark);">${t('starting_point')}</strong>
                        ${state.homeLocation ? `<span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.25rem;">${utils.escapeHtml(state.homeLocation.address)}</span>` : `<span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.25rem;">${t('no_home')}</span>`}
                    </div>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <input type="text" id="home-address-input" class="input-field" style="flex:1;" placeholder="${t('home_placeholder')}" value="${state.homeLocation ? utils.escapeHtml(state.homeLocation.address) : ''}">
                        <button class="btn-secondary" id="btn-set-home">${t('set_btn')}</button>
                        ${state.homeLocation ? `<button class="btn-secondary" id="btn-clear-home" style="color:var(--pending);">${t('clear_btn')}</button>` : ''}
                    </div>
                    <div id="home-status" style="font-size:0.78rem;color:var(--text-muted);margin-top:0.4rem;min-height:1rem;"></div>
                </div>

                <div class="route-controls" style="margin-bottom:1.5rem;">
                    <input type="date" id="route-date-picker" value="${date}" class="input-field" style="width:180px;">
                    <button class="btn-primary" id="btn-optimize">${t('optimize_btn')}</button>
                </div>

                <div id="route-layout">
                    <div>
                        <div class="card" style="padding:0;overflow:hidden;">
                            <div id="map"></div>
                        </div>
                    </div>
                    <div>
                        <div class="card" id="route-list-card">
                            <div class="loading-spinner">${t('select_date_hint')}</div>
                        </div>
                    </div>
                </div>
            `;

            mapManager.init('map');

            const expandCtrl = L.control({ position: 'bottomleft' });
            expandCtrl.onAdd = function() {
                const btn = L.DomUtil.create('button', 'map-expand-btn');
                btn.innerHTML = '⛶';
                btn.title = 'Expand map';
                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.on(btn, 'click', () => {
                    const layout = document.getElementById('route-layout');
                    const expanded = layout.classList.toggle('map-expanded');
                    btn.innerHTML = expanded ? '⊡' : '⛶';
                    btn.title = expanded ? 'Collapse map' : 'Expand map';
                    setTimeout(() => mapManager._map?.invalidateSize(), 260);
                });
                return btn;
            };
            expandCtrl.addTo(mapManager._map);

            try {
                const saved = await api.routes.get(date);
                const apts = await api.appointments.byDate(date);
                if (apts.length > 0) {
                    const aptById = {};
                    apts.forEach(a => { aptById[a.id] = a; });
                    const ordered = (saved.ordered_appointment_ids || [])
                        .map(id => aptById[id])
                        .filter(Boolean);
                    const home = state.homeLocation;
                    const osrmWaypoints = [];
                    if (home?.lat != null) osrmWaypoints.push(home);
                    ordered.filter(a => a.lat != null).forEach(a => osrmWaypoints.push({ lat: a.lat, lon: a.lon }));
                    if (home?.lat != null) osrmWaypoints.push(home);
                    const savedGeo = await utils.fetchOSRMGeometry(osrmWaypoints);
                    views.routeView._renderRouteResult(ordered, [], saved.estimated_travel_minutes, false, home, false, savedGeo);
                }
            } catch (_) {
                const apts = await api.appointments.byDate(date);
                if (apts.length > 0) {
                    views.routeView._renderRouteResult(apts, [], 0, true);
                } else {
                    document.getElementById('route-list-card').innerHTML = `
                        <div class="empty-state">
                            <p>${t('no_apts_route')}</p>
                            <button class="btn-secondary" id="go-calendar-btn">${t('go_to_calendar')}</button>
                        </div>`;
                    document.getElementById('go-calendar-btn')?.addEventListener('click', () => router.navigateTo('calendar'));
                }
            }

            document.getElementById('btn-set-home').addEventListener('click', async () => {
                const address = document.getElementById('home-address-input').value.trim();
                if (!address) { utils.showToast(t('enter_address'), 'error'); return; }
                const statusEl = document.getElementById('home-status');
                const btn = document.getElementById('btn-set-home');
                btn.disabled = true;
                statusEl.textContent = t('geocoding');
                try {
                    const result = await api.geocode(address);
                    state.homeLocation = { lat: result.lat, lon: result.lon, address: result.address };
                    localStorage.setItem('juno_home', JSON.stringify(state.homeLocation));
                    utils.showToast(t('home_saved'));
                    views.routeView.render({ date: state.routeDate });
                } catch (err) {
                    statusEl.textContent = t('geocode_fail');
                    btn.disabled = false;
                }
            });

            document.getElementById('btn-clear-home')?.addEventListener('click', () => {
                state.homeLocation = null;
                localStorage.removeItem('juno_home');
                views.routeView.render({ date: state.routeDate });
            });

            document.getElementById('route-date-picker').addEventListener('change', e => {
                state.routeDate = e.target.value;
                router.navigateTo('routes', { date: e.target.value });
            });

            document.getElementById('btn-optimize').addEventListener('click', async () => {
                const btn = document.getElementById('btn-optimize');
                btn.textContent = t('optimizing');
                btn.disabled = true;
                try {
                    const home = state.homeLocation;
                    const result = await api.routes.optimize(
                        state.routeDate,
                        home ? home.lat : null,
                        home ? home.lon : null,
                        home ? home.address : null,
                    );
                    mapManager.clearPins();
                    views.routeView._renderRouteResult(result.ordered_appointments, result.legs, result.total_travel_minutes, false, result.start_location, true, result.road_geometry || null);
                    utils.showToast(t('route_optimized', result.total_travel_minutes));
                } catch (err) {
                    utils.showToast(err.message, 'error');
                } finally {
                    const b = document.getElementById('btn-optimize');
                    if (b) { b.textContent = t('optimize_btn'); b.disabled = false; }
                }
            });

            views.routeView._attachDragHandlers();
        },

        _currentApts: [],
        _currentStartLocation: null,

        _recalcLegs(apts, startLocation) {
            const geo = apts.filter(a => a.lat != null && a.lon != null);
            const hasHome = startLocation && startLocation.lat != null;
            const legs = [];
            let totalMinutes = 0;

            if (hasHome && geo.length > 0) {
                const dist = utils.haversine(startLocation.lat, startLocation.lon, geo[0].lat, geo[0].lon);
                const mins = utils.travelMinutes(dist);
                legs.push({ from_id: 'home', to_id: geo[0].id, distance_km: Math.round(dist * 100) / 100, minutes: mins });
                totalMinutes += mins;
            }
            for (let i = 1; i < geo.length; i++) {
                const dist = utils.haversine(geo[i-1].lat, geo[i-1].lon, geo[i].lat, geo[i].lon);
                const mins = utils.travelMinutes(dist);
                legs.push({ from_id: geo[i-1].id, to_id: geo[i].id, distance_km: Math.round(dist * 100) / 100, minutes: mins });
                totalMinutes += mins;
            }
            if (hasHome && geo.length > 0) {
                const last = geo[geo.length - 1];
                const dist = utils.haversine(last.lat, last.lon, startLocation.lat, startLocation.lon);
                const mins = utils.travelMinutes(dist);
                legs.push({ from_id: last.id, to_id: 'home', distance_km: Math.round(dist * 100) / 100, minutes: mins });
                totalMinutes += mins;
            }
            return { legs, totalMinutes };
        },

        _renderRouteResult(orderedApts, legs, totalMinutes, unoptimized = false, startLocation = null, animate = false, roadGeometry = null) {
            this._currentApts = orderedApts;
            this._currentStartLocation = startLocation;

            mapManager.clearPins();
            if (startLocation && startLocation.lat != null) {
                mapManager.addHomePin(startLocation.lat, startLocation.lon, startLocation.address);
            }
            orderedApts.forEach((apt, i) => {
                if (apt.lat != null && apt.lon != null) {
                    mapManager.addPin(apt.lat, apt.lon, `
                        <strong>${i + 1}. ${utils.escapeHtml(apt.patient_name)}</strong><br>
                        ${utils.formatTime(apt.time)} · ${utils.visitTypeLabel(apt.visit_type)}
                    `, i + 1);
                }
            });

            if (!unoptimized) mapManager.drawRoute(orderedApts, startLocation, roadGeometry);

            let homeLeg = null;
            let returnLeg = null;
            let aptLegs = legs || [];
            if (aptLegs.length > 0 && aptLegs[0].from_id === 'home') {
                homeLeg = aptLegs[0];
                aptLegs = aptLegs.slice(1);
            }
            if (aptLegs.length > 0 && aptLegs[aptLegs.length - 1].to_id === 'home') {
                returnLeg = aptLegs[aptLegs.length - 1];
                aptLegs = aptLegs.slice(0, -1);
            }

            const listCard = document.getElementById('route-list-card');
            if (!listCard) return;

            const geocoded = orderedApts.filter(a => a.lat != null).length;

            const homeSection = startLocation ? `
                <div class="route-stop route-stop-home">
                    <div class="route-stop-number" style="background:var(--text-dark);font-size:1rem;">🏠</div>
                    <div style="flex:1;">
                        <strong>${t('stop_starting')}</strong>
                        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">${utils.escapeHtml(startLocation.address || '')}</div>
                        ${homeLeg ? `<div class="travel-segment" style="margin-left:0;margin-top:6px;">${t('to_first_stop', homeLeg.minutes, homeLeg.distance_km)}</div>` : ''}
                    </div>
                </div>` : '';

            listCard.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <h2 style="margin:0;">${unoptimized ? t('apts_label') : t('optimized_route')}</h2>
                    <span id="route-total-time" style="font-size:0.85rem;color:var(--text-muted);">${!unoptimized && totalMinutes > 0 ? t('total_travel', totalMinutes) : ''}</span>
                </div>
                ${geocoded < orderedApts.length ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">${t('no_location_warn_route', orderedApts.length - geocoded)}</div>` : ''}
                ${orderedApts.length === 0 ? `<div class="empty-state"><p>${t('no_apts_empty')}</p></div>` : `
                    <div id="route-stops-list">
                        ${homeSection}
                        ${orderedApts.map((apt, i) => {
                            const leg = aptLegs[i - 1];
                            const travelDiv = leg ? `<div class="travel-segment">${t('travel_leg', leg.minutes, leg.distance_km)}</div>` : '';
                            const animStyle = animate ? `animation: slideInLeft 0.3s ease both; animation-delay: ${i * 60}ms;` : '';
                            return `${travelDiv}
                            <div class="route-stop" draggable="true" data-apt-idx="${i}" style="${animStyle}">
                                <div class="drag-handle" title="Drag to reorder">⠿</div>
                                <div class="route-stop-number">${i + 1}</div>
                                <div style="flex:1;">
                                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                        <strong>${utils.escapeHtml(apt.patient_name)}</strong>
                                        <span style="font-size:0.82rem;color:var(--text-muted);">${utils.formatTime(apt.time)}</span>
                                    </div>
                                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">${utils.escapeHtml(apt.address || '')}</div>
                                    <div style="margin-top:4px;">${utils.visitBadge(apt.visit_type)}</div>
                                </div>
                            </div>`;
                        }).join('')}
                        ${startLocation && returnLeg ? `
                            <div class="travel-segment">${t('travel_leg', returnLeg.minutes, returnLeg.distance_km)}</div>
                            <div class="route-stop route-stop-home">
                                <div class="route-stop-number" style="background:var(--text-dark);font-size:1rem;">🏠</div>
                                <div style="flex:1;">
                                    <strong>${t('return_home')}</strong>
                                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">${utils.escapeHtml(startLocation.address || '')}</div>
                                </div>
                            </div>` : ''}
                    </div>
                `}
            `;
        },

        _attachDragHandlers() {
            const listCard = document.getElementById('route-list-card');
            if (!listCard) return;

            let dragSrcIdx = null;

            listCard.addEventListener('dragstart', e => {
                const stop = e.target.closest('.route-stop[data-apt-idx]');
                if (!stop) return;
                dragSrcIdx = parseInt(stop.dataset.aptIdx);
                stop.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            listCard.addEventListener('dragover', e => {
                const stop = e.target.closest('.route-stop[data-apt-idx]');
                if (!stop || dragSrcIdx === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                listCard.querySelectorAll('.route-stop[data-apt-idx]').forEach(el => el.classList.remove('drag-over'));
                if (parseInt(stop.dataset.aptIdx) !== dragSrcIdx) stop.classList.add('drag-over');
            });

            listCard.addEventListener('dragleave', e => {
                const stop = e.target.closest('.route-stop[data-apt-idx]');
                if (stop) stop.classList.remove('drag-over');
            });

            listCard.addEventListener('drop', e => {
                const stop = e.target.closest('.route-stop[data-apt-idx]');
                if (!stop || dragSrcIdx === null) return;
                e.preventDefault();
                const dropIdx = parseInt(stop.dataset.aptIdx);
                if (dropIdx === dragSrcIdx) return;

                const apts = [...this._currentApts];
                const [moved] = apts.splice(dragSrcIdx, 1);
                apts.splice(dropIdx, 0, moved);

                const { legs, totalMinutes } = this._recalcLegs(apts, this._currentStartLocation);
                this._renderRouteResult(apts, legs, totalMinutes, false, this._currentStartLocation, false);

                api.routes.save(state.routeDate, apts.map(a => a.id), totalMinutes).catch(console.error);

                const home = this._currentStartLocation;
                const dragWaypoints = [];
                if (home?.lat != null) dragWaypoints.push(home);
                apts.filter(a => a.lat != null).forEach(a => dragWaypoints.push({ lat: a.lat, lon: a.lon }));
                if (home?.lat != null) dragWaypoints.push(home);
                utils.fetchOSRMGeometry(dragWaypoints).then(geo => {
                    if (geo) mapManager.drawRoute(apts, home, geo);
                });
            });

            listCard.addEventListener('dragend', () => {
                listCard.querySelectorAll('.route-stop').forEach(el => el.classList.remove('dragging', 'drag-over'));
                dragSrcIdx = null;
            });
        },
    },

    // -------------------------------------------------------------------------
    // MOTHERS VIEW
    // -------------------------------------------------------------------------
    mothers: {
        async render() {
            const patients = await api.patients.list();

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);">${t('mothers_title')}</h1>
                        <p style="color:var(--text-muted);">${t('mothers_sub', patients.length)}</p>
                    </div>
                    <button class="btn-primary" id="btn-add-patient">${t('add_mother')}</button>
                </header>

                <div class="card" style="padding:0;overflow:hidden;">
                    ${patients.length === 0 ? `
                        <div class="empty-state" style="padding:3rem;">
                            <p>${t('no_patients')}</p>
                            <button class="btn-primary" id="empty-add-patient">${t('add_first_mother')}</button>
                        </div>
                    ` : `
                        <table class="patient-table">
                            <thead>
                                <tr>
                                    <th>${t('col_name')}</th>
                                    <th>${t('col_status')}</th>
                                    <th>${t('col_ga')}</th>
                                    <th>${t('col_due')}</th>
                                    <th>${t('col_phone')}</th>
                                    <th>${t('col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${patients.map(p => `
                                    <tr>
                                        <td>
                                            <strong>${utils.escapeHtml(p.name)}</strong>
                                            ${p.lat == null ? `<br><span style="font-size:0.72rem;color:var(--pending);">${t('no_location_warn')}</span>` : ''}
                                        </td>
                                        <td><span class="status-badge ${p.status}">${utils.statusLabel(p.status)}</span></td>
                                        <td class="${utils.isGAAlert(p.gestational_age_weeks) ? 'ga-alert' : ''}">${utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days)}</td>
                                        <td style="color:var(--text-muted);font-size:0.88rem;">${p.due_date || '—'}</td>
                                        <td style="color:var(--text-muted);font-size:0.88rem;">${utils.escapeHtml(p.phone) || '—'}</td>
                                        <td>
                                            <div style="display:flex;gap:0.5rem;">
                                                <button class="btn-secondary btn-sm edit-patient" data-id="${p.id}">${t('edit_btn')}</button>
                                                <button class="btn-danger btn-sm discharge-patient" data-id="${p.id}" data-name="${utils.escapeHtml(p.name)}">${t('discharge_btn')}</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            `;

            document.getElementById('btn-add-patient').addEventListener('click', () => modals.patient(null, () => views.mothers.render()));
            document.getElementById('empty-add-patient')?.addEventListener('click', () => modals.patient(null, () => views.mothers.render()));

            document.querySelectorAll('.edit-patient').forEach(btn => {
                const patient = patients.find(p => p.id === btn.dataset.id);
                btn.addEventListener('click', () => modals.patient(patient, () => views.mothers.render()));
            });

            document.querySelectorAll('.discharge-patient').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!await utils.confirm(t('discharge_confirm', btn.dataset.name))) return;
                    try {
                        await api.patients.delete(btn.dataset.id);
                        utils.showToast(t('discharged_toast', btn.dataset.name));
                        views.mothers.render();
                    } catch (err) {
                        utils.showToast(err.message, 'error');
                    }
                });
            });
        },
    },
};

// =============================================================================
// MODALS
// =============================================================================
const modals = {
    _close() {
        document.querySelector('.modal-overlay')?.remove();
    },

    // -------------------------------------------------------------------------
    // Patient modal (add / edit)
    // -------------------------------------------------------------------------
    async patient(existingPatient = null, onSuccess = null) {
        const p = existingPatient || {};
        const isEdit = !!existingPatient;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h2>${isEdit ? t('edit_mother') : t('add_mother_modal')}</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>${t('label_fullname')}</label>
                        <input type="text" id="f-name" class="input-field" value="${utils.escapeHtml(p.name || '')}" placeholder="${t('placeholder_name')}">
                    </div>
                    <div class="form-group full-width">
                        <label>${t('label_address')} <span style="font-size:0.75rem;font-weight:400;">${t('label_address_hint')}</span></label>
                        <input type="text" id="f-address" class="input-field" value="${utils.escapeHtml(p.address || '')}" placeholder="${t('placeholder_address')}">
                    </div>
                    <div class="form-group">
                        <label>${t('label_phone')}</label>
                        <input type="tel" id="f-phone" class="input-field" value="${utils.escapeHtml(p.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>${t('label_status')}</label>
                        <select id="f-status" class="input-field">
                            <option value="active" ${p.status === 'active' || !p.status ? 'selected' : ''}>${t('opt_pregnant')}</option>
                            <option value="postpartum" ${p.status === 'postpartum' ? 'selected' : ''}>${t('opt_postpartum')}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('label_ga_weeks')}</label>
                        <input type="number" id="f-ga-weeks" class="input-field" value="${p.gestational_age_weeks || 0}" min="0" max="45">
                    </div>
                    <div class="form-group">
                        <label>${t('label_ga_days')}</label>
                        <input type="number" id="f-ga-days" class="input-field" value="${p.gestational_age_days || 0}" min="0" max="6">
                    </div>
                    <div class="form-group">
                        <label>${t('label_due_date')}</label>
                        <input type="date" id="f-due" class="input-field" value="${p.due_date || ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>${t('label_notes')}</label>
                        <textarea id="f-notes" class="input-field" rows="3" style="resize:vertical;">${utils.escapeHtml(p.notes || '')}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" id="modal-cancel">${t('cancel_btn')}</button>
                    <button class="btn-primary" id="modal-save">
                        ${isEdit ? t('save_changes') : t('add_mother_btn')}
                    </button>
                </div>
                <div id="modal-status" style="text-align:center;font-size:0.82rem;color:var(--text-muted);margin-top:0.5rem;"></div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById('modal-cancel').addEventListener('click', () => modals._close());
        overlay.addEventListener('click', e => { if (e.target === overlay) modals._close(); });

        document.getElementById('modal-save').addEventListener('click', async () => {
            const name    = document.getElementById('f-name').value.trim();
            const address = document.getElementById('f-address').value.trim();
            if (!name || !address) {
                utils.showToast(t('name_address_required'), 'error');
                return;
            }

            const btn = document.getElementById('modal-save');
            const statusEl = document.getElementById('modal-status');
            btn.disabled = true;
            btn.textContent = isEdit ? t('saving') : t('adding');
            statusEl.textContent = t('geocoding_address');

            const data = {
                name, address,
                phone: document.getElementById('f-phone').value.trim(),
                status: document.getElementById('f-status').value,
                gestational_age_weeks: parseInt(document.getElementById('f-ga-weeks').value) || 0,
                gestational_age_days: parseInt(document.getElementById('f-ga-days').value) || 0,
                due_date: document.getElementById('f-due').value,
                notes: document.getElementById('f-notes').value.trim(),
            };

            try {
                if (isEdit) {
                    await api.patients.update(p.id, data);
                    utils.showToast(t('changes_saved'));
                } else {
                    await api.patients.create(data);
                    utils.showToast(t('mother_added'));
                }
                modals._close();
                if (onSuccess) onSuccess();
            } catch (err) {
                utils.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = isEdit ? t('save_changes') : t('add_mother_btn');
                statusEl.textContent = '';
            }
        });
    },

    // -------------------------------------------------------------------------
    // Appointment modal (add / edit)
    // -------------------------------------------------------------------------
    async appointment(prefillDate = null, existingApt = null, onSuccess = null) {
        let patients;
        try {
            patients = await api.patients.list();
        } catch (_) {
            patients = [];
        }

        const apt = existingApt || {};
        const isEdit = !!existingApt;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h2>${isEdit ? t('edit_apt') : t('new_apt')}</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>${t('label_patient')}</label>
                        <select id="f-patient" class="input-field">
                            <option value="">${t('select_patient')}</option>
                            ${patients.map(p => `<option value="${p.id}" ${apt.patient_id === p.id ? 'selected' : ''}>${utils.escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('label_date')}</label>
                        <input type="date" id="f-date" class="input-field" value="${apt.date || prefillDate || utils.today()}">
                    </div>
                    <div class="form-group">
                        <label>${t('label_time')}</label>
                        <input type="time" id="f-time" class="input-field" value="${apt.time || '09:00'}">
                    </div>
                    <div class="form-group full-width">
                        <label>${t('label_visit_type')}</label>
                        <select id="f-visit-type" class="input-field">
                            <option value="prenatal"  ${apt.visit_type === 'prenatal'  || !apt.visit_type ? 'selected' : ''}>${t('type_prenatal')}</option>
                            <option value="birth"     ${apt.visit_type === 'birth'     ? 'selected' : ''}>${t('type_birth')}</option>
                            <option value="postnatal" ${apt.visit_type === 'postnatal' ? 'selected' : ''}>${t('type_postnatal')}</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>${t('label_notes')}</label>
                        <textarea id="f-apt-notes" class="input-field" rows="2" style="resize:vertical;">${utils.escapeHtml(apt.notes || '')}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    ${isEdit ? `<button class="btn-danger" id="modal-cancel-apt">${t('cancel_apt_btn')}</button>` : ''}
                    <button class="btn-secondary" id="modal-close">${t('close_btn')}</button>
                    <button class="btn-primary" id="modal-save-apt">${isEdit ? t('save_changes') : t('schedule_btn')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById('modal-close').addEventListener('click', () => modals._close());
        overlay.addEventListener('click', e => { if (e.target === overlay) modals._close(); });

        document.getElementById('modal-cancel-apt')?.addEventListener('click', async () => {
            if (!await utils.confirm(t('cancel_apt_confirm'))) return;
            try {
                await api.appointments.cancel(apt.id);
                utils.showToast(t('apt_cancelled'));
                modals._close();
                if (onSuccess) onSuccess();
            } catch (err) {
                utils.showToast(err.message, 'error');
            }
        });

        document.getElementById('modal-save-apt').addEventListener('click', async () => {
            const patient_id  = document.getElementById('f-patient').value;
            const date        = document.getElementById('f-date').value;
            const time        = document.getElementById('f-time').value;
            const visit_type  = document.getElementById('f-visit-type').value;

            if (!patient_id || !date || !time) {
                utils.showToast(t('patient_date_time_required'), 'error');
                return;
            }

            const btn = document.getElementById('modal-save-apt');
            btn.disabled = true;
            btn.textContent = t('saving_apt');

            const data = {
                patient_id, date, time, visit_type,
                notes: document.getElementById('f-apt-notes').value.trim(),
            };

            try {
                if (isEdit) {
                    await api.appointments.update(apt.id, data);
                    utils.showToast(t('apt_updated'));
                } else {
                    await api.appointments.create(data);
                    utils.showToast(t('apt_scheduled'));
                }
                modals._close();
                if (onSuccess) onSuccess();
            } catch (err) {
                utils.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = isEdit ? t('save_changes') : t('schedule_btn');
            }
        });
    },
};

// =============================================================================
// INIT
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    router.init();
    updateNav();
    updateBanner();

    document.getElementById('lang-toggle').addEventListener('click', () => {
        state.lang = state.lang === 'de' ? 'en' : 'de';
        localStorage.setItem('juno_lang', state.lang);
        updateNav();
        updateBanner();
        // Re-render current view in new language
        if (state.currentView) {
            router.navigateTo(state.currentView);
        }
    });

    router.navigateTo('dashboard');
});
