/**
 * In-memory OTP store.
 *
 * Swappable: replace `save` / `verify` / `canSend` with Redis, Firestore,
 * or any other backend without touching the routes.
 */

interface OTPEntry {
    code: string;
    expiry: number;
    attempts: number;
    sentAt: number;
}

const store = new Map<string, OTPEntry>();

export const OTP_DIGITS = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SEND_COOLDOWN_MS = 60 * 1000;

export function generateCode(): string {
    const min = Math.pow(10, OTP_DIGITS - 1);
    const max = Math.pow(10, OTP_DIGITS);
    return String(Math.floor(min + Math.random() * (max - min)));
}

export function canSend(email: string): { allowed: boolean; waitMs: number } {
    const entry = store.get(email);
    if (!entry) return { allowed: true, waitMs: 0 };
    const remaining = SEND_COOLDOWN_MS - (Date.now() - entry.sentAt);
    return remaining > 0
        ? { allowed: false, waitMs: remaining }
        : { allowed: true, waitMs: 0 };
}

export function save(email: string, code: string): void {
    store.set(email, {
        code,
        expiry: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
        sentAt: Date.now(),
    });
}

export type VerifyResult = "ok" | "invalid" | "expired" | "too_many_attempts";

export function verify(email: string, code: string): VerifyResult {
    const entry = store.get(email);
    if (!entry) return "expired";
    if (Date.now() > entry.expiry) {
        store.delete(email);
        return "expired";
    }
    entry.attempts++;
    if (entry.attempts > MAX_ATTEMPTS) {
        store.delete(email);
        return "too_many_attempts";
    }
    if (entry.code !== code) return "invalid";
    store.delete(email);
    return "ok";
}
