/**
 * Vercel Serverless Function: POST /api/send-otp
 *
 * Generates a 6-digit OTP, stores it in Firestore, and emails it via Resend.
 * No extra services needed — uses the same Firebase project as the frontend.
 */

import { Resend } from 'resend';

const PROJECT_ID  = process.env.VITE_FIREBASE_PROJECT_ID;
const API_KEY     = process.env.VITE_FIREBASE_API_KEY;
const FROM_EMAIL  = process.env.RESEND_FROM_EMAIL ?? 'SpaceX HQ <onboarding@resend.dev>';
const APP_NAME    = process.env.APP_NAME ?? 'SpaceX HQ';

const OTP_DIGITS    = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;   // 10 minutes
const COOLDOWN_MS   = 60 * 1000;         // 60 seconds between sends
const MAX_ATTEMPTS  = 5;

// ── Firestore REST helpers ───────────────────────────────────────────────────

/** Encode email as a safe Firestore document ID */
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
        expiry:   Number(fields?.expiry?.integerValue  ?? 0),
        sentAt:   Number(fields?.sentAt?.integerValue  ?? 0),
        attempts: Number(fields?.attempts?.integerValue ?? 0),
    };
}

async function writeDoc(email, code) {
    const res = await fetch(firestoreUrl(email), {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                code:     { stringValue:  code },
                expiry:   { integerValue: String(Date.now() + OTP_EXPIRY_MS) },
                sentAt:   { integerValue: String(Date.now()) },
                attempts: { integerValue: '0' },
            },
        }),
    });
    if (!res.ok) throw new Error('Firestore write failed');
}

// ── Email template ───────────────────────────────────────────────────────────

function buildEmail(code) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
               width="100" alt="${APP_NAME}" style="filter:brightness(0) invert(1);display:block;">
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.1em;">Verification Code</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#fff;letter-spacing:-0.02em;">Your sign-in code</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
            Use the code below to sign in to the ${APP_NAME} portal.
            It expires in <strong style="color:#a1a1aa;">10 minutes</strong> and can only be used once.
          </p>
          <div style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
            <span style="font-family:'Courier New',monospace;font-size:42px;font-weight:700;letter-spacing:0.2em;color:#fff;">${code}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#52525b;line-height:1.6;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;font-size:11px;color:#3f3f46;font-family:'Courier New',monospace;letter-spacing:0.04em;text-transform:uppercase;">
            ${APP_NAME} &mdash; Restricted Access
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body ?? {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        return res.status(400).json({ error: 'A valid email address is required.' });
    }

    // Enforce send cooldown
    try {
        const existing = await readDoc(email);
        if (existing && Date.now() - existing.sentAt < COOLDOWN_MS) {
            const secs = Math.ceil((COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
            return res.status(429).json({ error: `Please wait ${secs}s before requesting another code.` });
        }
    } catch {
        // No existing document — continue
    }

    // Generate and store OTP
    const min  = Math.pow(10, OTP_DIGITS - 1);
    const code = String(Math.floor(min + Math.random() * (Math.pow(10, OTP_DIGITS) - min)));

    try {
        await writeDoc(email, code);
    } catch {
        return res.status(500).json({ error: 'Could not save verification code. Check Firestore rules.' });
    }

    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
        from:    FROM_EMAIL,
        to:      email,
        subject: `${code} — your ${APP_NAME} verification code`,
        html:    buildEmail(code),
    });

    if (error) {
        return res.status(500).json({ error: 'Failed to send email. Check your RESEND_API_KEY.' });
    }

    return res.json({ success: true });
}
