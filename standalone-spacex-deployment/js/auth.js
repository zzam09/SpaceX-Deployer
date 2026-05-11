import { db } from './firebase-config-test.js';
import {
    collection, doc, setDoc, getDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

export function generateOTP() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

export async function saveOTP(email, code) {
    const expiry = Date.now() + 10 * 60 * 1000;
    console.log('🔥 Firestore: Attempting to save OTP for email:', email);
    console.log('🔥 Firestore: OTP code:', code);
    console.log('🔥 Firestore: Expiry time:', new Date(expiry));
    try {
        await setDoc(doc(collection(db, 'otps'), email), {
            email,
            code,
            expiry
        });
        console.log('✅ Firestore: OTP saved successfully');
    } catch (error) {
        console.error('❌ Firestore: Failed to save OTP:', error);
        throw error;
    }
}

export async function verifyOTP(email, code) {
    const ref = doc(collection(db, 'otps'), email);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const { code: savedCode, expiry } = snap.data();
    if (savedCode !== code || Date.now() > expiry) return false;
    await deleteDoc(ref);
    return true;
}

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
