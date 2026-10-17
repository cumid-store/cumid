# CUMID (cumid.store) — Step-by-Step Namecheap & Cloudflare Deployment Guide

This guide explains how to deploy `cumid.store` using **Namecheap** as registrar and **Cloudflare Pages / DNS (Free Tier)** as the global hosting, CDN, and authoritative DNS platform.

---

## Pre-Deployment Preparation
- **Domain**: `cumid.store`
- **Registrar**: Namecheap
- **Target Hosting**: Cloudflare Pages Free
- **Repository**: Git repository containing this Astro codebase

> [!WARNING]
> Do NOT invent or hardcode fixed IP addresses for Cloudflare Pages. Always associate custom domains through the official Cloudflare Pages dashboard interface.

---

## Phase 1: Cloudflare DNS Setup & Email Preservation

### Step 1: Add `cumid.store` to Cloudflare
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Click **Add a Domain**, enter `cumid.store`, and select the **Free** plan.
3. Click **Continue** to initiate Cloudflare’s automatic DNS scan.

### Step 2: Inventory & Export Existing DNS Records
1. In Namecheap, go to **Domain List > cumid.store > Advanced DNS**.
2. Compare the existing records in Namecheap against Cloudflare's scan results.
3. **Preserve Existing Mail Records**: Ensure all existing MX, TXT (SPF, DKIM, DMARC), and ownership verification records are present in Cloudflare DNS.
   - Example MX: If using Namecheap Private Email or Google Workspace, ensure priority and mail hostnames match exactly.
   - Example SPF: `v=spf1 include:... ~all`
   - Example DMARC: `v=DMARC1; p=none; ...`
4. If any record is missing from the scan, click **Add Record** in Cloudflare and copy it over before proceeding.

### Step 3: Check DNSSEC at Namecheap
1. In Namecheap, check whether **DNSSEC** is currently enabled under **Advanced DNS**.
2. **CRITICAL**: If DNSSEC is enabled at Namecheap with old keys, **turn off DNSSEC at Namecheap first**. Changing nameservers while a stale DS record exists will cause complete DNS resolution failure across the internet.

### Step 4: Update Nameservers at Namecheap
1. Note the two exact authoritative nameservers assigned by Cloudflare (e.g., `ada.ns.cloudflare.com` and `ben.ns.cloudflare.com`—use your specific assigned pair, never copy from another site).
2. In Namecheap:
   - Navigate to **Domain List > cumid.store > Domain Tab**.
   - Under **Nameservers**, change from *Namecheap BasicDNS* to **Custom DNS**.
   - Enter your two Cloudflare-assigned nameservers.
   - Click the green checkmark (Save).

### Step 5: Verify Authoritative Delegation
1. Return to the Cloudflare dashboard and click **Check nameservers now**.
2. DNS propagation typically takes between 5 minutes and 2 hours. Once verified, the status changes to **Active**.

---

## Phase 2: Cloudflare Pages Connection & Builds

### Step 6: Connect Git Repository to Cloudflare Pages
1. In Cloudflare, navigate to **Compute (Workers) > Workers & Pages > Create > Pages > Connect to Git**.
2. Select your repository (`cumid.store`).
3. Set up the build configuration:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build:quick` (or `npm run build`)
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave blank)
   - **Environment variables**:
     - `NODE_VERSION`: `20` or `22`
     - `PUBLIC_SITE_URL`: `https://cumid.store`
     - `PUBLIC_SUPABASE_URL`: *(Your Supabase project URL)*
     - `PUBLIC_SUPABASE_ANON_KEY`: *(Your Supabase anon key)*
     - `PUBLIC_GA4_MEASUREMENT_ID`: *(Optional G-XXXXXXXXXX)*
     - `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`: *(Optional CF token)*
4. Click **Save and Deploy**. Cloudflare Pages will execute the build and deploy to a `*.pages.dev` subdomain.

### Step 7: Associate Custom Domain `cumid.store`
1. In the Cloudflare Pages project, select **Custom Domains**.
2. Click **Set up a custom domain**.
3. Enter `cumid.store` (apex domain).
4. Cloudflare automatically provisions the CNAME flattening / apex DNS mapping and generates a free Universal SSL certificate.

### Step 8: Configure Canonical WWW Redirect
1. Under **Custom Domains**, click **Set up a custom domain** again.
2. Enter `www.cumid.store`.
3. In **Cloudflare Dashboard > Rules > Redirect Rules** (or Page Rules), create a 301 Permanent Redirect:
   - When incoming request is: `Hostname equals www.cumid.store`
   - Redirect to: `https://cumid.store${request.uri.path}`
   - Status code: `301 Moved Permanently`

### Step 9: Verify Security Headers & HTTPS
1. The project’s `public/_headers` file is automatically deployed to the edge.
2. Test headers using `curl -I https://cumid.store` to confirm:
   - `Content-Security-Policy`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy`

---

## Phase 3: Post-Launch Integrations & Verification

### Step 10: OAuth Callbacks & Allowed Origins
1. In **Supabase Dashboard > Authentication > URL Configuration**:
   - **Site URL**: `https://cumid.store`
   - **Redirect URLs**:
     - `https://cumid.store/auth/callback`
     - `http://localhost:4321/auth/callback` *(for local development)*
2. In **Google Cloud Console > Credentials > OAuth 2.0 Client ID**:
   - Authorized JavaScript origins:
     - `https://cumid.store`
     - `https://your-project.supabase.co`
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`

### Step 11: Search Engines & Sitemap Submission
1. In **Google Search Console**:
   - Add property: `https://cumid.store` (or Domain property via Cloudflare TXT record).
   - Go to **Sitemaps > Add new sitemap** and submit `https://cumid.store/sitemap.xml`.
2. In **Bing Webmaster Tools**:
   - Import site directly from Google Search Console or verify via meta tag / DNS.
   - Submit sitemap `https://cumid.store/sitemap.xml`.

### Step 12: Re-Enable DNSSEC at Cloudflare (Optional & Recommended)
1. In Cloudflare, navigate to **DNS > Settings > Enable DNSSEC**.
2. Cloudflare will display DS record values (Key Tag, Algorithm, Digest Type, Digest).
3. In Namecheap, go to **Advanced DNS > DNSSEC**, click **Add new DS record**, and copy the exact Cloudflare values.

### Step 13: Test Existing Email
1. Send a test email to your business address (e.g. via Gmail).
2. Reply from your business mailbox to confirm MX, SPF, and DKIM remain 100% operational.

---

## Rollback Instructions
If you ever need to roll back:
1. **Roll back code deployment**: In Cloudflare Pages, go to **Deployments**, locate the last working deployment, click the three dots, and select **Rollback to this deployment**. Instant rollback takes under 2 seconds.
2. **Revert DNS to Namecheap**: In Namecheap, change Nameservers from *Custom DNS* back to *Namecheap BasicDNS*.
