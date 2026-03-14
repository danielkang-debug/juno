// -----------------------------------------------------------------------------
// js/modals/appointment.js
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';
import { api } from '../api.js';
import { utils } from '../utils.js';
import { createSegmentedControl } from '../components/segmented-control.js';

export async function appointmentModal(date, appointment = null, onSave) {
    const isEdit = !!appointment;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Fetch patients for the dropdown
    const patients = await api.patients.list();

    overlay.innerHTML = `
        <div class="modal-box glass">
            <button class="modal-close-icon" id="apt-modal-close">✕</button>
            <div class="modal-header" style="margin-bottom:1.5rem;">
                <h2>${t(isEdit ? 'edit_apt' : 'new_apt')}</h2>
            </div>

            <div id="apt-kind-container" style="margin-bottom:2rem;"></div>

            <form id="appointment-form" class="modal-form">
                <input type="hidden" name="appointment_kind" id="apt-kind-input" value="${appointment?.appointment_kind || 'fixed'}">

                <div class="form-group" style="margin-bottom:1.5rem;">
                    <label>${t('label_patient')}</label>
                    <select name="patient_id" required>
                        <option value="">${t('select_patient')}</option>
                        ${patients.map(p => `<option value="${p.id}" ${appointment?.patient_id === p.id ? 'selected' : ''}>${utils.escapeHtml(p.name)}</option>`).join('')}
                    </select>
                </div>

                <div class="form-row-stable">
                    <div class="form-group">
                        <label>${t('label_date')}</label>
                        <input type="date" name="date" value="${appointment?.date || date}" required>
                    </div>
                    <div class="form-group">
                        <label>${t('label_duration')}</label>
                        <input type="number" name="duration_minutes" value="${appointment?.duration_minutes || 60}" required min="5">
                    </div>
                </div>

                <!-- Stable container reserves height so the form doesn't shift on kind toggle -->
                <div class="time-fields-stable-container" id="time-container">
                    <div class="time-fields-inner" id="time-fields-inner">
                        <!-- Dynamic fields inserted by _updateTimeFields() -->
                    </div>
                </div>

                <div class="form-group">
                    <label>${t('label_visit_type')}</label>
                    <select name="visit_type">
                        <option value="prenatal" ${appointment?.visit_type === 'prenatal' ? 'selected' : ''}>${t('type_prenatal')}</option>
                        <option value="birth" ${appointment?.visit_type === 'birth' ? 'selected' : ''}>${t('type_birth')}</option>
                        <option value="postnatal" ${appointment?.visit_type === 'postnatal' ? 'selected' : ''}>${t('type_postnatal')}</option>
                    </select>
                </div>

                <div class="form-actions" style="margin-top:2rem;">
                    ${isEdit ? `<button type="button" class="btn-danger-outline" id="apt-cancel-btn">${t('cancel_apt_btn')}</button>` : `<span></span>`}
                    <div style="display:flex;gap:0.75rem;">
                        <button type="button" class="btn-secondary" id="apt-modal-cancel">${t('cancel_btn')}</button>
                        <button type="submit" class="btn-primary" id="apt-submit">${t(isEdit ? 'save_changes' : 'schedule_btn')}</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    // Initialize Segmented Control
    const kindContainer = document.getElementById('apt-kind-container');
    const kindInput = document.getElementById('apt-kind-input');
    const segmented = createSegmentedControl({
        options: [
            { label: t('apt_kind_fixed'), value: 'fixed' },
            { label: t('apt_kind_flexible'), value: 'flexible' }
        ],
        activeValue: appointment?.appointment_kind || 'fixed',
        onChange: (val) => {
            kindInput.value = val;
            _updateTimeFields(val, appointment);
        }
    });
    kindContainer.appendChild(segmented);

    // Render initial time fields
    _updateTimeFields(appointment?.appointment_kind || 'fixed', appointment);

    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('apt-modal-close').onclick = close;
    document.getElementById('apt-modal-cancel').onclick = close;

    if (isEdit) {
        document.getElementById('apt-cancel-btn').onclick = async () => {
            if (await utils.confirm(t('cancel_apt_confirm'))) {
                try {
                    await api.appointments.cancel(appointment.id);
                    utils.showToast(t('apt_cancelled'));
                    close();
                    if (onSave) onSave();
                } catch (err) {
                    utils.showToast(err.message, 'error');
                }
            }
        };
    }

    const form = document.getElementById('appointment-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        const submitBtn = document.getElementById('apt-submit');

        submitBtn.disabled = true;
        submitBtn.textContent = t('saving_apt');

        try {
            if (isEdit) {
                await api.appointments.update(appointment.id, data);
            } else {
                await api.appointments.create(data);
            }
            utils.showToast(t(isEdit ? 'apt_updated' : 'apt_scheduled'));
            close();
            if (onSave) onSave();
        } catch (err) {
            utils.showToast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? t('save_changes') : t('schedule_btn');
        }
    };
}

function _updateTimeFields(kind, apt) {
    const inner = document.getElementById('time-fields-inner');
    if (!inner) return;

    if (kind === 'fixed') {
        inner.innerHTML = `
            <div class="form-group">
                <label>${t('label_time')}</label>
                <div class="input-with-icon">
                    <input type="time" name="time" value="${apt?.time || '09:00'}" required>
                    <span class="input-icon">🕒</span>
                </div>
            </div>
            <div class="form-group hidden"></div>
        `;
    } else {
        inner.innerHTML = `
            <div class="form-group">
                <label>${t('label_window_start')}</label>
                <div class="input-with-icon">
                    <input type="time" name="time" value="${apt?.time || '09:00'}" required>
                    <span class="input-icon">🕒</span>
                </div>
            </div>
            <div class="form-group">
                <label>${t('label_window_end')}</label>
                <div class="input-with-icon">
                    <input type="time" name="window_end" value="${apt?.window_end || '12:00'}" required>
                    <span class="input-icon">🕒</span>
                </div>
            </div>
        `;
    }
}
