// -----------------------------------------------------------------------------
// js/views/routes.js
//
// Routes view: date picker + home-location setter + optimize button + Leaflet map.
// Supports drag-to-reorder of appointments with:
//   - Travel time/distance between stops
//   - Time-window violation detection (cards turn red)
//   - Auto-save of reordered route to server
//
// State dependencies (from state.js):
//   state.routeDate      — currently selected date (drives map + sidebar)
//   state.homeLocation   — {address, lat, lon} persisted to localStorage as 'juno_home'
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { utils } from '../utils.js';
import { state } from '../state.js';
import { mapManager } from '../map.js';

export const routesView = {
    // Mutable ordered list of appointment dicts for the current day
    _orderedApts: [],
    // Cached legs from server optimization (used until user drags)
    _serverLegs: [],
    // Drag state
    _dragIdx: null,

    async render(params = {}) {
        const date = params.date || utils.today();
        state.routeDate = date;

        const appView = document.getElementById('app-view');
        appView.innerHTML = `
            <header class="header">
                <div>
                    <h1>${t('route_title')}</h1>
                    <p style="color:var(--text-muted);">${t('route_sub')}</p>
                </div>
            </header>

            <div class="card home-card">
                <div class="home-card-header">
                    <span class="stop-icon stop-icon-home">🏠</span>
                    <strong>${t('starting_point')}</strong>
                    ${state.homeLocation ? `<span class="home-card-addr">${utils.escapeHtml(state.homeLocation.address)}</span>` : ''}
                </div>
                <div class="home-input-row">
                    <input type="text" id="home-address" placeholder="${t('home_placeholder')}" value="${state.homeLocation?.address || ''}">
                    <button class="btn-secondary" id="set-home">${t('set_btn')}</button>
                    ${state.homeLocation ? `<button class="btn-danger-outline" id="clear-home">${t('clear_btn')}</button>` : ''}
                </div>
            </div>

            <div class="route-controls-bar">
                <input type="date" id="route-date" value="${date}" class="route-date-input">
                <button class="btn-primary" id="optimize-route">${t('optimize_btn')}</button>
            </div>

            <div class="route-lower-grid">
                <div id="route-map" class="card map-container"></div>
                <div id="route-list-container" class="card list-card">
                    <div class="loading-spinner">${t('loading')}</div>
                </div>
            </div>
        `;

        mapManager.init('route-map');
        this._loadRouteData(date);
        this._attachEvents();
    },

    async _loadRouteData(date) {
        const container = document.getElementById('route-list-container');
        try {
            const apts = await api.appointments.byDate(date);
            this._orderedApts = apts;
            this._serverLegs = [];
            this._renderDraggableList();
            this._updateMapFromOrder();
        } catch (err) {
            container.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
    },

    // ─── Schedule computation ─────────────────────────────────────────────
    // Given the current _orderedApts, compute estimated start/end times and
    // check time-window violations.
    _computeSchedule() {
        const apts = this._orderedApts;
        const schedule = [];

        for (let i = 0; i < apts.length; i++) {
            const apt = apts[i];
            let startMin;

            if (i === 0) {
                // First appointment starts at its scheduled time
                startMin = utils.timeToMinutes(apt.time);
            } else {
                const prev = apts[i - 1];
                const prevEntry = schedule[i - 1];
                const prevEnd = prevEntry.startMin + (prev.duration_minutes || 60);

                // Travel time between previous and current
                let travel = 0;
                if (prev.lat != null && apt.lat != null) {
                    travel = utils.travelMinutes(prev.lat, prev.lon, apt.lat, apt.lon);
                }

                const earliestArrival = prevEnd + travel;
                // Can't start before the appointment's scheduled time
                startMin = Math.max(earliestArrival, utils.timeToMinutes(apt.time));
            }

            const duration = apt.duration_minutes || 60;
            const endMin = startMin + duration;

            // Determine time-window violation
            let violated = false;
            if (apt.appointment_kind === 'flexible' && apt.window_end) {
                const windowEndMin = utils.timeToMinutes(apt.window_end);
                violated = endMin > windowEndMin;
            }
            // For fixed appointments, violation if start drifts from scheduled time
            if (apt.appointment_kind === 'fixed' || !apt.appointment_kind) {
                const scheduledStart = utils.timeToMinutes(apt.time);
                // Allow some tolerance (appointment can start late but we flag if >15min)
                violated = startMin > scheduledStart + 15;
            }

            schedule.push({ apt, startMin, endMin, violated });
        }

        return schedule;
    },

    // ─── Draggable list rendering ─────────────────────────────────────────
    _renderDraggableList() {
        const container = document.getElementById('route-list-container');
        if (!container) return;

        const schedule = this._computeSchedule();
        const apts = this._orderedApts;

        let totalTravelMin = 0;
        let warningCount = 0;

        // Build HTML
        let html = `<h3 style="padding:1rem 1rem 0;">${apts.length} ${t('appointments_title')}</h3>`;
        html += `<div class="route-apts" id="route-drag-list">`;

        // Home stop (if set)
        if (state.homeLocation) {
            html += `
                <div class="route-stop-home" style="margin:0.5rem;">
                    <div class="stop-icon stop-icon-home">🏠</div>
                    <span class="stop-home-label">${utils.escapeHtml(state.homeLocation.address || t('starting_point'))}</span>
                </div>`;

            // Travel from home to first stop
            if (apts.length > 0 && apts[0].lat != null && state.homeLocation.lat != null) {
                const travel = utils.travelMinutes(state.homeLocation.lat, state.homeLocation.lon, apts[0].lat, apts[0].lon);
                const dist = utils.haversineKm(state.homeLocation.lat, state.homeLocation.lon, apts[0].lat, apts[0].lon).toFixed(1);
                totalTravelMin += travel;
                html += this._travelConnectorHtml(travel, dist);
            }
        }

        schedule.forEach((entry, i) => {
            const { apt, startMin, endMin, violated } = entry;

            // Travel connector between appointments (not before first)
            if (i > 0) {
                const prev = apts[i - 1];
                if (prev.lat != null && apt.lat != null) {
                    const travel = utils.travelMinutes(prev.lat, prev.lon, apt.lat, apt.lon);
                    const dist = utils.haversineKm(prev.lat, prev.lon, apt.lat, apt.lon).toFixed(1);
                    totalTravelMin += travel;
                    html += this._travelConnectorHtml(travel, dist);
                } else {
                    html += `<div class="leg-connector"></div>`;
                }
            }

            if (violated) warningCount++;

            const windowLabel = apt.appointment_kind === 'flexible' && apt.window_end
                ? `<span class="rdc-badge rdc-badge-window">${utils.formatTime(apt.time)}–${utils.formatTime(apt.window_end)}</span>`
                : '';

            html += `
                <div class="route-drag-card${violated ? ' time-violation' : ''}"
                     draggable="true" data-order-idx="${i}">
                    <div class="drag-handle">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5"/>
                            <circle cx="15" cy="6" r="1.5"/>
                            <circle cx="9" cy="12" r="1.5"/>
                            <circle cx="15" cy="12" r="1.5"/>
                            <circle cx="9" cy="18" r="1.5"/>
                            <circle cx="15" cy="18" r="1.5"/>
                        </svg>
                    </div>
                    <div class="stop-icon stop-icon-num">${i + 1}</div>
                    <div class="rdc-info">
                        <div class="rdc-name">
                            ${utils.escapeHtml(apt.patient_name)}
                            <span class="violation-tag">${t('outside_window')}</span>
                        </div>
                        <div class="rdc-time">
                            ${utils.minutesToTime(startMin)}–${utils.minutesToTime(endMin)}
                            ${apt.appointment_kind === 'fixed' || !apt.appointment_kind ? ' · ' + t('fixed_label') : ''}
                        </div>
                        <div class="rdc-address">${utils.escapeHtml(apt.address || '')}</div>
                        <div class="rdc-badges">
                            <span class="rdc-badge rdc-badge-type">${utils.visitTypeLabel(apt.visit_type)}</span>
                            ${apt.appointment_kind === 'flexible' ? `<span class="rdc-badge rdc-badge-flex">${t('apt_kind_flexible')}</span>` : ''}
                            ${windowLabel}
                        </div>
                    </div>
                    <div class="rdc-arrows">
                        <button class="rdc-arrow-btn rdc-arrow-up" data-dir="up" data-idx="${i}"${i === 0 ? ' disabled' : ''}>&#9650;</button>
                        <button class="rdc-arrow-btn rdc-arrow-down" data-dir="down" data-idx="${i}"${i === apts.length - 1 ? ' disabled' : ''}>&#9660;</button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        // Footer
        html += `
            <div class="route-list-footer">
                <div class="route-total-travel">
                    ${t('total_label')}: <strong>${totalTravelMin} min</strong>
                </div>
                <div class="route-warnings ${warningCount > 0 ? 'has-warnings' : 'all-ok'}">
                    ${warningCount > 0 ? t('warnings_count', warningCount) : t('all_in_window')}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Attach drag events
        this._attachDragEvents();
    },

    _travelConnectorHtml(minutes, distKm) {
        return `
            <div class="travel-connector">
                <div class="tc-line"></div>
                <div class="tc-badge">
                    <svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                    ${minutes} min · ${distKm} km
                </div>
                <div class="tc-line"></div>
            </div>
        `;
    },

    // ─── Arrow-button reorder (works on touch + desktop) ────────────────
    _moveStop(fromIdx, toIdx) {
        if (toIdx < 0 || toIdx >= this._orderedApts.length) return;
        const [moved] = this._orderedApts.splice(fromIdx, 1);
        this._orderedApts.splice(toIdx, 0, moved);
        this._renderDraggableList();
        this._updateMapFromOrder();
        this._saveRoute();
    },

    // ─── Drag-and-drop event wiring ───────────────────────────────────────
    _attachDragEvents() {
        const cards = document.querySelectorAll('.route-drag-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => this._onDragStart(e));
            card.addEventListener('dragend', (e) => this._onDragEnd(e));
            card.addEventListener('dragover', (e) => this._onDragOver(e));
            card.addEventListener('dragenter', (e) => this._onDragEnter(e));
            card.addEventListener('dragleave', (e) => this._onDragLeave(e));
            card.addEventListener('drop', (e) => this._onDrop(e));
        });

        // Arrow buttons
        document.querySelectorAll('.rdc-arrow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                const dir = btn.dataset.dir;
                this._moveStop(idx, dir === 'up' ? idx - 1 : idx + 1);
            });
        });
    },

    _onDragStart(e) {
        const card = e.currentTarget;
        this._dragIdx = parseInt(card.dataset.orderIdx);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this._dragIdx);
    },

    _onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.route-drag-card').forEach(c => {
            c.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        this._dragIdx = null;
    },

    _onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    _onDragEnter(e) {
        e.preventDefault();
        const card = e.currentTarget;
        const targetIdx = parseInt(card.dataset.orderIdx);
        if (targetIdx === this._dragIdx) return;

        document.querySelectorAll('.route-drag-card').forEach(c => {
            c.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        if (targetIdx < this._dragIdx) {
            card.classList.add('drag-over-top');
        } else {
            card.classList.add('drag-over-bottom');
        }
    },

    _onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    },

    _onDrop(e) {
        e.preventDefault();
        const targetIdx = parseInt(e.currentTarget.dataset.orderIdx);
        if (targetIdx === this._dragIdx || this._dragIdx === null) return;

        // Reorder the appointments array
        const [moved] = this._orderedApts.splice(this._dragIdx, 1);
        this._orderedApts.splice(targetIdx, 0, moved);

        // Re-render list + map
        this._renderDraggableList();
        this._updateMapFromOrder();

        // Auto-save the new order
        this._saveRoute();
    },

    // ─── Map update based on current order ────────────────────────────────
    _updateMapFromOrder() {
        const schedule = this._computeSchedule();
        mapManager.clearPins();

        if (state.homeLocation) {
            mapManager.addHomePin(state.homeLocation.lat, state.homeLocation.lon, state.homeLocation.address);
        }

        schedule.forEach((entry, i) => {
            const { apt, violated } = entry;
            if (apt.lat != null) {
                mapManager.addPin(apt.lat, apt.lon, `<strong>${apt.patient_name}</strong>`, i + 1, violated);
            }
        });

        mapManager.drawRoute(this._orderedApts, state.homeLocation);
    },

    // ─── Persist route order to server ────────────────────────────────────
    async _saveRoute() {
        try {
            const orderedIds = this._orderedApts.map(a => a.id);
            // Compute total travel for save
            let totalMin = 0;
            for (let i = 1; i < this._orderedApts.length; i++) {
                const prev = this._orderedApts[i - 1];
                const curr = this._orderedApts[i];
                if (prev.lat != null && curr.lat != null) {
                    totalMin += utils.travelMinutes(prev.lat, prev.lon, curr.lat, curr.lon);
                }
            }
            await api.routes.save(state.routeDate, orderedIds, totalMin);
        } catch (err) {
            console.warn('Route save failed:', err);
        }
    },

    _attachEvents() {
        document.getElementById('route-date')?.addEventListener('change', (e) => this.render({ date: e.target.value }));
        document.getElementById('set-home')?.addEventListener('click', () => this._handleSetHome());
        document.getElementById('clear-home')?.addEventListener('click', () => this._handleClearHome());
        document.getElementById('optimize-route')?.addEventListener('click', () => this._handleOptimize());
    },

    _handleClearHome() {
        state.homeLocation = null;
        localStorage.removeItem('juno_home');
        this.render({ date: state.routeDate });
    },

    async _handleSetHome() {
        const addr = document.getElementById('home-address').value;
        if (!addr) return utils.showToast(t('enter_address'), 'error');

        try {
            const result = await api.geocode(addr);
            if (result) {
                state.homeLocation = { address: addr, lat: result.lat, lon: result.lon };
                localStorage.setItem('juno_home', JSON.stringify(state.homeLocation));
                utils.showToast(t('home_saved'));
                this.render({ date: state.routeDate });
            }
        } catch (err) {
            utils.showToast(t('geocode_fail'), 'error');
        }
    },

    async _handleOptimize() {
        const btn = document.getElementById('optimize-route');
        const originalText = btn.textContent;
        btn.textContent = t('optimizing');
        btn.disabled = true;

        try {
            const result = await api.routes.optimize(
                state.routeDate,
                state.homeLocation?.lat,
                state.homeLocation?.lon,
                state.homeLocation?.address
            );

            // Update local order from server optimization
            this._orderedApts = result.ordered_appointments;
            this._serverLegs = result.legs || [];

            // Re-render the draggable list with new order
            this._renderDraggableList();

            // Build waypoints for OSRM road geometry
            const waypoints = [];
            if (state.homeLocation?.lat != null) waypoints.push(state.homeLocation);
            this._orderedApts.forEach(a => { if (a.lat != null) waypoints.push({ lat: a.lat, lon: a.lon }); });
            if (state.homeLocation?.lat != null) waypoints.push(state.homeLocation);

            // Update map
            this._updateMapFromOrder();

            const roadGeometry = await mapManager.fetchRoadGeometry(waypoints);
            mapManager.drawRoute(this._orderedApts, state.homeLocation, roadGeometry);

            utils.showToast(t('route_optimized', result.total_travel_minutes));
        } catch (err) {
            utils.showToast(err.message, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },
};
