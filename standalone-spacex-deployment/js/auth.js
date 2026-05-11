/**
 * auth.js — Authentication layer
 *
 * All auth calls go through this file. To swap the provider (e.g. move to
 * Firebase Auth, Supabase, or a different OTP backend), update only this file
 * and firebase-config.js — the page scripts stay unchanged.
 *
 * Current implementation: server-side OTP via /api, session in localStorage.
 */

const API_BASE = '/api';

/**
 * Send a 6-digit OTP to the given email address.
 * Throws with a user-readable message on failure.
 */
export async function sendOTP(email) {
    const res = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
    return data;
}

/**
 * Verify an OTP code for the given email.
 * Returns { success: boolean, error?: string }
 */
export async function verifyOTP(email, code) {
    const res = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    return { success: res.ok && data.success === true, error: data.error };
}

/**
 * Session management — backed by localStorage.
 * To upgrade to Firebase Auth tokens, replace these four functions.
 */
export function saveSession(email) {
    localStorage.setItem('session_email', email);
}

export function getSession() {
    return localStorage.getItem('session_email');
}

export function clearSession() {
    localStorage.removeItem('session_email');
}

export function isLoggedIn() {
    return !!getSession();
}
