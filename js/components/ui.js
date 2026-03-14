// -----------------------------------------------------------------------------
// js/components/ui.js - Reusable UI Components (Toast, Confirm Dialog)
// -----------------------------------------------------------------------------
import { t } from '../i18n.js';

export function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// Returns a Promise<boolean> — resolves true on confirm, false on cancel/dismiss.
export function confirm(msg) {
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
}
