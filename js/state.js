// -----------------------------------------------------------------------------
// state.js - Global App State
// -----------------------------------------------------------------------------

export const state = {
    lang: localStorage.getItem('juno_lang') || 'de',
    currentView: null,
    routeDate: null,
    homeLocation: JSON.parse(localStorage.getItem('juno_home')) || null,
    user: null,
};
