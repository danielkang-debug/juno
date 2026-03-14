// -----------------------------------------------------------------------------
// js/views/index.js
// -----------------------------------------------------------------------------
import { dashboardView } from './dashboard.js';
import { calendarView } from './calendar.js';
import { routesView } from './routes.js';
import { mothersView } from './mothers.js';
import { authView } from './auth.js';

export const views = {
    auth:      authView,
    dashboard: dashboardView,
    calendar:  calendarView,
    routes:    routesView,
    mothers:   mothersView
};
