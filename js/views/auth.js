/**
 * views/auth.js — Login / Register
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';

let mode = 'login';

function render(container) {
    document.getElementById('app-header').classList.add('hidden');

    container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center py-12">
            <div class="w-full max-w-sm">
                <h1 class="text-xl font-semibold text-center mb-8">Juno</h1>

                <div id="auth-error" class="hidden bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"></div>

                <form id="auth-form" class="space-y-4">
                    <div id="name-field" class="${mode === 'login' ? 'hidden' : ''}">
                        <label class="block text-sm font-medium mb-1" for="auth-name">Name</label>
                        <input id="auth-name" type="text" placeholder="Your name"
                            class="w-full h-11 px-3 rounded-lg border border-stone-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1" for="auth-email">Email</label>
                        <input id="auth-email" type="email" placeholder="you@example.com" required
                            class="w-full h-11 px-3 rounded-lg border border-stone-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1" for="auth-password">Password</label>
                        <input id="auth-password" type="password" placeholder="Min. 8 characters" required minlength="8"
                            class="w-full h-11 px-3 rounded-lg border border-stone-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent" />
                    </div>
                    <button type="submit" id="auth-submit"
                        class="w-full h-11 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 active:bg-stone-950 transition-colors">
                        ${mode === 'login' ? 'Sign in' : 'Create account'}
                    </button>
                </form>

                <p class="text-sm text-stone-500 text-center mt-6">
                    ${mode === 'login'
                        ? 'Don\'t have an account? <button id="auth-toggle" class="text-stone-900 font-medium underline">Sign up</button>'
                        : 'Already have an account? <button id="auth-toggle" class="text-stone-900 font-medium underline">Sign in</button>'}
                </p>
            </div>
        </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', handleSubmit);
    document.getElementById('auth-toggle').addEventListener('click', () => {
        mode = mode === 'login' ? 'register' : 'login';
        render(container);
    });

    document.getElementById('auth-email').focus();
}

async function handleSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value || '';

    const btn = document.getElementById('auth-submit');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
        let user;
        if (mode === 'register') {
            if (!name.trim()) throw new Error('Name is required');
            user = await api.register({ email, password, name });
        } else {
            user = await api.login({ email, password });
        }
        state.user = user;
        router.navigateTo('today');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = mode === 'login' ? 'Sign in' : 'Create account';
    }
}

export const authView = { render };
