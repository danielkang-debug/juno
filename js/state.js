/**
 * state.js — Reactive state store with event dispatch
 */

const _state = {
    user: null,
    selectedDate: new Date().toISOString().split('T')[0],
    appointments: [],
    optimizedRoute: null,
    driverMode: JSON.parse(localStorage.getItem('juno_driver_mode') || 'null'),
};

function createReactiveState(initial) {
    const listeners = new Map();

    const handler = {
        set(target, prop, value) {
            const old = target[prop];
            target[prop] = value;
            if (old !== value) {
                window.dispatchEvent(new CustomEvent('state:change', {
                    detail: { key: prop, value, old }
                }));
            }
            return true;
        }
    };

    return new Proxy(initial, handler);
}

export const state = createReactiveState(_state);

export function onStateChange(key, callback) {
    const handler = (e) => {
        if (e.detail.key === key) callback(e.detail.value, e.detail.old);
    };
    window.addEventListener('state:change', handler);
    return () => window.removeEventListener('state:change', handler);
}

export function saveDriverMode() {
    if (state.driverMode) {
        localStorage.setItem('juno_driver_mode', JSON.stringify(state.driverMode));
    } else {
        localStorage.removeItem('juno_driver_mode');
    }
}
