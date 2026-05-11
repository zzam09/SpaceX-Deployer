# SpaceX HQ Deployment Guide

This guide provides step-by-step instructions for deploying the SpaceX HQ membership portal to Vercel with zero configuration headaches.

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account**: Your project must be pushed to a GitHub repository.
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3. **Supabase Project** (Recommended): Set up at [supabase.com](https://supabase.com) for authentication and database.
4. **Environment Variables**: Prepare your API keys and configuration values.

## Step 1: Prepare Your Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Firebase Configuration (if using Firebase instead)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Note**: Never commit `.env.local` to version control. Use `.env.example` as a template for team members.

## Step 2: Test Locally

Before deploying, test the build locally to ensure everything works:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Preview the production build
npm run serve
```

Verify that:
- The build completes without errors.
- All pages are accessible (home, login, user dashboard, admin panel).
- Static assets (CSS, JS, images) load correctly.

## Step 3: Push to GitHub

Ensure your project is committed and pushed to GitHub:

```bash
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main
```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended for Beginners)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **"Add New"** → **"Project"**.
3. Select your GitHub repository.
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
5. Click **"Environment Variables"** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (Any other required variables from your `.env.local`)
6. Click **"Deploy"**.

### Option B: Via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Deploy from your project directory:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to your Vercel account.
   - Confirm the project name and settings.
   - Add environment variables when prompted.

4. Once deployed, Vercel will provide your production URL.

## Step 5: Configure Environment Variables on Vercel

If you didn't add environment variables during deployment:

1. Go to your project on [vercel.com/dashboard](https://vercel.com/dashboard).
2. Click on your project.
3. Go to **Settings** → **Environment Variables**.
4. Add each variable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Any other required variables.
5. Click **"Save"**.

**Important**: Redeploy after adding environment variables for them to take effect:
```bash
vercel --prod
```

## Step 6: Verify Deployment

Once deployed, test all routes:

- **Home**: `https://your-domain.vercel.app/`
- **Login**: `https://your-domain.vercel.app/pages/login`
- **User Dashboard**: `https://your-domain.vercel.app/pages/user`
- **Admin Panel**: `https://your-domain.vercel.app/pages/admin`

All pages should load without 404 errors.

## Troubleshooting

### 404 Errors on Specific Routes

**Cause**: Routes are not being rewritten to their HTML files.

**Solution**: Ensure `vercel.json` contains the correct rewrites. The file should already be configured in your project.

### Environment Variables Not Loading

**Cause**: Variables not added to Vercel or not prefixed with `VITE_`.

**Solution**:
1. Verify variables are added in Vercel's Environment Variables settings.
2. Ensure all variables are prefixed with `VITE_` (for Vite to expose them to the client).
3. Redeploy after adding variables.

### Build Fails

**Cause**: Missing dependencies or build errors.

**Solution**:
1. Check the Vercel build logs for specific error messages.
2. Run `npm install` locally and verify the build succeeds.
3. Commit and push any fixes to GitHub, then redeploy.

### Static Assets Not Loading

**Cause**: Incorrect `base` path in `vite.config.ts`.

**Solution**: Ensure `BASE_PATH` environment variable is set correctly (default is `/`).

## Continuous Deployment

Once deployed, Vercel automatically redeploys your project whenever you push changes to your GitHub repository. No additional configuration is needed.

### To Update Your Deployment:

1. Make changes locally.
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "your commit message"
   git push origin main
   ```
3. Vercel will automatically detect the changes and redeploy.

## Custom Domain (Optional)

To use a custom domain:

1. Go to your project on [vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **Settings** → **Domains**.
3. Add your custom domain and follow the DNS configuration instructions.

## Performance Optimization

The `vercel.json` file includes caching headers to optimize performance:

- **HTML files**: Cached for 1 hour.
- **Static assets** (JS, CSS, images): Cached indefinitely (with content hashing).

No additional configuration is needed.

## Support

If you encounter issues:

1. Check the [Vercel documentation](https://vercel.com/docs).
2. Review the build logs in your Vercel dashboard.
3. Ensure all environment variables are correctly set.
4. Test locally with `npm run build && npm run serve`.

---

**Happy deploying!** 🚀
