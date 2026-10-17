# CUMID (cumid.store) — Production Launch Checklist

This checklist distinguishes **100% completed technical functionality** from **pending owner integrations & decisions**.

---

## Part 1: Fully Completed & Verified Functionality ✅

- [x] **Astro & React Island Architecture**: 100% Static Site Generation (SSG) with zero client JavaScript on public editorial pages.
- [x] **Launch Safety Rules**: All 6 candidate products visibly marked Sold Out. Zero checkout forms, payment APIs, or cart buttons.
- [x] **WhatsApp Preorder Enquiries**:
  - Safe, pre-composed message using `encodeURIComponent`.
  - Valid international phone formatting: `+91 7023987458` (`wa.me/917023987458`).
  - Includes product name, stable ID, and canonical URL.
  - Standard accessible `<a>` tag that works 100% without JavaScript.
  - One-click copy message fallback.
- [x] **Visual Identity & Brand Assets**:
  - Original CUMID Wordmark in deep charcoal.
  - Compact "C" spiral symbol inspired by top coil binding and folded page corner.
  - Master vector assets (`logo-mark.svg`, `logo-wordmark.svg`, `logo-horizontal.svg`, `logo-dark.svg`, `favicon.svg`, `og-image.svg`).
  - All 6 candidate cover graphics & perspective mockups marked with "Design preview".
- [x] **Design System & Aesthetics**:
  - Warm ivory palette (`#F7F4EF`, `#252321`, `#62537D`, `#929C8A`, `#DFC3B2`).
  - Strict WCAG 2.2 AA contrast compliance.
  - Reduced-motion media query support.
- [x] **SEO, Structured Data & Metadata**:
  - JSON-LD schemas: `Organization`, `WebSite`, `BreadcrumbList`, `Product` (marked SoldOut, no fabricated price), `Article` (3 original articles), and `FAQPage`.
  - XML sitemap at `/sitemap.xml` with dynamic route collection.
  - Strict `robots.txt` disallowing private routes.
  - Private routes (`/account/*`, `/auth/*`, `/404`) marked `noindex, nofollow`.
- [x] **Security Edge Configuration (`_headers`)**:
  - Strict Content Security Policy (CSP).
  - Anti-framing policy (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
- [x] **Privacy-First Dual-Layer Analytics**:
  - Basic consent gating: GA4 never loads before affirmative consent.
  - Non-intrusive consent banner with one-click "Reject optional analytics" and granular modal.
  - Persistent footer trigger to reopen preferences at any time.
  - Strict parameter sanitization (no personal data, no WhatsApp message text).
- [x] **Supabase Authentication & Favourites Resilience**:
  - Database schema & RLS migration ready (`supabase/migrations/20261017000000_cumid_init.sql`).
  - Seamless fallback to `localStorage` when Supabase is offline, unconfigured, or paused.
  - Self-service account deletion endpoint.
- [x] **Automated Testing Suite**:
  - Comprehensive Playwright test suite covering all 18 core requirements.
  - Zero TypeScript compiler diagnostics errors (`astro check` clean).

---

## Part 2: Owner Credentials & Launch Blockers ⏳

The following external accounts and decisions require owner action before public launch:

### 1. Namecheap & Cloudflare DNS Delegation
- [ ] Add `cumid.store` to Cloudflare Free.
- [ ] Verify existing MX records are preserved before changing nameservers.
- [ ] Turn off old DNSSEC at Namecheap (to avoid stale DS records).
- [ ] Replace Namecheap nameservers with Cloudflare-assigned nameservers.
- [ ] Guide: [docs/DEPLOYMENT_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/DEPLOYMENT_GUIDE.md)

### 2. Legal Identity & DPDP Compliance Decisions
- [ ] Fill in registered company name in `src/pages/privacy.astro` and `src/pages/terms.astro`.
- [ ] Provide physical registered address for legal disclosures.
- [ ] Nominate DPDP Grievance Officer name.
- [ ] Checklist: [docs/OWNER_INPUT_CHECKLIST.md](file:///c:/Ankshit/cumid.store/docs/OWNER_INPUT_CHECKLIST.md)

### 3. Optional Supabase & Google OAuth Setup
- [ ] Create free Supabase project in `ap-south-1` (Mumbai).
- [ ] Run migration script `supabase/migrations/20261017000000_cumid_init.sql`.
- [ ] Create Google OAuth credentials in Google Cloud Console.
- [ ] Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to Cloudflare Pages.
- [ ] Guide: [docs/OAUTH_SETUP_GUIDE.md](file:///c:/Ankshit/cumid.store/docs/OAUTH_SETUP_GUIDE.md)

### 4. Search Engines & Sitemaps
- [ ] Verify ownership in Google Search Console via DNS TXT record.
- [ ] Submit sitemap URL: `https://cumid.store/sitemap.xml`.
- [ ] Submit sitemap in Bing Webmaster Tools.
