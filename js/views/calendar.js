// -----------------------------------------------------------------------------
// js/views/calendar.js
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { utils } from '../utils.js';
import { state } from '../state.js';
import { modals } from '../modals/index.js';
import { router } from '../router.js';

export const calendarView = {
    async render(params = {}) {
        if (params.date) {
            return this.renderDayDetail(params.date);
        }

        const date = state.calendarMonth || new Date();
        state.calendarMonth = date;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const appView = document.getElementById('app-view');
        appView.innerHTML = '<div class="loading-spinner">Loading Calendar…</div>';

        try {
            const monthData = await api.appointments.byMonth(monthKey);
            const countByDay = {};
            monthData.forEach(r => { countByDay[r.date] = r.count; });

            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            let startOffset = firstDay.getDay() - 1; // Monday start
            if (startOffset < 0) startOffset = 6;

            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1>${t('calendar_title')}</h1>
                        <p style="color:var(--text-muted);">${t('calendar_sub')}</p>
                    </div>
                </header>

                <div class="card calendar-card">
                    <div class="calendar-header">
                        <button class="btn-icon" id="cal-prev">‹</button>
                        <h2>${date.toLocaleDateString(t('locale'), { month: 'long', year: 'numeric' })}</h2>
                        <button class="btn-icon" id="cal-next">›</button>
                    </div>
                    <div class="calendar-grid">
                        ${t('weekdays_short').map(d => `<div class="weekday">${d}</div>`).join('')}
                        ${Array(startOffset).fill('<div class="empty"></div>').join('')}
                        ${Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const iso = `${monthKey}-${String(day).padStart(2, '0')}`;
                            const count = countByDay[iso] || 0;
                            return `
                                <div class="day-cell ${iso === utils.today() ? 'today' : ''} ${count > 0 ? 'has-apts' : ''}" data-date="${iso}">
                                    <span class="day-number">${day}</span>
                                    ${count > 0 ? `<span class="apt-indicator">${count}</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            this._attachEvents(date);
        } catch (err) {
            appView.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
    },

    async renderDayDetail(isoDate) {
        const appView = document.getElementById('app-view');
        appView.innerHTML = '<div class="loading-spinner">Loading day details…</div>';

        try {
            const apts = await api.appointments.byDate(isoDate);
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <button class="btn-back" id="cal-back-to-month">← ${t('back_to_calendar')}</button>
                        <h1>${new Date(isoDate).toLocaleDateString(t('locale'), { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
                        <p style="color:var(--text-muted);">${t('apt_count', apts.length)}</p>
                    </div>
                    <div style="display:flex;gap:0.75rem;">
                        <button class="btn-secondary" id="cal-view-route">${t('view_route')}</button>
                        <button class="btn-primary" id="cal-add-apt">${t('add_appointment')}</button>
                    </div>
                </header>
                <div class="day-view-container">
                    <div class="timeline-container" id="timeline"></div>
                </div>
            `;

            this._renderTimeline(apts, isoDate);
            this._attachDetailEvents(isoDate);
        } catch (err) {
            appView.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
    },

    _renderTimeline(apts, date) {
        const container = document.getElementById('timeline');
        if (!container) return;

        if (apts.length === 0) {
            container.innerHTML = `<p class="empty-text">${t('no_apts_day')}</p>`;
            return;
        }

        const START_HOUR = 7;
        const END_HOUR   = 20;
        const PX_PER_HR  = 64;
        const COL_GAP    = 4;

        // ── Overlap layout ──────────────────────────────────
        function timeToDecimal(hhmm) {
            if (!hhmm) return 0;
            const [h, m] = hhmm.split(':').map(Number);
            return h + m / 60;
        }

        function fmtRange(time, dur) {
            const [h, m] = time.split(':').map(Number);
            const endMin = h * 60 + m + dur;
            const eh = Math.floor(endMin / 60);
            const em = endMin % 60;
            return `${time.slice(0,5)} – ${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
        }

        const items = apts.map(apt => {
            const start = timeToDecimal(apt.time);
            // Flexible: block spans the whole availability window; Fixed: block spans the duration
            const end = (apt.appointment_kind === 'flexible' && apt.window_end)
                ? timeToDecimal(apt.window_end)
                : start + (apt.duration_minutes || 60) / 60;
            return { apt, start, end, col: 0, totalCols: 1 };
        }).sort((a, b) => a.start - b.start);

        const colEnds = [];
        items.forEach(item => {
            let placed = false;
            for (let c = 0; c < colEnds.length; c++) {
                if (item.start >= colEnds[c] - 0.001) {
                    item.col = c; colEnds[c] = item.end; placed = true; break;
                }
            }
            if (!placed) { item.col = colEnds.length; colEnds.push(item.end); }
        });
        items.forEach(item => {
            let maxCols = item.col + 1;
            items.forEach(other => {
                if (other === item) return;
                if (item.start < other.end - 0.001 && other.start < item.end - 0.001)
                    maxCols = Math.max(maxCols, other.col + 1);
            });
            item.totalCols = maxCols;
        });

        // ── Build DOM ────────────────────────────────────────
        const totalHeight = (END_HOUR - START_HOUR) * PX_PER_HR;

        const wrap = document.createElement('div');
        wrap.className = 'tg-wrap';

        const labelsCol = document.createElement('div');
        labelsCol.className = 'tg-labels';

        const eventsCol = document.createElement('div');
        eventsCol.className = 'tg-events';
        eventsCol.style.height = totalHeight + 'px';

        // Hour labels + grid lines
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            const lbl = document.createElement('div');
            lbl.className = 'tg-hour-label';
            lbl.textContent = h < END_HOUR ? `${String(h).padStart(2,'0')}:00` : '';
            labelsCol.appendChild(lbl);

            if (h < END_HOUR) {
                const line = document.createElement('div');
                line.className = 'tg-hour-line';
                line.style.top = ((h - START_HOUR) * PX_PER_HR) + 'px';
                eventsCol.appendChild(line);
            }
        }

        // Current time indicator
        const nowDecimal = new Date().getHours() + new Date().getMinutes() / 60;
        if (nowDecimal >= START_HOUR && nowDecimal <= END_HOUR) {
            const nowLine = document.createElement('div');
            nowLine.className = 'tg-now-line';
            nowLine.style.top = ((nowDecimal - START_HOUR) * PX_PER_HR) + 'px';
            eventsCol.appendChild(nowLine);
        }

        wrap.appendChild(labelsCol);
        wrap.appendChild(eventsCol);
        container.appendChild(wrap);

        // Render after layout so offsetWidth is available
        requestAnimationFrame(() => {
            const colWidth = eventsCol.offsetWidth;
            items.forEach(({ apt, col, totalCols, start, end }) => {
                const topPx    = (start - START_HOUR) * PX_PER_HR;
                const heightPx = Math.max((end - start) * PX_PER_HR, 36);
                const MARGIN   = 8;
                const avail    = colWidth - MARGIN - COL_GAP * (totalCols - 1);
                const slotW    = avail / totalCols;
                const leftPx   = MARGIN + col * (slotW + COL_GAP);
                const rightPx  = Math.max(colWidth - leftPx - slotW, 4);

                const isFlexible = apt.appointment_kind === 'flexible';
                const el = document.createElement('div');
                el.className = `tg-evt tg-evt-${isFlexible ? 'flex' : 'fixed'}`;
                el.dataset.id = apt.id;
                el.style.top    = topPx + 'px';
                el.style.height = heightPx + 'px';
                el.style.left   = leftPx + 'px';
                el.style.right  = rightPx + 'px';

                const flexBadge  = isFlexible ? `<span class="tg-flex-badge">${t('apt_kind_flexible')}</span>` : '';
                const windowNote = isFlexible && apt.window_end ? `${t('window_until')} ${apt.window_end.slice(0,5)} · ` : '';

                el.innerHTML = `
                    <div class="tg-evt-title">${utils.escapeHtml(apt.patient_name)}${flexBadge}</div>
                    ${heightPx > 44 ? `<div class="tg-evt-meta">${utils.visitBadge(apt.visit_type)}</div>` : ''}
                    ${heightPx > 56 ? `<div class="tg-evt-time">${windowNote}${fmtRange(apt.time, apt.duration_minutes || 30)}</div>` : ''}
                `;

                el.addEventListener('click', () => {
                    modals.appointment(date, apt, () => this.renderDayDetail(date));
                });

                eventsCol.appendChild(el);
            });
        });
    },

    _attachEvents(currentDate) {
        document.getElementById('cal-prev')?.addEventListener('click', () => {
            state.calendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            this.render();
        });
        document.getElementById('cal-next')?.addEventListener('click', () => {
            state.calendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            this.render();
        });
        document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => this.renderDayDetail(cell.dataset.date));
        });
    },

    _attachDetailEvents(date) {
        document.getElementById('cal-back-to-month')?.addEventListener('click', () => this.render());
        document.getElementById('cal-view-route')?.addEventListener('click', () => router.navigateTo('routes', { date }));
        document.getElementById('cal-add-apt')?.addEventListener('click', () => modals.appointment(date, null, () => this.renderDayDetail(date)));
    }
};
