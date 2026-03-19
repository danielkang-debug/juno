/**
 * views/calendar.js — Simple month view with appointment dots
 */

import { api } from '../api.js';
import { router } from '../router.js';

let container = null;
let currentMonth = ''; // YYYY-MM

function render(el, params) {
    container = el;
    const headerTitle = document.getElementById('header-title');
    headerTitle.textContent = 'Calendar';

    const today = new Date();
    currentMonth = params.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    renderMonth();
}

async function renderMonth() {
    const [year, month] = currentMonth.split('-').map(Number);
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    container.innerHTML = `
        <div class="py-4">
            <div class="flex items-center justify-between mb-4">
                <button id="cal-prev" class="p-2 rounded-lg hover:bg-stone-100">
                    <i data-lucide="chevron-left" class="w-5 h-5"></i>
                </button>
                <span class="text-base font-semibold">${monthName}</span>
                <button id="cal-next" class="p-2 rounded-lg hover:bg-stone-100">
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Day headers -->
            <div class="grid grid-cols-7 text-center mb-2">
                ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
                    `<span class="text-xs text-stone-400 font-medium">${d}</span>`
                ).join('')}
            </div>

            <!-- Calendar grid -->
            <div id="cal-grid" class="grid grid-cols-7 gap-1">
                <div class="flex items-center justify-center py-4 text-stone-400">
                    <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
                </div>
            </div>
        </div>
    `;

    document.getElementById('cal-prev').addEventListener('click', () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        renderMonth();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m, 1);
        currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        renderMonth();
    });

    lucide.createIcons();

    // Load appointment counts
    try {
        const counts = await api.getAppointments({ month: currentMonth });
        const countMap = {};
        counts.forEach(c => { countMap[c.date] = c.count; });
        renderGrid(year, month, countMap);
    } catch (e) {
        renderGrid(year, month, {});
    }
}

function renderGrid(year, month, countMap) {
    const grid = document.getElementById('cal-grid');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const today = new Date().toISOString().split('T')[0];

    // Monday-based: getDay() returns 0=Sun, we want 0=Mon
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    let html = '';

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
        html += '<div></div>';
    }

    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const count = countMap[dateStr] || 0;
        const isToday = dateStr === today;

        html += `
            <button class="cal-day aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                ${isToday ? 'bg-stone-900 text-white' : 'hover:bg-stone-100'}
                ${count > 0 ? 'font-medium' : 'text-stone-400'}"
                data-date="${dateStr}">
                ${d}
                ${count > 0 ? `<span class="w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-stone-900'} mt-0.5"></span>` : ''}
            </button>
        `;
    }

    grid.innerHTML = html;

    // Click handlers
    grid.querySelectorAll('.cal-day').forEach(btn => {
        btn.addEventListener('click', () => {
            router.navigateTo('today', { date: btn.dataset.date });
        });
    });
}

export const calendarView = { render };
