// -----------------------------------------------------------------------------
// js/utils.js - Data Formatters, Helpers, and UI Primitives
//
// Pure formatters (today, escapeHtml, gaLabel, etc.) have no side effects.
// showToast and confirm render DOM — they live here for convenience since all
// views already import utils. Standalone exports also available in components/ui.js.
//
// Removed from this file (now server-side only):
//   haversine, travelMinutes  →  handled by tools/route.py
//   fetchOSRMGeometry         →  moved to mapManager.fetchRoadGeometry() in map.js
// -----------------------------------------------------------------------------
import { t } from './i18n.js';

export const utils = {
    today: () => new Date().toISOString().split('T')[0],

    formatTime: (timeStr) => {
        if (!timeStr) return '';
        return timeStr.slice(0, 5);
    },

    escapeHtml: (unsafe) => {
        return (unsafe || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    statusLabel: (status) => t(status === 'active' ? 'opt_pregnant' : 'opt_postpartum'),

    gaLabel: (w, d) => `${w || 0}+${d || 0}`,

    // GA alert threshold per CLAUDE.md: gestational_age_weeks >= 40
    isGAAlert: (w) => !!(w && w >= 40),

    visitTypeLabel: (type) => t('type_' + (type || 'prenatal')),

    visitBadge: (type) => {
        const label = utils.visitTypeLabel(type);
        return `<span class="visit-badge ${type || 'prenatal'}">${label}</span>`;
    },

    // Haversine distance in km (client-side, for drag-reorder travel estimates)
    haversineKm: (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // Estimate travel minutes at 30 km/h average urban speed
    travelMinutes: (lat1, lon1, lat2, lon2) => {
        const km = utils.haversineKm(lat1, lon1, lat2, lon2);
        return Math.round(km / 30 * 60);
    },

    // Convert "HH:MM" to total minutes since midnight
    timeToMinutes: (hhmm) => {
        if (!hhmm) return 0;
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    },

    // Convert total minutes since midnight to "HH:MM"
    minutesToTime: (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    kindColor: (kind) => {
        const colors = { fixed: 'var(--sage-green)', flexible: 'var(--sage-light)', urgent: 'var(--pending)' };
        return colors[kind] || 'var(--sage-green)';
    },

    showToast: (msg, type = 'success') => {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    },

    // Returns Promise<boolean>: true = confirmed, false = cancelled/dismissed
    confirm: (msg) => {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box" style="width:360px;text-align:center;">
                    <h2 style="font-size:1.4rem;margin-bottom:1rem;">${t('confirm')}</h2>
                    <p style="margin-bottom:2rem;color:var(--text-muted);">${msg}</p>
                    <div class="form-actions" style="justify-content:center;border:none;padding:0;">
                        <button class="btn-secondary" id="confirm-no">${t('cancel')}</button>
                        <button class="btn-primary" id="confirm-yes">${t('confirm')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('confirm-yes').focus();
            const close = (res) => { overlay.remove(); resolve(res); };
            document.getElementById('confirm-yes').addEventListener('click', () => close(true));
            document.getElementById('confirm-no').addEventListener('click', () => close(false));
            overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
        });
    },
};
