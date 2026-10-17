# CUMID (cumid.store) — Free-Tier Service & Quota Register

This document provides a realistic, verified inventory of all zero-cost infrastructure components utilized in the CUMID storefront. None of these services are described as "unlimited" or permanently free. Operational limits, commercial eligibility, dormancy rules, and monitoring strategies are detailed below.

---

## 1. Cloudflare Pages & Cloudflare DNS (Free Tier)

### Scope
- **Hosting**: Static Site Generation (SSG) hosting for `cumid.store`
- **DNS**: Authoritative DNS management with automated SSL certificates
- **Analytics**: Cookieless Cloudflare Web Analytics (aggregate traffic & Web Vitals)

### Official Free-Tier Limits
- **Bandwidth**: Unlimited on clean traffic (subject to Cloudflare Terms of Service)
- **Builds**: Up to 500 builds per calendar month (concurrent build limit: 1)
- **Custom Domains**: Up to 100 custom domains per Pages project
- **Asset Size**: Maximum 25MB per single static file (CUMID vectors and images average < 100KB)
- **Headers & Redirects**: Up to 100 custom header rules via `_headers`

### Inactivity & Suspension Policy
- Free Pages projects do not sleep or pause due to inactivity.
- Authoritative DNS remains permanently active as long as Namecheap nameservers point to Cloudflare.

### Monitoring Strategy
- Track build counts in **Cloudflare Dashboard > Workers & Pages > cumid-store > Deployments**.
- Keep staging builds limited by using preview branch filters if GitHub actions are connected.

---

## 2. Supabase (Free Tier)

### Scope
- **Authentication**: Google OAuth with PKCE for optional customer login
- **Database**: PostgreSQL with Row-Level Security for `profiles` and `favourites`

### Official Free-Tier Limits
- **Monthly Active Users (MAU)**: Up to 50,000 active auth users / month
- **Database Storage**: 500 MB included
- **Egress Bandwidth**: 5 GB / month
- **API Requests**: Up to 500,000 requests / month
- **Database Backups**: 7 days of point-in-time recovery are **NOT** included on the free tier. Manual pg_dump or dashboard CSV exports are required.

### CRITICAL: Supabase Project Inactivity / Pausing Rule
- **Notice**: Free-tier Supabase projects are **automatically paused after 7 days of continuous inactivity** (no API requests).
- **Prohibited Workaround**: We strictly **do not** run cron "keep-alive" ping jobs or generate fake synthetic traffic.
- **Graceful Degradation Architecture**:
  - If a Supabase project is paused or offline, **cumid.store does NOT break**.
  - Catalog browsing, reading journal articles, viewing products, and WhatsApp preorder clicks function completely independently of Supabase.
  - Guest favourites persist in the visitor's local `localStorage` without disruption.
  - To resume a paused project, the owner logs into `https://app.supabase.com` and clicks "Restore Project".

### Monitoring Strategy
- Track storage and egress in **Supabase Dashboard > Settings > Usage**.
- Set up notification alerts under **Project Settings > Notifications**.

---

## 3. Google Cloud / Google OAuth (Free Tier)

### Scope
- Customer identity verification via Google Sign-In button on the `/account` page.

### Free-Tier Boundaries
- Google Identity Services (OAuth 2.0) is free for basic authentication scopes (`email`, `profile`).
- No quotas apply for standard consumer authentication within normal ecommerce volumes.
- Requires standard consent screen configuration and developer terms acceptance.

---

## 4. Google Analytics 4 (GA4) (Free Tier)

### Scope
- Optional marketing events (`view_item_list`, `select_item`, `view_item`, `whatsapp_preorder_click`, etc.) loaded strictly after user opt-in.

### Free-Tier Limits
- Up to 10 million events / month per standard GA4 property.
- Standard data retention in GA4 interface: 2 months (extendable to 14 months under Data Retention settings).
- Note: Ad blockers and privacy consent rejections will reduce measured coverage by approximately 20–50%. Do not treat GA4 as an accounting ledger of confirmed sales.

---

## 5. WhatsApp Preorder Channel (Standard App / Free)

### Scope
- Customer pre-composed enquiry click (`https://wa.me/917023987458`).

### Architecture & Cost
- **Direct Link**: Uses standard international WhatsApp Web/App deep linking (`wa.me`).
- **No Monthly API Fees**: We do NOT use paid WhatsApp Business Cloud API or third-party conversational bot subscriptions ($0.03 to $0.08 per conversation).
- **Owner Device**: Enquiries arrive on the owner's existing phone via WhatsApp or WhatsApp Business App.

---

## 6. Summary Quota Matrix

| Infrastructure Provider | Free Tier Metric | CUMID Projected Usage | Risk Level |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages** | 500 builds / month | 15–30 builds / month | **Negligible** |
| **Cloudflare DNS & CDN** | Unlimited clean traffic | ~5,000–50,000 visitors | **Negligible** |
| **Supabase Auth** | 50,000 MAU | < 500 MAU at launch | **Very Low** |
| **Supabase DB** | 500 MB storage | < 5 MB for favourites | **Very Low** |
| **Supabase Inactivity** | Pauses after 7 days idle | Manual restore if paused | **Managed** (fails safe to local storage) |
| **GA4** | 10M events / month | < 100,000 events | **Negligible** |
| **WhatsApp Direct** | Unlimited peer-to-peer | Direct chat | **Zero Platform Fee** |
