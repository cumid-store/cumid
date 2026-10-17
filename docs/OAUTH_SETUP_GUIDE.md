# CUMID (cumid.store) — Supabase & Google OAuth Configuration Guide

This guide details how the store owner can connect Google OAuth to Supabase for customer accounts and saved favourites.

---

## 1. Overview & Security Rules
- **Authentication Purpose**: Optional customer sign-in to sync saved favourite pocket diary covers across devices.
- **Guest Inclusivity**: Browsing the catalog, reading the journal, and enquiring via WhatsApp function 100% without an account.
- **Privacy Principle**: Request minimal identity scopes (`email`, `profile`). Never request sensitive scopes (Gmail, Google Drive, Contacts).
- **Security Standard**: PKCE (Proof Key for Code Exchange) flow with strict redirect allowlists to prevent open redirect vulnerabilities.

---

## 2. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `cumid-store-auth` (or select an existing organization project).
3. Navigate to **APIs & Services > OAuth consent screen**:
   - User Type: **External**
   - App name: `CUMID Pocket Diaries`
   - User support email: *(Your Google account)*
   - Developer contact email: *(Your Google account)*
   - Authorized domains: Add `cumid.store` and `supabase.co`
4. On the **Scopes** screen:
   - Select only `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
   - Do NOT select sensitive or restricted scopes.
5. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - Name: `CUMID Supabase Auth`
   - **Authorized JavaScript origins**:
     - `https://cumid.store`
     - `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co`
     - `http://localhost:4321` *(for local development)*
   - **Authorized redirect URIs**:
     - `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
6. Click **Create** and securely copy the **Client ID** and **Client Secret**.

---

## 3. Supabase Dashboard Configuration

1. Log in to [Supabase Dashboard](https://app.supabase.com) and select your project.
2. Go to **Authentication > Providers > Google**:
   - Toggle **Enable Sign in with Google** to ON.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.
3. Go to **Authentication > URL Configuration**:
   - **Site URL**: `https://cumid.store`
   - **Redirect URLs (Allowlist)**:
     - `https://cumid.store/auth/callback`
     - `http://localhost:4321/auth/callback`
   - **Security**: Do not add arbitrary external wildcard URLs.

---

## 4. Database Migrations & Row-Level Security

1. In Supabase, open the **SQL Editor**.
2. Run the migration script located at `supabase/migrations/20261017000000_cumid_init.sql`.
3. This creates:
   - `profiles` table with RLS (users can only access their own profile).
   - `favourites` table with unique constraint on `(user_id, product_id)`.
   - Automatic user creation trigger on signup.
   - `delete_user_account()` self-service deletion function.

---

## 5. Connecting to Cloudflare Pages & Local Development

### In Local `.env`
```env
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

### In Cloudflare Pages Dashboard
1. Go to **Workers & Pages > cumid-store > Settings > Environment variables**.
2. Add:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Trigger a redeployment.
