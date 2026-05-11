/**
 * Vercel Serverless Function: POST /api/verify-otp
 *
 * Verifies a 6-digit OTP against the Firestore record.
 * Deletes the record after a successful verification (single-use codes).
 */

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const API_KEY    = process.env.VITE_FIREBASE_API_KEY;

const MAX_ATTEMPTS = 5;

// ── Firestore REST helpers ───────────────────────────────────────────────────

function toDocId(email) {
    return email.replace(/@/g, '__at__').replace(/\./g, '__dot__');
}

function firestoreUrl(email) {
    return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/otps/${toDocId(email)}?key=${API_KEY}`;
}

async function readDoc(email) {
    const res = await fetch(firestoreUrl(email));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Firestore read failed');
    const { fields } = await res.json();
    return {
        code:     fields?.code?.stringValue,
        expiry:   Number(fields?.expiry?.integerValue   ?? 0),
        attempts: Number(fields?.attempts?.integerValue ?? 0),
    };
}

async function incrementAttempts(email, current) {
    await fetch(firestoreUrl(email), {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                code:     { stringValue:  current.code },
                expiry:   { integerValue: String(current.expiry) },
                sentAt:   { integerValue: String(Date.now()) }, // preserve
                attempts: { integerValue: String(current.attempts + 1) },
            },
        }),
    });
}

async function deleteDoc(email) {
    await fetch(firestoreUrl(email), { method: 'DELETE' });
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, code } = req.body ?? {};

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required.' });
    }

    let doc;
    try {
        doc = await readDoc(email);
    } catch {
        return res.status(500).json({ error: 'Could not reach the database. Try again.' });
    }

    if (!doc) {
        return res.status(401).json({ success: false, error: 'Code expired. Please request a new one.' });
    }

    if (Date.now() > doc.expiry) {
        await deleteDoc(email).catch(() => {});
        return res.status(401).json({ success: false, error: 'Code expired. Please request a new one.' });
    }

    if (doc.attempts >= MAX_ATTEMPTS) {
        await deleteDoc(email).catch(() => {});
        return res.status(401).json({ success: false, error: 'Too many attempts. Please request a new code.' });
    }

    if (doc.code !== String(code)) {
        await incrementAttempts(email, doc).catch(() => {});
        const remaining = MAX_ATTEMPTS - (doc.attempts + 1);
        return res.status(401).json({
            success: false,
            error: remaining > 0
                ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                : 'Too many attempts. Please request a new code.',
        });
    }

    // Code is correct — delete it (single-use)
    await deleteDoc(email).catch(() => {});
    return res.json({ success: true });
}
