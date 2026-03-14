// -----------------------------------------------------------------------------
// api.js - Backend Communication
//
// Thin wrapper over fetch(). All requests go to the same origin (Flask serves
// both the SPA and /api/*), so no CORS headers are needed.
//
// Error handling: _fetch() throws an Error with the server's error message string
// on any non-2xx response, so callers can catch and display it directly.
//
// patients.list()  excludes discharged patients by default (server default).
// Pass include_discharged=true via the URL if needed (not currently exposed here).
// -----------------------------------------------------------------------------

export const api = {
    async _fetch(path, options = {}) {
        const res = await fetch(path, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        // Handle 401 — session expired or not logged in
        if (res.status === 401 && !path.startsWith('/api/auth/')) {
            window.dispatchEvent(new Event('juno:unauthorized'));
            throw new Error('Session expired');
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
    },
    get(path)         { return api._fetch(path); },
    post(path, body)  { return api._fetch(path, { method: 'POST',   body: JSON.stringify(body) }); },
    put(path, body)   { return api._fetch(path, { method: 'PUT',    body: JSON.stringify(body) }); },
    delete(path)      { return api._fetch(path, { method: 'DELETE' }); },

    // ── Auth ──
    auth: {
        login:    (email, password)       => api.post('/api/auth/login', { email, password }),
        register: (email, password, name) => api.post('/api/auth/register', { email, password, name }),
        logout:   ()                      => api.post('/api/auth/logout', {}),
        me:       ()                      => api.get('/api/auth/me'),
    },

    patients: {
        list: ()           => api.get('/api/patients'),
        create: (data)     => api.post('/api/patients', data),
        update: (id, data) => api.put(`/api/patients/${id}`, data),
        delete: (id)       => api.delete(`/api/patients/${id}`),
    },
    appointments: {
        byDate:  (date)   => api.get(`/api/appointments?date=${date}`),
        byMonth: (month)  => api.get(`/api/appointments?month=${month}`),
        create:  (data)   => api.post('/api/appointments', data),
        update:  (id, d)  => api.put(`/api/appointments/${id}`, d),
        cancel:  (id)     => api.delete(`/api/appointments/${id}`),
    },
    routes: {
        optimize: (date, startLat, startLon, startAddress) => api.post('/api/routes/optimize', {
            date,
            ...(startLat != null ? { start_lat: startLat, start_lon: startLon, start_address: startAddress || '' } : {}),
        }),
        get:      (date)  => api.get(`/api/routes/${date}`),
        save:     (date, orderedIds, totalMinutes) => api.post('/api/routes/save', {
            date,
            ordered_appointment_ids: orderedIds,
            estimated_travel_minutes: totalMinutes,
        }),
    },
    geocode: (address) => api.get(`/api/geocode?address=${encodeURIComponent(address)}`),
};
