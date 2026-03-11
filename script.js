// Juno Application — SPA Frontend
// Architecture: CONFIG → state → api → router → utils → mapManager → views → modals → init

// =============================================================================
// CONFIG
// =============================================================================
const CONFIG = {
    MAP_DEFAULT: [51.1657, 10.4515], // Center of Germany
    MAP_ZOOM: 6,
    MAP_ZOOM_CITY: 13,
    ROUTE_COLOR: '#A8BA9A',
};

// =============================================================================
// STATE
// =============================================================================
const state = {
    currentView: null,
    calendarMonth: new Date(),
    routeDate: null,
    leafletMap: null,
};

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
        optimize: (date)  => api.post('/api/routes/optimize', { date }),
        get:      (date)  => api.get(`/api/routes/${date}`),
    },
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
        const d = new Date(iso + 'T12:00:00');
        return d.toLocaleDateString('en-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },

    formatMonthYear(d) {
        return d.toLocaleDateString('en-DE', { month: 'long', year: 'numeric' });
    },

    formatTime(hhmm) {
        if (!hhmm) return '';
        const [h, m] = hhmm.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    },

    gaLabel(weeks, days) {
        return `${weeks}w ${days}d`;
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
        return `<span class="visit-badge ${type}">${type}</span>`;
    },

    escapeHtml(str) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(str || ''));
        return d.innerHTML;
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

    addPin(lat, lon, popupHtml) {
        if (!this._map) return;
        const marker = L.marker([lat, lon]).bindPopup(popupHtml).addTo(this._map);
        this._markers.push(marker);
        return marker;
    },

    drawRoute(orderedApts) {
        if (!this._map) return;
        const coords = orderedApts
            .filter(a => a.lat != null && a.lon != null)
            .map(a => [a.lat, a.lon]);

        if (coords.length === 0) return;

        if (this._polyline) {
            this._polyline.remove();
        }
        this._polyline = L.polyline(coords, {
            color: CONFIG.ROUTE_COLOR,
            weight: 3,
            opacity: 0.85,
        }).addTo(this._map);

        // Fit bounds to all visible points
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
        // Destroy map when leaving routes view
        if (state.currentView === 'routes') {
            mapManager.destroy();
        }

        state.currentView = view;

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.id === `nav-${view}`);
        });

        // Render view
        const appView = document.getElementById('app-view');
        appView.innerHTML = '<div class="loading-spinner">Loading…</div>';

        const viewMap = {
            dashboard: () => views.dashboard.render(params),
            calendar:  () => views.calendar.render(params),
            routes:    () => views.routeView.render(params),
            mothers:   () => views.mothers.render(params),
        };

        if (viewMap[view]) {
            viewMap[view]().catch(err => {
                appView.innerHTML = `<div class="loading-spinner" style="color:var(--pending)">Error: ${utils.escapeHtml(err.message)}</div>`;
                console.error(err);
            });
        }
    },

    init() {
        document.querySelectorAll('.nav-item[id^="nav-"]').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const view = item.id.replace('nav-', '');
                router.navigateTo(view);
            });
        });
    },
};

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

            // Fetch week data for mini-calendar
            const month = utils.monthKey(new Date());
            const monthData = await api.appointments.byMonth(month);
            const countByDay = {};
            monthData.forEach(r => { countByDay[r.date] = r.count; });

            // Build week strip (today ± 3 days)
            const today = utils.today();
            const weekDays = [];
            for (let i = -3; i <= 3; i++) {
                const d = new Date(today + 'T12:00:00');
                d.setDate(d.getDate() + i);
                const iso = d.toISOString().slice(0, 10);
                weekDays.push({ iso, label: d.toLocaleDateString('en-DE', { weekday: 'short' }), day: d.getDate(), count: countByDay[iso] || 0 });
            }

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);margin-bottom:4px;">Welcome back, Clara</h1>
                        <p style="color:var(--text-muted);">${new Date().toLocaleDateString('en-DE', { weekday: 'long', day: 'numeric', month: 'long' })} · ${scheduled} visit${scheduled !== 1 ? 's' : ''} today</p>
                    </div>
                    <button class="btn-primary" id="dash-new-apt">+ New Appointment</button>
                </header>

                <div class="dashboard-grid">
                    <div class="metric-container">
                        <div class="metric-card">
                            <span>Active Births</span>
                            <strong>${activeBirths}</strong>
                        </div>
                        <div class="metric-card">
                            <span>Visits Today</span>
                            <strong>${String(scheduled).padStart(2,'0')}</strong>
                        </div>
                        <div class="metric-card ${gaAlerts.length > 0 ? 'ga-alert' : ''}">
                            <span>GA Alerts (≥40w)</span>
                            <strong>${gaAlerts.length}</strong>
                        </div>
                    </div>

                    <section class="card hero-card" style="grid-column:span 12;">
                        <div class="hero-content">
                            <h2>Your Daily Pulse</h2>
                            <p>All routines optimized for minimum travel time.</p>
                        </div>
                    </section>

                    <section class="card" style="grid-column:span 7;">
                        <h2>This Week</h2>
                        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:1rem;">
                            ${weekDays.map(d => `
                                <div class="day-cell ${d.iso === today ? 'today' : ''} ${d.count >= 3 ? 'heavy-load' : d.count >= 1 ? 'active-load' : ''}"
                                     style="cursor:pointer;flex-direction:column;gap:4px;display:flex;align-items:center;justify-content:center;"
                                     data-date="${d.iso}">
                                    <span style="font-size:0.65rem;opacity:0.7;">${d.label}</span>
                                    <span>${d.day}</span>
                                    ${d.count > 0 ? `<span style="font-size:0.65rem;">${d.count}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </section>

                    <section class="card" style="grid-column:span 5;">
                        <h2>Quick Actions</h2>
                        <ul style="list-style:none;display:flex;flex-direction:column;gap:4px;margin-top:0.75rem;">
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);cursor:pointer;color:var(--text-dark);" id="qa-plan-route">
                                🗺 Plan today's route
                            </li>
                            ${gaAlerts.length > 0 ? gaAlerts.map(p => `
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);" class="ga-alert">
                                ⚠️ GA alert: ${utils.escapeHtml(p.name)} (${utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days)})
                            </li>`).join('') : `
                            <li style="padding:10px 0;border-bottom:1px solid var(--grey-light);color:var(--text-muted);">
                                ✓ No GA alerts today
                            </li>`}
                            <li style="padding:10px 0;cursor:pointer;color:var(--text-dark);" id="qa-view-mothers">
                                👩 View all mothers (${patients.length})
                            </li>
                        </ul>
                    </section>
                </div>
            `;

            document.getElementById('dash-new-apt').addEventListener('click', () => modals.appointment(utils.today()));
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
            // If a specific date is passed, go to day detail directly
            if (params.date) {
                return views.calendar.renderDayDetail(params.date);
            }

            // Month view
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

            // Monday-based offset (0=Mon, 6=Sun)
            let startOffset = firstDay.getDay() - 1;
            if (startOffset < 0) startOffset = 6;

            const appView = document.getElementById('app-view');
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1 style="color:var(--text-dark);">Calendar</h1>
                        <p style="color:var(--text-muted);">Click a day to view or schedule appointments</p>
                    </div>
                    <button class="btn-primary" id="cal-new-apt">+ New Appointment</button>
                </header>

                <div class="card">
                    <div class="calendar-nav">
                        <button id="cal-prev">‹ Prev</button>
                        <h2 style="margin:0;">${utils.formatMonthYear(state.calendarMonth)}</h2>
                        <button id="cal-next">Next ›</button>
                    </div>

                    <div class="calendar-weekdays">
                        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="weekday-label">${d}</div>`).join('')}
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
                                count >= 3 ? 'heavy-load' : count >= 1 ? 'active-load' : '',
                                iso === today ? 'today' : '',
                            ].filter(Boolean).join(' ');
                            return `<div class="day-cell ${cls}" data-date="${iso}" title="${count} appointment${count !== 1 ? 's' : ''}">
                                ${day}
                                ${count > 0 ? `<span style="font-size:0.6rem;display:block;opacity:0.8;">${count}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;

            document.getElementById('cal-prev').addEventListener('click', () => {
                state.calendarMonth.setMonth(state.calendarMonth.getMonth() - 1);
                views.calendar.render();
            });
            document.getElementById('cal-next').addEventListener('click', () => {
                state.calendarMonth.setMonth(state.calendarMonth.getMonth() + 1);
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
                        <button class="day-detail-back" id="back-to-month">← Back to Calendar</button>
                        <h1 style="color:var(--text-dark);">${utils.formatDate(isoDate)}</h1>
                        <p style="color:var(--text-muted);">${apts.length} appointment${apts.length !== 1 ? 's' : ''} scheduled</p>
                    </div>
                    <div style="display:flex;gap:0.75rem;">
                        <button class="btn-secondary" id="btn-view-route">View Route</button>
                        <button class="btn-primary" id="btn-add-apt">+ Add Appointment</button>
                    </div>
                </header>

                <div style="display:grid;grid-template-columns:1fr;gap:1.5rem;max-width:720px;">
                    <section class="card">
                        <h2>Appointments</h2>
                        <div id="apt-list" style="margin-top:1rem;">
                            ${apts.length === 0 ? `
                                <div class="empty-state">
                                    <p>No appointments scheduled for this day.</p>
                                    <button class="btn-primary" id="empty-add-apt">+ Add Appointment</button>
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

            // Click apt card to edit
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
                        <h1 style="color:var(--text-dark);">Route Planner</h1>
                        <p style="color:var(--text-muted);">Optimize your visit order to save travel time</p>
                    </div>
                </header>

                <div class="route-controls" style="margin-bottom:1.5rem;">
                    <input type="date" id="route-date-picker" value="${date}" class="input-field" style="width:180px;">
                    <button class="btn-primary" id="btn-optimize">Optimize Route</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;">
                    <div>
                        <div class="card" style="padding:0;overflow:hidden;">
                            <div id="map"></div>
                        </div>
                    </div>
                    <div>
                        <div class="card" id="route-list-card">
                            <div class="loading-spinner">Select a date and click Optimize Route</div>
                        </div>
                    </div>
                </div>
            `;

            // Initialize map
            mapManager.init('map');

            // Try to load any previously saved route
            try {
                const saved = await api.routes.get(date);
                // If there's a saved route, fetch appointments and render
                const apts = await api.appointments.byDate(date);
                if (apts.length > 0) {
                    // Reconstruct ordered list from saved IDs
                    const aptById = {};
                    apts.forEach(a => { aptById[a.id] = a; });
                    const ordered = (saved.ordered_appointment_ids || [])
                        .map(id => aptById[id])
                        .filter(Boolean);
                    views.routeView._renderRouteResult(ordered, [], saved.estimated_travel_minutes);
                }
            } catch (_) {
                // No saved route — just show the map empty
                const apts = await api.appointments.byDate(date);
                if (apts.length > 0) {
                    views.routeView._renderRouteResult(apts, [], 0, true);
                } else {
                    document.getElementById('route-list-card').innerHTML = `
                        <div class="empty-state">
                            <p>No appointments scheduled for this date.</p>
                            <button class="btn-secondary" id="go-calendar-btn">Go to Calendar</button>
                        </div>`;
                    document.getElementById('go-calendar-btn')?.addEventListener('click', () => router.navigateTo('calendar'));
                }
            }

            document.getElementById('route-date-picker').addEventListener('change', e => {
                state.routeDate = e.target.value;
                router.navigateTo('routes', { date: e.target.value });
            });

            document.getElementById('btn-optimize').addEventListener('click', async () => {
                const btn = document.getElementById('btn-optimize');
                btn.textContent = 'Optimizing…';
                btn.disabled = true;
                try {
                    const result = await api.routes.optimize(state.routeDate);
                    mapManager.clearPins();
                    views.routeView._renderRouteResult(result.ordered_appointments, result.legs, result.total_travel_minutes);
                    utils.showToast(`Route optimized — ${result.total_travel_minutes} min total travel`);
                } catch (err) {
                    utils.showToast(err.message, 'error');
                } finally {
                    const b = document.getElementById('btn-optimize');
                    if (b) { b.textContent = 'Optimize Route'; b.disabled = false; }
                }
            });
        },

        _renderRouteResult(orderedApts, legs, totalMinutes, unoptimized = false) {
            // Add map pins
            mapManager.clearPins();
            orderedApts.forEach((apt, i) => {
                if (apt.lat != null && apt.lon != null) {
                    mapManager.addPin(apt.lat, apt.lon, `
                        <strong>${i + 1}. ${utils.escapeHtml(apt.patient_name)}</strong><br>
                        ${utils.formatTime(apt.time)} · ${apt.visit_type}
                    `);
                }
            });
            if (!unoptimized) mapManager.drawRoute(orderedApts);

            // Render stop list
            const listCard = document.getElementById('route-list-card');
            if (!listCard) return;

            const geocoded = orderedApts.filter(a => a.lat != null).length;

            listCard.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <h2 style="margin:0;">${unoptimized ? 'Appointments' : 'Optimized Route'}</h2>
                    ${!unoptimized && totalMinutes > 0 ? `<span style="font-size:0.85rem;color:var(--text-muted);">~${totalMinutes} min transit</span>` : ''}
                </div>
                ${geocoded < orderedApts.length ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">⚠️ ${orderedApts.length - geocoded} patient${orderedApts.length - geocoded !== 1 ? 's' : ''} without map location — shown at end</div>` : ''}
                ${orderedApts.length === 0 ? '<div class="empty-state"><p>No appointments for this date.</p></div>' :
                    orderedApts.map((apt, i) => {
                        const leg = legs && legs[i - 1];
                        const travelDiv = leg ? `<div class="travel-segment">↑ ${leg.minutes} min · ${leg.distance_km} km</div>` : '';
                        return `${travelDiv}
                        <div class="route-stop">
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
                    }).join('')
                }
            `;
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
                        <h1 style="color:var(--text-dark);">Mothers</h1>
                        <p style="color:var(--text-muted);">${patients.length} active patient${patients.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button class="btn-primary" id="btn-add-patient">+ Add Mother</button>
                </header>

                <div class="card" style="padding:0;overflow:hidden;">
                    ${patients.length === 0 ? `
                        <div class="empty-state" style="padding:3rem;">
                            <p>No patients yet.</p>
                            <button class="btn-primary" id="empty-add-patient">+ Add Your First Mother</button>
                        </div>
                    ` : `
                        <table class="patient-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>GA</th>
                                    <th>Due Date</th>
                                    <th>Phone</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${patients.map(p => `
                                    <tr>
                                        <td>
                                            <strong>${utils.escapeHtml(p.name)}</strong>
                                            ${p.lat == null ? '<br><span style="font-size:0.72rem;color:var(--pending);">⚠ No map location</span>' : ''}
                                        </td>
                                        <td><span class="status-badge ${p.status}">${p.status}</span></td>
                                        <td class="${utils.isGAAlert(p.gestational_age_weeks) ? 'ga-alert' : ''}">${utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days)}</td>
                                        <td style="color:var(--text-muted);font-size:0.88rem;">${p.due_date || '—'}</td>
                                        <td style="color:var(--text-muted);font-size:0.88rem;">${utils.escapeHtml(p.phone) || '—'}</td>
                                        <td>
                                            <div style="display:flex;gap:0.5rem;">
                                                <button class="btn-secondary btn-sm edit-patient" data-id="${p.id}">Edit</button>
                                                <button class="btn-danger btn-sm discharge-patient" data-id="${p.id}" data-name="${utils.escapeHtml(p.name)}">Discharge</button>
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
                    if (!confirm(`Discharge ${btn.dataset.name}? This will remove them from your active list.`)) return;
                    try {
                        await api.patients.delete(btn.dataset.id);
                        utils.showToast(`${btn.dataset.name} discharged`);
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
                <h2>${isEdit ? 'Edit Mother' : 'Add Mother'}</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Full Name *</label>
                        <input type="text" id="f-name" class="input-field" value="${utils.escapeHtml(p.name || '')}" placeholder="e.g. Maria Schmidt">
                    </div>
                    <div class="form-group full-width">
                        <label>Address * <span style="font-size:0.75rem;font-weight:400;">(used for map & route)</span></label>
                        <input type="text" id="f-address" class="input-field" value="${utils.escapeHtml(p.address || '')}" placeholder="e.g. Musterstr. 1, 10115 Berlin">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="f-phone" class="input-field" value="${utils.escapeHtml(p.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="f-status" class="input-field">
                            <option value="active" ${p.status === 'active' || !p.status ? 'selected' : ''}>Active (pregnant)</option>
                            <option value="postpartum" ${p.status === 'postpartum' ? 'selected' : ''}>Postpartum</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>GA Weeks</label>
                        <input type="number" id="f-ga-weeks" class="input-field" value="${p.gestational_age_weeks || 0}" min="0" max="45">
                    </div>
                    <div class="form-group">
                        <label>GA Days</label>
                        <input type="number" id="f-ga-days" class="input-field" value="${p.gestational_age_days || 0}" min="0" max="6">
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="f-due" class="input-field" value="${p.due_date || ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea id="f-notes" class="input-field" rows="3" style="resize:vertical;">${utils.escapeHtml(p.notes || '')}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" id="modal-cancel">Cancel</button>
                    <button class="btn-primary" id="modal-save">
                        ${isEdit ? 'Save Changes' : 'Add Mother'}
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
                utils.showToast('Name and address are required', 'error');
                return;
            }

            const btn = document.getElementById('modal-save');
            const statusEl = document.getElementById('modal-status');
            btn.disabled = true;
            btn.textContent = isEdit ? 'Saving…' : 'Adding…';
            statusEl.textContent = 'Geocoding address…';

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
                    utils.showToast('Changes saved');
                } else {
                    await api.patients.create(data);
                    utils.showToast('Mother added');
                }
                modals._close();
                if (onSuccess) onSuccess();
            } catch (err) {
                utils.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Add Mother';
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
                <h2>${isEdit ? 'Edit Appointment' : 'New Appointment'}</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Patient *</label>
                        <select id="f-patient" class="input-field">
                            <option value="">— Select a patient —</option>
                            ${patients.map(p => `<option value="${p.id}" ${apt.patient_id === p.id ? 'selected' : ''}>${utils.escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="f-date" class="input-field" value="${apt.date || prefillDate || utils.today()}">
                    </div>
                    <div class="form-group">
                        <label>Time *</label>
                        <input type="time" id="f-time" class="input-field" value="${apt.time || '09:00'}">
                    </div>
                    <div class="form-group full-width">
                        <label>Visit Type *</label>
                        <select id="f-visit-type" class="input-field">
                            <option value="prenatal"  ${apt.visit_type === 'prenatal'  || !apt.visit_type ? 'selected' : ''}>Prenatal</option>
                            <option value="birth"     ${apt.visit_type === 'birth'     ? 'selected' : ''}>Birth</option>
                            <option value="postnatal" ${apt.visit_type === 'postnatal' ? 'selected' : ''}>Postnatal</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea id="f-apt-notes" class="input-field" rows="2" style="resize:vertical;">${utils.escapeHtml(apt.notes || '')}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    ${isEdit ? '<button class="btn-danger" id="modal-cancel-apt">Cancel Appointment</button>' : ''}
                    <button class="btn-secondary" id="modal-close">Close</button>
                    <button class="btn-primary" id="modal-save-apt">${isEdit ? 'Save Changes' : 'Schedule'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById('modal-close').addEventListener('click', () => modals._close());
        overlay.addEventListener('click', e => { if (e.target === overlay) modals._close(); });

        document.getElementById('modal-cancel-apt')?.addEventListener('click', async () => {
            if (!confirm('Cancel this appointment?')) return;
            try {
                await api.appointments.cancel(apt.id);
                utils.showToast('Appointment cancelled');
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
                utils.showToast('Patient, date, and time are required', 'error');
                return;
            }

            const btn = document.getElementById('modal-save-apt');
            btn.disabled = true;
            btn.textContent = 'Saving…';

            const data = {
                patient_id, date, time, visit_type,
                notes: document.getElementById('f-apt-notes').value.trim(),
            };

            try {
                if (isEdit) {
                    await api.appointments.update(apt.id, data);
                    utils.showToast('Appointment updated');
                } else {
                    await api.appointments.create(data);
                    utils.showToast('Appointment scheduled');
                }
                modals._close();
                if (onSuccess) onSuccess();
            } catch (err) {
                utils.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Schedule';
            }
        });
    },
};

// =============================================================================
// INIT
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    router.init();
    router.navigateTo('dashboard');
});
