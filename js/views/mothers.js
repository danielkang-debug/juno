// -----------------------------------------------------------------------------
// js/views/mothers.js
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { utils } from '../utils.js';
import { modals } from '../modals/index.js';

export const mothersView = {
    async render() {
        const appView = document.getElementById('app-view');
        appView.innerHTML = '<div class="loading-spinner">Loading Patients…</div>';

        try {
            const patients = await api.patients.list();
            appView.innerHTML = `
                <header class="header">
                    <div>
                        <h1>${t('mothers_title')}</h1>
                        <p style="color:var(--text-muted);">${t('mothers_sub', patients.length)}</p>
                    </div>
                    <button class="btn-primary" id="mothers-add">+ ${t('add_mother')}</button>
                </header>

                <div class="card table-card">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('col_name')}</th>
                                <th>${t('col_status')}</th>
                                <th>${t('col_ga')}</th>
                                <th>${t('col_due')}</th>
                                <th>${t('col_phone')}</th>
                                <th style="text-align:right;">${t('col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${patients.map(p => {
                                const initials = p.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
                                const isAlert = utils.isGAAlert(p.gestational_age_weeks);
                                const dueFormatted = p.due_date
                                    ? new Date(p.due_date + 'T12:00:00').toLocaleDateString(t('locale'), { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '—';
                                return `
                                <tr class="${isAlert ? 'row-alert' : ''}">
                                    <td>
                                        <div class="patient-cell">
                                            <div class="patient-avatar ${p.status}">${initials}</div>
                                            <div>
                                                <strong>${utils.escapeHtml(p.name)}</strong>
                                                ${p.lat == null ? `<br><small class="no-location-hint">${t('no_location_warn')}</small>` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="status-badge ${p.status}">${utils.statusLabel(p.status)}</span></td>
                                    <td><span class="ga-badge ${isAlert ? 'alert' : ''}">${utils.gaLabel(p.gestational_age_weeks, p.gestational_age_days)}</span></td>
                                    <td class="due-cell">${dueFormatted}</td>
                                    <td class="phone-cell">${utils.escapeHtml(p.phone) || '—'}</td>
                                    <td>
                                        <div class="action-btns">
                                            <button class="btn-icon-small" data-edit="${p.id}" title="${t('edit_btn')}">✏</button>
                                            <button class="btn-icon-small btn-discharge" data-discharge="${p.id}" title="${t('discharge_btn')}">↗</button>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('')}
                            ${patients.length === 0 ? `<tr><td colspan="6" class="empty-text">${t('no_patients')}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;

            this._attachEvents(patients);
        } catch (err) {
            appView.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
    },

    _attachEvents(patients) {
        document.getElementById('mothers-add')?.addEventListener('click', () => modals.patient(null, () => this.render()));
        
        document.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = patients.find(x => String(x.id) === btn.dataset.edit);
                modals.patient(p, () => this.render());
            });
        });

        document.querySelectorAll('[data-discharge]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const p = patients.find(x => String(x.id) === btn.dataset.discharge);
                if (await utils.confirm(t('discharge_confirm', p.name))) {
                    try {
                        await api.patients.delete(p.id);
                        utils.showToast(t('discharged_toast', p.name));
                        this.render();
                    } catch (err) {
                        utils.showToast(err.message, 'error');
                    }
                }
            });
        });
    }
};
