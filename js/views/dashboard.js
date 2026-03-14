// -----------------------------------------------------------------------------
// js/views/dashboard.js
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { utils } from '../utils.js';
import { router } from '../router.js';
import { modals } from '../modals/index.js';

export const dashboardView = {
    async render() {
        const appView = document.getElementById('app-view');
        appView.innerHTML = '<div class="loading-spinner">Loading Dashboard…</div>';

        try {
            const [apts, patients] = await Promise.all([
                api.appointments.byDate(utils.today()),
                api.patients.list()
            ]);

            // 'birth' is a visit_type, not a patient status — count birth appointments today
            const activeBirths = apts.filter(a => a.visit_type === 'birth').length;
            const gaAlerts = patients.filter(p => utils.isGAAlert(p.gestational_age_weeks));

            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1>${t('welcome', state.user?.name)}</h1>
                        <p style="color:var(--text-muted);">${t('visits_today', apts.length)}</p>
                    </div>
                </header>

                <div class="metric-container">
                    <div class="metric-card">
                        <span>${t('visits_today_label')}</span>
                        <strong>${apts.length}</strong>
                    </div>
                    <div class="metric-card">
                        <span>${t('active_births')}</span>
                        <strong>${activeBirths}</strong>
                    </div>
                    <div class="metric-card">
                        <span>${t('ga_alerts_label')}</span>
                        <strong class="${gaAlerts.length > 0 ? 'ga-alert' : ''}">${gaAlerts.length}</strong>
                    </div>
                </div>

                <div class="dashboard-grid" style="margin-top:2rem;">
                    <div class="card hero-card">
                        <div class="hero-content">
                            <h2>${t('daily_pulse')}</h2>
                            <p>${t('daily_pulse_sub')}</p>
                            <button class="btn-primary" id="dash-plan-route" style="margin-top:1.5rem;">${t('plan_route')}</button>
                        </div>
                    </div>

                    <div class="card" style="grid-column: span 6;">
                        <h2>${t('quick_actions')}</h2>
                        <div style="display:flex;flex-direction:column;gap:0.75rem;">
                            <button class="btn-secondary" id="dash-add-mother" style="justify-content:flex-start;">+ ${t('add_mother')}</button>
                            <button class="btn-primary" id="dash-new-apt" style="justify-content:flex-start;">+ ${t('new_appointment')}</button>
                        </div>
                    </div>

                    <div class="card" style="grid-column: span 6;">
                        <h2>${t('ga_alerts_label')}</h2>
                        <ul class="ga-alert-list">
                            ${gaAlerts.length === 0 ? `<li class="ga-alert-empty">${t('no_ga_alerts')}</li>` :
                                gaAlerts.map(p => `<li class="ga-alert-item">
                                    <span class="ga-alert-dot"></span>
                                    <span class="ga-alert-name">${utils.escapeHtml(p.name)}</span>
                                    <span class="ga-alert-badge">${utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days)} GA</span>
                                </li>`).join('')}
                        </ul>
                        <button class="btn-secondary" id="dash-view-mothers" style="margin-top:1rem;width:100%;">${t('view_mothers', patients.length)}</button>
                    </div>
                </div>
                <div class="dash-apts-section">
                    <h2>${t('visits_today_label')}</h2>
                    <div class="dash-apts-grid">
                        ${apts.length === 0 ? `<p style="color:var(--text-muted);">${t('no_apts_today')}</p>` : 
                            apts.map(a => `
                                <div class="apt-card-mini" style="border-left-color:${utils.kindColor(a.appointment_kind)};${a.appointment_kind === 'flexible' ? 'border-left-style:dashed' : ''}">
                                    <div>
                                        <div class="patient">${utils.escapeHtml(a.patient_name)}</div>
                                        <div class="kind">${t('apt_kind_' + (a.appointment_kind || 'fixed'))}</div>
                                    </div>
                                    <div class="time">${utils.formatTime(a.time)}${a.appointment_kind === 'flexible' && a.window_end ? `<br><small style="color:var(--text-muted);font-weight:400;">–&nbsp;${utils.formatTime(a.window_end)}</small>` : ''}</div>
                                </div>
                            `).join('')}
                    </div>
                </div>
            `;

            this._attachEvents();
        } catch (err) {
            appView.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
    },

    _attachEvents() {
        document.getElementById('dash-plan-route')?.addEventListener('click', () => router.navigateTo('routes'));
        document.getElementById('dash-add-mother')?.addEventListener('click', () => modals.patient(null, () => this.render()));
        document.getElementById('dash-new-apt')?.addEventListener('click', () => modals.appointment(utils.today(), null, () => this.render()));
        document.getElementById('dash-view-mothers')?.addEventListener('click', () => router.navigateTo('mothers'));
    }
};
