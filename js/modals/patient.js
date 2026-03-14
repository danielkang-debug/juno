// -----------------------------------------------------------------------------
// js/modals/patient.js
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { utils } from '../utils.js';

export function patientModal(patient = null, onSave) {
    const isEdit = !!patient;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box glass">
            <button class="modal-close-icon" id="patient-modal-close">✕</button>
            <div class="modal-header">
                <h2>${t(isEdit ? 'edit_mother' : 'add_mother_modal')}</h2>
            </div>
            <form id="patient-form" class="modal-form">
                <div class="form-group">
                    <label>${t('label_fullname')}</label>
                    <input type="text" name="name" value="${utils.escapeHtml(patient?.name)}" required placeholder="${t('placeholder_name')}">
                </div>
                <div class="form-group">
                    <label>${t('label_address')} <span class="label-hint">${t('label_address_hint')}</span></label>
                    <input type="text" name="address" value="${utils.escapeHtml(patient?.address)}" required placeholder="${t('placeholder_address')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${t('label_phone')}</label>
                        <input type="tel" name="phone" value="${utils.escapeHtml(patient?.phone)}">
                    </div>
                    <div class="form-group">
                        <label>${t('label_status')}</label>
                        <select name="status">
                            <option value="active" ${patient?.status === 'active' ? 'selected' : ''}>${t('opt_pregnant')}</option>
                            <option value="postpartum" ${patient?.status === 'postpartum' ? 'selected' : ''}>${t('opt_postpartum')}</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${t('label_ga_weeks')}</label>
                        <input type="number" name="gestational_age_weeks" value="${patient?.gestational_age_weeks || 0}" min="0" max="45">
                    </div>
                    <div class="form-group">
                        <label>${t('label_ga_days')}</label>
                        <input type="number" name="gestational_age_days" value="${patient?.gestational_age_days || 0}" min="0" max="6">
                    </div>
                </div>
                <div class="form-group">
                    <label>${t('label_due_date')}</label>
                    <input type="date" name="due_date" value="${patient?.due_date || ''}">
                </div>
                <div class="form-group">
                    <label>${t('label_notes')}</label>
                    <textarea name="notes" rows="3">${utils.escapeHtml(patient?.notes)}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="patient-cancel">${t('cancel_btn')}</button>
                    <button type="submit" class="btn-primary" id="patient-submit">${t(isEdit ? 'save_changes' : 'add_mother_btn')}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('patient-modal-close').onclick = close;
    document.getElementById('patient-cancel').onclick = close;

    const form = document.getElementById('patient-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        const submitBtn = document.getElementById('patient-submit');
        const originalText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = t(isEdit ? 'saving' : 'adding');

        try {
            // Geocode if address changed
            if (data.address && data.address !== patient?.address) {
                const geo = await api.geocode(data.address);
                if (geo) {
                    data.lat = geo.lat;
                    data.lon = geo.lon;
                }
            }

            if (isEdit) {
                await api.patients.update(patient.id, data);
            } else {
                await api.patients.create(data);
            }
            utils.showToast(t(isEdit ? 'changes_saved' : 'mother_added'));
            close();
            if (onSave) onSave();
        } catch (err) {
            utils.showToast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}
