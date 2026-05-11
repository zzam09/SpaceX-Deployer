# SpaceX Membership Portal

A membership portal with OTP-based login, admin member management, and user profile pages — backed by Firebase Firestore and Resend for email delivery.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `npm --prefix standalone-spacex-deployment run dev` — run the SpaceX frontend (port 19742)

## Stack

### API Server (`artifacts/api-server`)
- Node.js 24, TypeScript 5.9, Express 5
- OTP generation, storage, and verification (in-memory)
- Email delivery via Resend SDK

### SpaceX Frontend (`standalone-spacex-deployment`)
- Vanilla HTML + JS (no framework)
- Vite for dev server + build
- Firebase Firestore for member data
- Firebase Auth exported (ready to use for session upgrade)

## Where things live

```
standalone-spacex-deployment/
├── js/
│   ├── firebase-config.js   ← Single Firebase init, exports { app, db, auth }
│   ├── auth.js              ← Auth abstraction layer (swap provider here)
│   ├── admin.js             ← Admin panel — CRUD against Firestore `members`
│   └── user.js              ← Member profile page
├── pages/
│   ├── shared.css           ← All CSS variables, reset, animations
│   ├── login.html           ← 6-digit OTP login flow
│   ├── user.html            ← Member profile portal
│   └── admin.html           ← Admin member management panel
└── vite.config.js

artifacts/api-server/src/
├── lib/otp-store.ts         ← In-memory OTP store (swap to Redis/Firestore here)
└── routes/otp.ts            ← POST /api/send-otp, POST /api/verify-otp
```

## Architecture decisions

- **Server-side OTP**: codes are generated and stored on the API server — the client never sees the code. This prevents anyone from reading the OTP from the network or localStorage.
- **`auth.js` is the only file to change when swapping auth providers** — all page scripts import only from `auth.js`. Comments inside point to which functions to replace for Firebase Auth or Supabase.
- **OTP store is swappable**: `artifacts/api-server/src/lib/otp-store.ts` has a documented interface. Replace with Redis or Firestore by implementing the same `save`, `verify`, `canSend` exports.
- **6-digit OTP** — 10× more combinations than 4-digit, with server-side attempt limiting (max 5 per code) and a 60s per-email send cooldown.
- **`firebase-config.js` exports `auth`** — Firebase Auth is initialized and exported but not yet used for session management. The session currently lives in `localStorage`; upgrading to Firebase Auth sessions only requires changing `saveSession`, `getSession`, `clearSession`, `isLoggedIn` in `auth.js`.

## Product

- Email OTP login — member types their email, receives a 6-digit code, enters it to access their profile
- Member profile page — shows tier, clearance level, status, avatar, and membership benefits
- Admin panel — full CRUD (add, edit, delete) on the Firestore `members` collection

## Required Environment Variables

| Key | Where | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Shared env | Firebase client config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Shared env | Firebase client config |
| `VITE_FIREBASE_PROJECT_ID` | Shared env | Firebase client config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Shared env | Firebase client config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Shared env | Firebase client config |
| `VITE_FIREBASE_APP_ID` | Shared env | Firebase client config |
| `RESEND_API_KEY` | Shared env | API server email delivery |
| `RESEND_FROM_EMAIL` | Optional env | Sender address (default: `onboarding@resend.dev`) |
| `APP_NAME` | Optional env | Name shown in emails (default: `SpaceX HQ`) |

## Gotchas

- **Resend from address**: `onboarding@resend.dev` only works for emails sent to the Resend account owner. For production, set `RESEND_FROM_EMAIL` to an address on a verified Resend domain.
- **OTP store is in-memory** — codes are lost on API server restart. Acceptable for development; use Redis or Firestore for production persistence.
- **Firestore security rules** — the `members` collection must allow reads for authenticated queries. The `otps` collection is no longer used and can be deleted from Firestore.

## User preferences

- Firebase for auth/db (Firestore for member data, Resend for email OTP delivery)
- Keep it extensible — auth provider is swappable via `auth.js` only
