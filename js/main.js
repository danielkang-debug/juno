// -----------------------------------------------------------------------------
// js/main.js - App Entry Point
// -----------------------------------------------------------------------------
import { state } from './state.js';
import { router } from './router.js';
import { api } from './api.js';
import { t } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    router.init();
    _setupNavigationListeners();

    _updateUIStrings();
    document.getElementById('lang-toggle').addEventListener('click', () => {
        state.lang = state.lang === 'de' ? 'en' : 'de';
        localStorage.setItem('juno_lang', state.lang);
        _updateUIStrings();
        if (state.currentView) {
            router.navigateTo(state.currentView);
        }
    });

    // ── Auth gate ──
    // Listen for session expiry (401 from any API call)
    window.addEventListener('juno:unauthorized', () => {
        state.user = null;
        _setAuthMode(true);
        router.navigateTo('auth');
    });

    // Listen for successful login/register
    window.addEventListener('juno:authenticated', () => {
        _setAuthMode(false);
        _updateUserUI();
        router.navigateTo('dashboard');
    });

    // Check if user is already logged in (session cookie)
    try {
        const user = await api.auth.me();
        state.user = user;
        _setAuthMode(false);
        _updateUserUI();
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        router.navigateTo(hash === 'auth' ? 'dashboard' : hash);
    } catch {
        state.user = null;
        _setAuthMode(true);
        router.navigateTo('auth');
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await api.auth.logout();
            state.user = null;
            _setAuthMode(true);
            router.navigateTo('auth');
        });
    }
}

function _setAuthMode(isAuth) {
    document.querySelector('.app-container').classList.toggle('auth-mode', isAuth);
    document.querySelector('.prototype-banner').classList.toggle('auth-mode', isAuth);
}

function _updateUserUI() {
    const el = document.getElementById('user-name');
    if (el && state.user) {
        el.textContent = state.user.name;
    }
}

function _setupNavigationListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.id.replace('nav-', '');
            router.navigateTo(view);
        });
    });
}

function _updateUIStrings() {
    document.querySelectorAll('.nav-item .nav-label').forEach(span => {
        const key = 'nav_' + span.parentElement.id.replace('nav-', '');
        span.textContent = t(key);
    });

    const banner = document.getElementById('banner-text');
    if (banner) banner.textContent = t('banner');

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = state.lang === 'de' ? 'EN' : 'DE';
}
