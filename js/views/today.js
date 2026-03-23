/**
 * views/today.js — Main screen: appointment list + optimize + map + notify
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { mapManager } from '../map.js';

let container = null;
let routeStartTime = '08:00'; // persists across re-renders within session

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

async function render(el, params) {
    container = el;

    if (params.date) state.selectedDate = params.date;

    // Header
    const headerTitle = document.getElementById('header-title');
    const headerActions = document.getElementById('header-actions');
    headerTitle.textContent = '';
    headerActions.innerHTML = '';

    renderShell();
    await loadAppointments();
}

function renderShell() {
    container.innerHTML = `
        <!-- Date navigation -->
        <div class="flex items-center justify-between py-4">
            <button id="date-prev" class="p-2 rounded-lg hover:bg-stone-100 active:bg-stone-200">
                <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <div class="text-center">
                <button id="date-display" class="text-base font-semibold hover:underline">${formatDate(state.selectedDate)}</button>
                <input id="date-picker" type="date" value="${state.selectedDate}" class="hidden absolute" />
            </div>
            <button id="date-next" class="p-2 rounded-lg hover:bg-stone-100 active:bg-stone-200">
                <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Home address -->
        <div id="home-bar" class="mb-4"></div>

        <!-- Content area -->
        <div id="today-content">
            <div class="flex items-center justify-center py-12 text-stone-400">
                <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
            </div>
        </div>
    `;

    // Date navigation
    document.getElementById('date-prev').addEventListener('click', () => {
        state.selectedDate = shiftDate(state.selectedDate, -1);
        router.navigateTo('today', { date: state.selectedDate }, false);
        renderShell();
        loadAppointments();
    });
    document.getElementById('date-next').addEventListener('click', () => {
        state.selectedDate = shiftDate(state.selectedDate, 1);
        router.navigateTo('today', { date: state.selectedDate }, false);
        renderShell();
        loadAppointments();
    });

    // Date picker
    const dateDisplay = document.getElementById('date-display');
    const datePicker = document.getElementById('date-picker');
    dateDisplay.addEventListener('click', () => {
        datePicker.showPicker?.() || datePicker.click();
    });
    datePicker.addEventListener('change', (e) => {
        state.selectedDate = e.target.value;
        router.navigateTo('today', { date: state.selectedDate }, false);
        renderShell();
        loadAppointments();
    });

    renderHomeBar();
    lucide.createIcons();
}

function renderHomeBar() {
    const homeBar = document.getElementById('home-bar');
    const user = state.user;
    const hasHome = user && user.home_lat != null;

    if (hasHome) {
        homeBar.innerHTML = `
            <div class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-stone-200">
                <i data-lucide="home" class="w-4 h-4 text-stone-400 shrink-0"></i>
                <span class="text-sm text-stone-600 truncate flex-1">${escapeHtml(user.home_address)}</span>
                <button id="edit-home" class="p-1 rounded hover:bg-stone-100">
                    <i data-lucide="pencil" class="w-3.5 h-3.5 text-stone-400"></i>
                </button>
            </div>
        `;
        document.getElementById('edit-home').addEventListener('click', showHomeEditor);
    } else {
        homeBar.innerHTML = `
            <button id="set-home-btn" class="flex items-center gap-2 w-full px-3 py-2 bg-white rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors">
                <i data-lucide="home" class="w-4 h-4"></i>
                <span>Set your home address</span>
            </button>
        `;
        document.getElementById('set-home-btn').addEventListener('click', showHomeEditor);
    }
    lucide.createIcons();
}

function showHomeEditor() {
    const homeBar = document.getElementById('home-bar');
    const currentAddr = state.user?.home_address || '';
    homeBar.innerHTML = `
        <div class="flex gap-2">
            <input id="home-input" type="text" value="${escapeHtml(currentAddr)}" placeholder="Enter your home address"
                class="flex-1 h-10 px-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
            <button id="home-save" class="h-10 px-4 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800">
                Save
            </button>
            <button id="home-cancel" class="h-10 px-3 rounded-lg border border-stone-200 text-sm hover:bg-stone-100">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    document.getElementById('home-input').focus();
    document.getElementById('home-save').addEventListener('click', saveHome);
    document.getElementById('home-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveHome();
    });
    document.getElementById('home-cancel').addEventListener('click', renderHomeBar);
    lucide.createIcons();
}

async function saveHome() {
    const input = document.getElementById('home-input');
    const address = input.value.trim();
    if (!address) return;

    const btn = document.getElementById('home-save');
    btn.disabled = true;
    btn.textContent = '...';

    try {
        const user = await api.updateMe({ home_address: address });
        state.user = user;
        renderHomeBar();
        showToast('Home address saved');
    } catch (err) {
        showToast('Could not save address');
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

async function loadAppointments() {
    try {
        const appointments = await api.getAppointments({ date: state.selectedDate });
        state.appointments = appointments;
        state.optimizedRoute = null;
        renderAppointmentList();
    } catch (err) {
        document.getElementById('today-content').innerHTML = `
            <div class="text-center py-12 text-stone-400">
                <p>Could not load appointments</p>
            </div>
        `;
    }
}

function renderAppointmentList() {
    const content = document.getElementById('today-content');
    const apts = state.optimizedRoute
        ? state.optimizedRoute.ordered_appointments
        : state.appointments;
    const etas = state.optimizedRoute?.etas || {};
    const legs = state.optimizedRoute?.legs || [];
    const isOptimized = !!state.optimizedRoute;

    let html = '';

    // Header row
    html += `
        <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-stone-500">${apts.length} appointment${apts.length !== 1 ? 's' : ''}</span>
            <div class="flex gap-2">
                <button id="import-btn" class="p-2 rounded-lg hover:bg-stone-100" title="Import">
                    <i data-lucide="upload" class="w-4 h-4"></i>
                </button>
                <button id="add-apt-btn" class="p-2 rounded-lg hover:bg-stone-100" title="Add appointment">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;

    if (isOptimized) {
        // Route summary
        html += `
            <div class="bg-white rounded-lg border border-stone-200 p-3 mb-3 flex items-center gap-3">
                <i data-lucide="route" class="w-5 h-5 text-stone-400"></i>
                <div class="flex-1">
                    <span class="text-sm font-medium">${apts.length} stops</span>
                    <span class="text-sm text-stone-500 ml-2">${state.optimizedRoute.total_distance_km} km</span>
                </div>
            </div>
        `;

        // Map container
        html += `<div id="route-map" class="h-48 rounded-lg overflow-hidden mb-3 border border-stone-200"></div>`;
    }

    if (apts.length === 0) {
        html += `
            <div class="text-center py-12">
                <p class="text-stone-400 mb-4">No appointments for this day</p>
                <button id="add-apt-empty" class="h-11 px-6 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800">
                    Add appointment
                </button>
            </div>
        `;
    } else {
        // Starting point card
        if (isOptimized && state.user?.home_lat != null) {
            const firstLeg = legs[0];
            const departureTime = state.optimizedRoute.departure_time || '';
            html += `
                <div class="bg-stone-50 rounded-lg border border-stone-200 p-3 mb-1 flex items-center gap-3">
                    <i data-lucide="home" class="w-5 h-5 text-stone-400"></i>
                    <div class="flex-1">
                        <span class="text-sm font-medium">Start</span>
                        ${departureTime ? `<span class="text-sm text-stone-500 ml-2">Depart ${departureTime}</span>` : ''}
                        <div class="text-xs text-stone-400 truncate mt-0.5">${escapeHtml(state.user.home_address || '')}</div>
                    </div>
                </div>
            `;
            if (firstLeg) {
                html += `
                    <div class="flex items-center gap-2 py-1 pl-5">
                        <div class="w-px h-4 bg-stone-300"></div>
                        <span class="text-xs text-stone-400">${firstLeg.distance_km} km &middot; ${firstLeg.minutes} min</span>
                    </div>
                `;
            }
        }

        // Appointment cards
        apts.forEach((apt, i) => {
            const isFixed = apt.appointment_kind === 'fixed';
            const eta = etas[apt.id];
            const num = isOptimized ? i + 1 : null;

            // Travel connector between cards
            if (isOptimized && i > 0) {
                const legIdx = state.user?.home_lat != null ? i : i - 1;
                const leg = legs[legIdx];
                if (leg) {
                    html += `
                        <div class="flex items-center gap-2 py-1 pl-5">
                            <div class="w-px h-4 bg-stone-300"></div>
                            <span class="text-xs text-stone-400">${leg.distance_km} km &middot; ${leg.minutes} min</span>
                        </div>
                    `;
                }
            }

            html += `
                <div class="bg-white rounded-lg border border-stone-200 p-3 mb-1" data-apt-id="${apt.id}">
                    <div class="flex items-start gap-3">
                        ${num ? `<span class="w-6 h-6 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">${num}</span>` : ''}
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="text-sm font-medium">${escapeHtml(apt.patient_name)}</span>
                                <span class="text-xs px-1.5 py-0.5 rounded ${isFixed ? 'bg-stone-100 text-stone-600' : 'bg-stone-50 text-stone-400 border border-dashed border-stone-300'}">${isFixed ? 'Fixed' : 'Flex'}</span>
                            </div>
                            <div class="text-sm text-stone-500">
                                ${eta ? `ETA ${eta}` : apt.time} · ${apt.duration_minutes || 60} min · ${apt.visit_type || 'Visit'}
                            </div>
                            <div class="text-xs text-stone-400 truncate mt-0.5">${escapeHtml(apt.address || '')}</div>
                            ${!apt.lat && apt.address ? '<div class="text-xs text-red-500 mt-0.5">No location found</div>' : ''}
                        </div>
                        ${!isOptimized ? `<span class="text-sm text-stone-400 shrink-0">${apt.time}</span>` : ''}
                    </div>
                </div>
            `;
        });

        // Total round-trip distance
        if (isOptimized && state.optimizedRoute.total_distance_km != null) {
            const lastLeg = legs[legs.length - 1];
            const returnInfo = lastLeg && lastLeg.to_id === 'home'
                ? `${lastLeg.distance_km} km return`
                : '';
            if (returnInfo) {
                html += `
                    <div class="flex items-center gap-2 py-1 pl-5">
                        <div class="w-px h-4 bg-stone-300"></div>
                        <span class="text-xs text-stone-400">${returnInfo}</span>
                    </div>
                `;
            }
            html += `
                <div class="bg-stone-50 rounded-lg border border-stone-200 p-3 mb-1 flex items-center gap-3">
                    <i data-lucide="home" class="w-5 h-5 text-stone-400"></i>
                    <div class="flex-1">
                        <span class="text-sm font-medium">Total round trip</span>
                        <span class="text-sm text-stone-500 ml-2">${state.optimizedRoute.total_distance_km} km</span>
                    </div>
                </div>
            `;
        }

        // Action buttons
        if (isOptimized) {
            html += `
                <div class="space-y-2 mt-4">
                    <button id="export-maps-btn" class="w-full h-11 flex items-center justify-center gap-2 bg-white border border-stone-200 rounded-lg font-medium text-sm hover:bg-stone-50">
                        <i data-lucide="navigation" class="w-4 h-4"></i>
                        Export to Google Maps
                    </button>
                    <button id="notify-btn" class="w-full h-11 flex items-center justify-center gap-2 bg-white border border-stone-200 rounded-lg font-medium text-sm hover:bg-stone-50">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                        Notify Mothers
                    </button>
                    <button id="start-route-btn" class="w-full h-11 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 flex items-center justify-center gap-2">
                        <i data-lucide="play" class="w-4 h-4"></i>
                        Start Route
                    </button>
                </div>
            `;
        } else {
            const bufferVal = state.user?.buffer_minutes ?? 15;
            html += `
                <div class="mt-4 mb-3 space-y-2">
                    <div class="flex items-center gap-3">
                        <label class="text-sm text-stone-500 whitespace-nowrap">Leave home at</label>
                        <input id="start-time-input" type="time" value="${routeStartTime}"
                            class="h-10 px-3 rounded-lg border border-stone-200 text-sm flex-1" />
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="text-sm text-stone-500 whitespace-nowrap">Buffer between visits</label>
                        <select id="buffer-select" class="h-10 px-3 rounded-lg border border-stone-200 text-sm flex-1">
                            <option value="0" ${bufferVal == 0 ? 'selected' : ''}>None</option>
                            <option value="5" ${bufferVal == 5 ? 'selected' : ''}>5 min</option>
                            <option value="10" ${bufferVal == 10 ? 'selected' : ''}>10 min</option>
                            <option value="15" ${bufferVal == 15 ? 'selected' : ''}>15 min</option>
                            <option value="20" ${bufferVal == 20 ? 'selected' : ''}>20 min</option>
                            <option value="30" ${bufferVal == 30 ? 'selected' : ''}>30 min</option>
                        </select>
                    </div>
                </div>
                <button id="optimize-btn" class="w-full h-12 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 flex items-center justify-center gap-2">
                    <i data-lucide="route" class="w-5 h-5"></i>
                    Optimize Route
                </button>
            `;
        }
    }

    content.innerHTML = html;

    // Event listeners
    document.getElementById('optimize-btn')?.addEventListener('click', optimizeRoute);
    document.getElementById('export-maps-btn')?.addEventListener('click', exportToGoogleMaps);
    document.getElementById('notify-btn')?.addEventListener('click', showNotifySheet);
    document.getElementById('start-route-btn')?.addEventListener('click', startRoute);
    document.getElementById('add-apt-btn')?.addEventListener('click', showAddAppointment);
    document.getElementById('add-apt-empty')?.addEventListener('click', showAddAppointment);
    document.getElementById('import-btn')?.addEventListener('click', showImport);

    // Route settings inputs
    document.getElementById('start-time-input')?.addEventListener('change', (e) => {
        routeStartTime = e.target.value;
    });
    document.getElementById('buffer-select')?.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value);
        try {
            const user = await api.updateMe({ buffer_minutes: val });
            state.user = user;
        } catch (err) {
            showToast('Could not save buffer setting');
        }
    });

    // Appointment card click → edit
    document.querySelectorAll('[data-apt-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const aptId = card.dataset.aptId;
            const apt = (state.optimizedRoute?.ordered_appointments || state.appointments)
                .find(a => a.id === aptId);
            if (apt) showEditAppointment(apt);
        });
    });

    lucide.createIcons();

    // Render map if optimized
    if (isOptimized) {
        setTimeout(() => renderMap(), 50);
    }
}

// ---------------------------------------------------------------------------
// Optimize
// ---------------------------------------------------------------------------

async function optimizeRoute() {
    const btn = document.getElementById('optimize-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Optimizing...';
    lucide.createIcons();

    try {
        const startTime = document.getElementById('start-time-input')?.value || routeStartTime;
        const result = await api.optimizeRoute({ date: state.selectedDate, start_time: startTime });
        state.optimizedRoute = result;
        renderAppointmentList();
    } catch (err) {
        showToast('Optimization failed: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="route" class="w-5 h-5"></i> Optimize Route';
        lucide.createIcons();
    }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function renderMap() {
    const route = state.optimizedRoute;
    if (!route) return;

    mapManager.init('route-map');

    // Home pin
    const user = state.user;
    if (user?.home_lat != null) {
        mapManager.addHomePin(user.home_lat, user.home_lon, user.home_address);
    }

    // Appointment pins
    route.ordered_appointments.forEach((apt, i) => {
        if (apt.lat != null && apt.lon != null) {
            mapManager.addPin(apt.lat, apt.lon, `<strong>${escapeHtml(apt.patient_name)}</strong><br/>${escapeHtml(apt.address || '')}`, i + 1);
        }
    });

    // Route line
    if (route.road_geometry) {
        mapManager.drawRoute(route.road_geometry);
    } else {
        const waypoints = [];
        if (user?.home_lat != null) waypoints.push([user.home_lat, user.home_lon]);
        route.ordered_appointments.forEach(a => {
            if (a.lat != null) waypoints.push([a.lat, a.lon]);
        });
        if (user?.home_lat != null) waypoints.push([user.home_lat, user.home_lon]);
        mapManager.drawDashedRoute(waypoints);
    }

    mapManager.fitBounds();
    lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Export to Google Maps
// ---------------------------------------------------------------------------

function exportToGoogleMaps() {
    const route = state.optimizedRoute;
    if (!route) return;

    const user = state.user;
    const stops = [];

    if (user?.home_lat != null) {
        stops.push(`${user.home_lat},${user.home_lon}`);
    }

    route.ordered_appointments.forEach(apt => {
        if (apt.lat != null && apt.lon != null) {
            stops.push(`${apt.lat},${apt.lon}`);
        }
    });

    if (user?.home_lat != null) {
        stops.push(`${user.home_lat},${user.home_lon}`);
    }

    if (stops.length < 2) {
        showToast('Need at least 2 locations');
        return;
    }

    const url = `https://www.google.com/maps/dir/${stops.join('/')}`;
    window.open(url, '_blank');
}

// ---------------------------------------------------------------------------
// Notify Mothers
// ---------------------------------------------------------------------------

function showNotifySheet() {
    const route = state.optimizedRoute;
    if (!route) return;

    const etas = route.etas || {};

    let messagesHtml = '';
    route.ordered_appointments.forEach(apt => {
        const eta = etas[apt.id] || apt.time;
        // Round ETA to nearest 5 minutes for the message
        const msg = `Hi ${apt.patient_name.split(' ')[0]}, I'll be at your place around ${eta}.`;
        const phone = (apt.phone || '').replace(/\s/g, '');
        const waLink = phone ? `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}` : '';

        messagesHtml += `
            <div class="py-3 ${messagesHtml ? 'border-t border-stone-100' : ''}">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium">${escapeHtml(apt.patient_name)}</span>
                    <span class="text-xs text-stone-400">ETA ${eta}</span>
                </div>
                <p class="text-sm text-stone-600 mb-2">"${escapeHtml(msg)}"</p>
                <div class="flex gap-2">
                    <button class="copy-msg-btn flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 text-sm hover:bg-stone-50" data-msg="${escapeHtml(msg)}">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy
                    </button>
                    ${waLink ? `
                        <a href="${waLink}" target="_blank" class="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 text-sm hover:bg-stone-50">
                            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                        </a>
                    ` : ''}
                    ${phone ? `
                        <a href="tel:${phone}" class="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50">
                            <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    });

    showBottomSheet(`
        <div class="px-4 pb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold">Notify Mothers</h2>
            </div>
            ${messagesHtml}
            <button id="copy-all-btn" class="w-full h-11 mt-3 flex items-center justify-center gap-2 bg-stone-900 text-white rounded-lg font-medium text-sm hover:bg-stone-800">
                <i data-lucide="copy" class="w-4 h-4"></i> Copy All Messages
            </button>
        </div>
    `);

    // Copy individual message buttons
    document.querySelectorAll('.copy-msg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.msg);
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Copied';
            lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy';
                lucide.createIcons();
            }, 2000);
        });
    });

    // Copy all
    document.getElementById('copy-all-btn')?.addEventListener('click', () => {
        const allMsgs = route.ordered_appointments.map(apt => {
            const eta = etas[apt.id] || apt.time;
            return `${apt.patient_name}: Hi ${apt.patient_name.split(' ')[0]}, I'll be at your place around ${eta}.`;
        }).join('\n\n');
        navigator.clipboard.writeText(allMsgs);
        showToast('All messages copied');
    });

    lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Start Route (Driver Mode)
// ---------------------------------------------------------------------------

function startRoute() {
    const route = state.optimizedRoute;
    if (!route) return;

    state.driverMode = {
        active: true,
        currentStopIndex: 0,
        completedStops: [],
        routeDate: state.selectedDate,
        startedAt: new Date().toISOString(),
        route: route,
    };

    // Persist driver mode to localStorage
    localStorage.setItem('juno_driver_mode', JSON.stringify(state.driverMode));

    router.navigateTo('driver');
}

// ---------------------------------------------------------------------------
// Add Appointment (Bottom Sheet)
// ---------------------------------------------------------------------------

async function showAddAppointment() {
    let patients = [];
    try {
        patients = await api.getPatients();
    } catch (e) {}

    const patientOptions = patients.map(p =>
        `<option value="${p.id}">${escapeHtml(p.name)}</option>`
    ).join('');

    showBottomSheet(`
        <div class="px-4 pb-6">
            <h2 class="text-base font-semibold mb-4">Add Appointment</h2>
            <form id="add-apt-form" class="space-y-3">
                <div>
                    <label class="block text-sm font-medium mb-1">Mother</label>
                    <select id="apt-patient" required class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm">
                        <option value="">Select a mother...</option>
                        ${patientOptions}
                        <option value="__new">+ Add new mother</option>
                    </select>
                </div>
                <div id="new-patient-fields" class="hidden space-y-3">
                    <input id="new-patient-name" type="text" placeholder="Mother's name"
                        class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    <input id="new-patient-address" type="text" placeholder="Address"
                        class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    <input id="new-patient-phone" type="tel" placeholder="Phone (optional)"
                        class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Date</label>
                        <input id="apt-date" type="date" value="${state.selectedDate}" required
                            class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Time</label>
                        <input id="apt-time" type="time" value="09:00" required
                            class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Type</label>
                    <div class="flex gap-2">
                        <label class="flex-1">
                            <input type="radio" name="apt-kind" value="fixed" checked class="hidden peer" />
                            <div class="h-10 flex items-center justify-center rounded-lg border border-stone-200 text-sm peer-checked:bg-stone-900 peer-checked:text-white peer-checked:border-stone-900 cursor-pointer">Fixed</div>
                        </label>
                        <label class="flex-1">
                            <input type="radio" name="apt-kind" value="flexible" class="hidden peer" />
                            <div class="h-10 flex items-center justify-center rounded-lg border border-stone-200 text-sm peer-checked:bg-stone-900 peer-checked:text-white peer-checked:border-stone-900 cursor-pointer">Flex</div>
                        </label>
                    </div>
                </div>
                <div id="window-end-field" class="hidden">
                    <label class="block text-sm font-medium mb-1">Flexible until</label>
                    <input id="apt-window-end" type="time" value="13:00"
                        class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Visit type</label>
                        <select id="apt-visit-type" class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm">
                            <option value="prenatal">Prenatal</option>
                            <option value="postnatal">Postnatal</option>
                            <option value="birth">Birth</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Duration</label>
                        <select id="apt-duration" class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm">
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60" selected>1 hr</option>
                            <option value="90">1.5 hr</option>
                            <option value="120">2 hr</option>
                        </select>
                    </div>
                </div>
                <button type="submit" id="apt-submit"
                    class="w-full h-11 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 mt-2">
                    Add Appointment
                </button>
            </form>
        </div>
    `);

    // Toggle new patient fields
    document.getElementById('apt-patient').addEventListener('change', (e) => {
        document.getElementById('new-patient-fields').classList.toggle('hidden', e.target.value !== '__new');
    });

    // Toggle window end field
    document.querySelectorAll('input[name="apt-kind"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('window-end-field').classList.toggle('hidden', e.target.value !== 'flexible');
        });
    });

    // Submit
    document.getElementById('add-apt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('apt-submit');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            let patientId = document.getElementById('apt-patient').value;

            if (patientId === '__new') {
                const name = document.getElementById('new-patient-name').value.trim();
                const address = document.getElementById('new-patient-address').value.trim();
                const phone = document.getElementById('new-patient-phone').value.trim();
                if (!name || !address) { showToast('Name and address are required'); return; }
                const patient = await api.createPatient({ name, address, phone });
                patientId = patient.id;
            }

            const kind = document.querySelector('input[name="apt-kind"]:checked').value;
            const time = document.getElementById('apt-time').value;

            await api.createAppointment({
                patient_id: patientId,
                date: document.getElementById('apt-date').value,
                time: time,
                visit_type: document.getElementById('apt-visit-type').value,
                duration_minutes: parseInt(document.getElementById('apt-duration').value),
                appointment_kind: kind,
                window_start: time,
                window_end: kind === 'flexible' ? document.getElementById('apt-window-end').value : '',
            });

            closeBottomSheet();
            await loadAppointments();
            showToast('Appointment added');
        } catch (err) {
            showToast(err.message);
            btn.disabled = false;
            btn.textContent = 'Add Appointment';
        }
    });
}

// ---------------------------------------------------------------------------
// Edit Appointment
// ---------------------------------------------------------------------------

function showEditAppointment(apt) {
    const isFixed = apt.appointment_kind === 'fixed';
    const isFlex = !isFixed;

    showBottomSheet(`
        <div class="px-4 pb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold">Edit Appointment</h2>
                <button id="delete-apt-btn" class="p-2 rounded-lg hover:bg-red-50 text-red-500">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
            <form id="edit-apt-form" class="space-y-3">
                <div>
                    <label class="block text-sm font-medium mb-1">Mother</label>
                    <div class="h-10 px-3 flex items-center rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-600">
                        ${escapeHtml(apt.patient_name)}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Date</label>
                        <input id="edit-date" type="date" value="${apt.date}" required
                            class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Time</label>
                        <input id="edit-time" type="time" value="${apt.time}" required
                            class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Type</label>
                    <div class="flex gap-2">
                        <label class="flex-1">
                            <input type="radio" name="edit-kind" value="fixed" ${isFixed ? 'checked' : ''} class="hidden peer" />
                            <div class="h-10 flex items-center justify-center rounded-lg border border-stone-200 text-sm peer-checked:bg-stone-900 peer-checked:text-white peer-checked:border-stone-900 cursor-pointer">Fixed</div>
                        </label>
                        <label class="flex-1">
                            <input type="radio" name="edit-kind" value="flexible" ${isFlex ? 'checked' : ''} class="hidden peer" />
                            <div class="h-10 flex items-center justify-center rounded-lg border border-stone-200 text-sm peer-checked:bg-stone-900 peer-checked:text-white peer-checked:border-stone-900 cursor-pointer">Flex</div>
                        </label>
                    </div>
                </div>
                <div id="edit-window-end-field" class="${isFlex ? '' : 'hidden'}">
                    <label class="block text-sm font-medium mb-1">Flexible until</label>
                    <input id="edit-window-end" type="time" value="${apt.window_end || '13:00'}"
                        class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Visit type</label>
                        <select id="edit-visit-type" class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm">
                            <option value="prenatal" ${apt.visit_type === 'prenatal' ? 'selected' : ''}>Prenatal</option>
                            <option value="postnatal" ${apt.visit_type === 'postnatal' ? 'selected' : ''}>Postnatal</option>
                            <option value="birth" ${apt.visit_type === 'birth' ? 'selected' : ''}>Birth</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Duration</label>
                        <select id="edit-duration" class="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm">
                            <option value="15" ${apt.duration_minutes == 15 ? 'selected' : ''}>15 min</option>
                            <option value="30" ${apt.duration_minutes == 30 ? 'selected' : ''}>30 min</option>
                            <option value="45" ${apt.duration_minutes == 45 ? 'selected' : ''}>45 min</option>
                            <option value="60" ${apt.duration_minutes == 60 || !apt.duration_minutes ? 'selected' : ''}>1 hr</option>
                            <option value="90" ${apt.duration_minutes == 90 ? 'selected' : ''}>1.5 hr</option>
                            <option value="120" ${apt.duration_minutes == 120 ? 'selected' : ''}>2 hr</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Notes</label>
                    <textarea id="edit-notes" rows="2" placeholder="Optional notes"
                        class="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm resize-none">${escapeHtml(apt.notes || '')}</textarea>
                </div>
                <button type="submit" id="edit-submit"
                    class="w-full h-11 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 mt-2">
                    Save Changes
                </button>
            </form>
        </div>
    `);

    // Toggle window end field
    document.querySelectorAll('input[name="edit-kind"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('edit-window-end-field').classList.toggle('hidden', e.target.value !== 'flexible');
        });
    });

    // Delete
    document.getElementById('delete-apt-btn').addEventListener('click', async () => {
        if (!confirm('Cancel this appointment?')) return;
        try {
            await api.cancelAppointment(apt.id);
            closeBottomSheet();
            await loadAppointments();
            showToast('Appointment cancelled');
        } catch (err) {
            showToast(err.message);
        }
    });

    // Submit
    document.getElementById('edit-apt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('edit-submit');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const kind = document.querySelector('input[name="edit-kind"]:checked').value;
            const time = document.getElementById('edit-time').value;

            await api.updateAppointment(apt.id, {
                date: document.getElementById('edit-date').value,
                time: time,
                visit_type: document.getElementById('edit-visit-type').value,
                duration_minutes: parseInt(document.getElementById('edit-duration').value),
                appointment_kind: kind,
                window_start: time,
                window_end: kind === 'flexible' ? document.getElementById('edit-window-end').value : '',
                notes: document.getElementById('edit-notes').value,
            });

            closeBottomSheet();
            await loadAppointments();
            showToast('Appointment updated');
        } catch (err) {
            showToast(err.message);
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });

    lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function showImport() {
    // Dynamically load import module
    const { showImportSheet } = await import('../import.js');
    showImportSheet(async () => {
        await loadAppointments();
    });
}

// ---------------------------------------------------------------------------
// Bottom Sheet & Toast utilities
// ---------------------------------------------------------------------------

function showBottomSheet(html) {
    closeBottomSheet();

    const backdrop = document.createElement('div');
    backdrop.className = 'bottom-sheet-backdrop';
    backdrop.id = 'bs-backdrop';
    backdrop.addEventListener('click', closeBottomSheet);

    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.id = 'bs-sheet';
    sheet.innerHTML = `<div class="drag-handle"></div>${html}`;

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    requestAnimationFrame(() => {
        backdrop.classList.add('open');
        sheet.classList.add('open');
    });

    lucide.createIcons();
}

function closeBottomSheet() {
    const backdrop = document.getElementById('bs-backdrop');
    const sheet = document.getElementById('bs-sheet');
    if (backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 300);
    }
    if (sheet) {
        sheet.classList.remove('open');
        setTimeout(() => sheet.remove(), 300);
    }
}

function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Make these available globally for other modules
window.showBottomSheet = showBottomSheet;
window.closeBottomSheet = closeBottomSheet;
window.showToast = showToast;

export const todayView = { render };
