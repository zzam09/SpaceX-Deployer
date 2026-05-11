# Deploy the SpaceX Membership Portal

**No coding required. Everything happens in your browser. Takes about 15 minutes.**

You will use four free services:

| Service | What it does | Sign-up link |
|---|---|---|
| **Firebase** | Stores your member database | [firebase.google.com](https://firebase.google.com) |
| **Resend** | Sends the login emails | [resend.com](https://resend.com) |
| **GitHub** | Stores your project files | [github.com](https://github.com) |
| **Vercel** | Hosts your live website | [vercel.com](https://vercel.com) |

All four are free for small projects. You do not need a credit card for any of them.

---

## Part 1 — Set up Firebase (5 minutes)

Firebase stores your list of members and temporarily holds the login codes your members receive by email.

**1.** Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.

**2.** Click **"Add project"**, give it a name (e.g. `spacex-portal`), and click through the setup wizard. Turn off Google Analytics when asked — you don't need it.

**3.** On the left sidebar, click **Build → Firestore Database**.

**4.** Click **"Create database"**, choose **"Start in test mode"**, and pick any server location near you. Click **"Enable"**.

**5.** Now set the security rules. Click the **"Rules"** tab and replace everything in the box with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /members/{memberId} {
      allow read, write: if true;
    }
    match /otps/{email} {
      allow read, write: if true;
    }
  }
}
```

Click **"Publish"**.

**6.** Now get your credentials. Click the gear icon next to "Project Overview" in the left sidebar → **"Project settings"**.

Scroll down to **"Your apps"**. If you don't see an app there, click the **`</>`** (web) icon to add one, give it a nickname, and click "Register app".

You will see a block of code that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

**Keep this tab open** — you will copy these values into Vercel in Part 4.

---

## Part 2 — Set up Resend (2 minutes)

Resend sends the 6-digit login codes to your members by email.

**1.** Go to [resend.com](https://resend.com) and create a free account.

**2.** After signing in, click **"API Keys"** in the left sidebar.

**3.** Click **"Create API Key"**, give it any name (e.g. `spacex-portal`), and click **"Add"**.

**4.** Copy the API key — it starts with `re_`. **Save it somewhere safe.** You will only see it once.

> **Testing vs. production emails**
>
> Out of the box, Resend will only send emails to the address you used to sign up. This is fine for testing yourself. When you are ready for real members to receive emails, go to Resend → **Domains**, add your domain, follow the DNS instructions, and set the `RESEND_FROM_EMAIL` environment variable in Vercel (see Part 4, step 6).

---

## Part 3 — Upload to GitHub (3 minutes)

GitHub stores your files so Vercel can pull from them automatically.

**1.** Go to [github.com](https://github.com) and sign in (or create a free account).

**2.** Click the **"+"** icon in the top-right → **"New repository"**.

**3.** Give the repository a name (e.g. `spacex-portal`). Leave everything else as the default. Click **"Create repository"**.

**4.** On your computer, open the `standalone-spacex-deployment` folder. Select all files inside it.

**5.** Drag and drop them into the GitHub repository page in your browser. GitHub will ask for a commit message — leave the default and click **"Commit changes"**.

> If drag-and-drop does not work in your browser, click **"uploading an existing file"** link on the empty repository page instead.

---

## Part 4 — Deploy on Vercel (5 minutes)

Vercel publishes your site and runs the email code server automatically.

**1.** Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.

**2.** Click **"Add New…"** → **"Project"**.

**3.** Find your repository in the list and click **"Import"** next to it.

**4.** Vercel will auto-detect Vite. You do not need to change anything under "Build & Output Settings".

**5.** Before clicking Deploy, click **"Environment Variables"** to expand that section. You need to add the following variables one by one. For each one: type the name in the "Key" box, paste the value in the "Value" box, and click "Add".

| Variable name | Where to get the value |
|---|---|
| `VITE_FIREBASE_API_KEY` | From `apiKey` in your Firebase config (Part 1, step 6) |
| `VITE_FIREBASE_AUTH_DOMAIN` | From `authDomain` in your Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | From `projectId` in your Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | From `storageBucket` in your Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From `messagingSenderId` in your Firebase config |
| `VITE_FIREBASE_APP_ID` | From `appId` in your Firebase config |
| `RESEND_API_KEY` | The key from Resend that starts with `re_` (Part 2, step 4) |

**6.** Click **"Deploy"**. Vercel will build and publish the site. When it shows a confetti animation, you are live.

**7.** Click **"Continue to Dashboard"** to see your live URL (it will look like `your-project.vercel.app`).

---

## Part 5 — Add your first member (2 minutes)

The portal uses a list of approved emails in your Firestore database. **A person can only log in if their email is in this list.**

**1.** Open your live site and go to `/pages/admin` (e.g. `your-project.vercel.app/pages/admin`).

**2.** Use the admin panel to add a member. Fill in their email address, name, tier, and any other details.

**3.** That member can now go to `/pages/login`, enter their email, receive a 6-digit code, and log in.

---

## Updating the site later

Whenever you want to change something, update the files in your GitHub repository (drag and drop new versions, or edit files directly on GitHub). Vercel will automatically detect the change and redeploy the site within a minute or two. No extra steps needed.

---

## Troubleshooting

**Members say they never received the email.**
Check that you added `RESEND_API_KEY` correctly in Vercel. For testing, the email only delivers to the address you used to sign up on Resend. For real members, you need a custom domain — see the note in Part 2.

**Login says "code expired" immediately.**
The OTP codes are stored in Firestore. Check that your Firestore rules are set exactly as shown in Part 1, step 5, and that you clicked "Publish" after saving them.

**The admin panel shows no members.**
Firestore starts empty. You need to add members through the admin panel before anyone can log in.

**I see an error about Firebase.**
Double-check that all seven environment variables are entered correctly in Vercel (Project → Settings → Environment Variables). After fixing them, go to **Deployments → Redeploy** for the changes to take effect.

**The site is returning 404 errors on pages.**
Make sure you uploaded all files including `vercel.json`. That file tells Vercel how to route the pages correctly.
