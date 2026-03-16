// -----------------------------------------------------------------------------
// js/views/auth.js — Login / Register View
// -----------------------------------------------------------------------------
import { api } from '../api.js';
import { state } from '../state.js';
import { t } from '../i18n.js';

export const authView = {
    async render() {
        const container = document.getElementById('app-view');
        container.innerHTML = `
            <div class="auth-view">
                <div class="auth-card">
                    <div class="auth-logo">
                        <img src="assets/j-icon.png" alt="Juno" style="height: 80px; border-radius: 18px;">
                    </div>
                    <h2 class="auth-title" id="auth-title">${t('auth_login_title')}</h2>
                    <p class="auth-subtitle" id="auth-subtitle">${t('auth_login_sub')}</p>

                    <form id="auth-form" class="auth-form">
                        <div id="name-field" class="auth-field" style="display: none;">
                            <label for="auth-name">${t('auth_name')}</label>
                            <input type="text" id="auth-name" placeholder="${t('auth_name_placeholder')}" autocomplete="name">
                        </div>
                        <div class="auth-field">
                            <label for="auth-email">${t('auth_email')}</label>
                            <input type="email" id="auth-email" placeholder="${t('auth_email_placeholder')}" autocomplete="email" required>
                        </div>
                        <div class="auth-field">
                            <label for="auth-password">${t('auth_password')}</label>
                            <input type="password" id="auth-password" placeholder="${t('auth_password_placeholder')}" autocomplete="current-password" required>
                        </div>

                        <div id="tos-field" class="auth-tos" style="display: none;">
                            <label>
                                <input type="checkbox" id="auth-tos">
                                <span>${t('auth_tos_text')} <a href="#" id="auth-tos-link">${t('auth_tos_link')}</a></span>
                            </label>
                        </div>

                        <div id="auth-error" class="auth-error" style="display: none;"></div>

                        <button type="submit" class="auth-submit" id="auth-submit">${t('auth_login_btn')}</button>
                    </form>

                    <p class="auth-toggle">
                        <span id="auth-toggle-text">${t('auth_no_account')}</span>
                        <a href="#" id="auth-toggle-link">${t('auth_register_link')}</a>
                    </p>
                </div>
            </div>
        `;

        this._isRegister = false;
        this._setupListeners();
        this._setupTosModal();
    },

    _setupListeners() {
        const form = document.getElementById('auth-form');
        const toggleLink = document.getElementById('auth-toggle-link');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });

        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            this._isRegister = !this._isRegister;
            this._updateMode();
        });
    },

    _updateMode() {
        const isReg = this._isRegister;
        document.getElementById('auth-title').textContent = t(isReg ? 'auth_register_title' : 'auth_login_title');
        document.getElementById('auth-subtitle').textContent = t(isReg ? 'auth_register_sub' : 'auth_login_sub');
        document.getElementById('name-field').style.display = isReg ? 'block' : 'none';
        document.getElementById('tos-field').style.display = isReg ? 'flex' : 'none';
        document.getElementById('auth-submit').textContent = t(isReg ? 'auth_register_btn' : 'auth_login_btn');
        document.getElementById('auth-toggle-text').textContent = t(isReg ? 'auth_have_account' : 'auth_no_account');
        document.getElementById('auth-toggle-link').textContent = t(isReg ? 'auth_login_link' : 'auth_register_link');
        document.getElementById('auth-error').style.display = 'none';

        // Update autocomplete hint for password
        const pwInput = document.getElementById('auth-password');
        pwInput.autocomplete = isReg ? 'new-password' : 'current-password';
        const tosCheckbox = document.getElementById('auth-tos');
        if (isReg) {
            document.getElementById('auth-name').required = true;
            pwInput.minLength = 8;
            tosCheckbox.required = true;
        } else {
            document.getElementById('auth-name').required = false;
            pwInput.removeAttribute('minLength');
            tosCheckbox.required = false;
            tosCheckbox.checked = false;
        }
    },

    _setupTosModal() {
        document.getElementById('auth-tos-link').addEventListener('click', (e) => {
            e.preventDefault();
            this._showTosModal();
        });
    },

    _showTosModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h2>${t('auth_tos_link')}</h2>
                    <button class="modal-close" id="tos-close">&times;</button>
                </div>
                <div class="tos-content">
                    <p>${t('tos_intro')}</p>
                    <ul>
                        <li>${t('tos_prototype')}</li>
                        <li>${t('tos_no_real_data')}</li>
                        <li>${t('tos_data_deletion')}</li>
                        <li>${t('tos_no_warranty')}</li>
                        <li>${t('tos_feedback')}</li>
                    </ul>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#tos-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    },

    async _handleSubmit() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();
        const errorEl = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = t('auth_submitting');

        try {
            let user;
            if (this._isRegister) {
                user = await api.auth.register(email, password, name);
            } else {
                user = await api.auth.login(email, password);
            }
            state.user = user;
            // Signal successful login — main.js listens for this
            window.dispatchEvent(new Event('juno:authenticated'));
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = t(this._isRegister ? 'auth_register_btn' : 'auth_login_btn');
        }
    }
};
