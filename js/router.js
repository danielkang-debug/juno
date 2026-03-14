// -----------------------------------------------------------------------------
// js/router.js - Client-Side Routing
// -----------------------------------------------------------------------------
import { state } from './state.js';
import { views } from './views/index.js';
import { mapManager } from './map.js';

export const router = {
    init() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.navigateTo(e.state.view, e.state.params, false);
            }
        });
    },

    async navigateTo(viewName, params = {}, pushState = true) {
        // Architectural invariant: destroy the Leaflet map before leaving the
        // routes view to prevent "container already initialized" errors on return.
        if (state.currentView === 'routes' && viewName !== 'routes') {
            mapManager.destroy();
        }

        state.currentView = viewName;
        if (pushState) {
            history.pushState({ view: viewName, params }, '', `#${viewName}`);
        }

        if (views[viewName]) {
            await views[viewName].render(params);
            this._updateActiveNav(viewName);
        }
    },

    _updateActiveNav(viewName) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.id === 'nav-' + viewName);
        });
    }
};
