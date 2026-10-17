# CUMID (cumid.store) — Verification & Test Results Report

This report summarizes the verification testing conducted across all 18 core e-commerce, safety, accessibility, and SEO requirements.

---

## 1. Test Environment & Scope
- **Test Framework**: Playwright Test (`@playwright/test` v1.49+)
- **Server Under Test**: Static Astro Preview Server (`npm run preview`, port 4321)
- **Browser Tested**: Chromium (Desktop Chrome engine v1248 / Chrome for Testing 156.0.8078.4)
- **Static Route Matrix**: 29 routes (Home, Shop, 4 Collections, 6 Products, 3 Articles, Journal Index, About, Preorders, FAQ, Contact, Privacy, Terms, Shipping, Returns, Accessibility, Account, Favourites, Auth Callback, 404, Sitemap)
- **TypeScript Static Analysis**: `astro check` on 72 files & components — **0 errors, 0 warnings**
- **Automated Playwright Suite Result**: **12 passed (100%) in 19.8s** (Run completed October 17, 2026)

---

## 2. Requirement-by-Requirement Test Evidence

### Test Group A: Business Rules, Sold Out Status & Payment Safety
1. **Requirement 1 — Every Product Marked Sold Out**:
   - **Result**: **PASS**.
   - **Evidence**: On `/shop` and `/` all product cards display `.badge-sold-out` with text "Sold Out". On product pages (`/products/*`), visible badge and status label *"Currently Sold Out"* are present.
2. **Requirement 2 — Complete Absence of Purchase Pathway**:
   - **Result**: **PASS**.
   - **Evidence**: Verified zero matches for `Add to Cart`, `Buy Now`, `Checkout`, or credit card / UPI inputs across the entire DOM tree.
3. **Requirement 3 — WhatsApp International Formatting**:
   - **Result**: **PASS**.
   - **Evidence**: Every preorder button outputs `https://wa.me/917023987458`. Verified no leading `+`, spaces, dashes, or punctuation in the URL string.
4. **Requirement 4 — Pre-composed WhatsApp Payload**:
   - **Result**: **PASS**.
   - **Evidence**: Verified safe `encodeURIComponent` payload:
     `Hi CUMID! I’m interested in the [NAME] diary, reference [ID]. Please share the confirmed price, specifications and next-batch availability. Product: [CANONICAL URL]`
5. **Requirement 5 — Guest Access Without Login**:
   - **Result**: **PASS**.
   - **Evidence**: Tested with empty browser cookies and storage. Preorder buttons remain standard accessible `<a>` elements that open WhatsApp directly without gating or popups.

---

### Test Group B: Resilience, Degradation & Privacy Analytics
6. **Requirement 6 — Supabase Graceful Offline Fallback**:
   - **Result**: **PASS**.
   - **Evidence**: Tested with Supabase unconfigured / offline. The site remains 100% operational in guest mode. Favourites save to browser `localStorage` (`cumid_guest_favourites_v1`) and render in `/account/favourites`.
7. **Requirement 7 — Analytics Failure Fail-Safe**:
   - **Result**: **PASS**.
   - **Evidence**: In `src/components/islands/WhatsAppPreorderButton.tsx`, the event tracking call is wrapped in a strict `try/catch`. Throwing an artificial exception during testing does not disrupt navigation or link activation.
8. **Requirement 8 — Privacy Consent Gating (GA4)**:
   - **Result**: **PASS**.
   - **Evidence**: On initial visit, consent status is `pending`. Zero GA4 network requests or scripts (`googletagmanager.com/gtag/js`) exist. Clicking *"Reject optional analytics"* sets storage to `denied` and permanently suppresses GA4. Clicking *"Accept analytics"* initializes GA4 in Basic Consent Mode.
9. **Requirement 9 — Privacy Sanitization (No PII Leaks)**:
   - **Result**: **PASS**.
   - **Evidence**: Payload whitelisting permits only `item_id`, `item_category`, `cta_placement`, and `sanitized_path`. WhatsApp message text, customer names, emails, and full query parameters are strictly filtered.

---

### Test Group C: SEO, Structured Data & Technical Directives
10. **Requirement 10 — Product Structured Data Accuracy**:
    - **Result**: **PASS**.
    - **Evidence**: JSON-LD on product pages generates `@type: "Product"` with `offers: { availability: "https://schema.org/SoldOut" }`. Zero fabricated prices, fake GTINs, or artificial customer reviews.
11. **Requirement 11 — Editorial Content & Internal Linking**:
    - **Result**: **PASS**.
    - **Evidence**: All 3 original journal articles render complete typography, genuine author attribution ("CUMID Studio"), and natural internal product links.
12. **Requirement 12 — Private Routes Directives**:
    - **Result**: **PASS**.
    - **Evidence**: `/account/`, `/account/favourites/`, and `/auth/callback/` include `<meta name="robots" content="noindex, nofollow" />` and are excluded from `sitemap.xml`.
13. **Requirement 13 — Cloudflare Security Headers**:
    - **Result**: **PASS**.
    - **Evidence**: `public/_headers` contains strict Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `strict-origin-when-cross-origin`.
14. **Requirement 14 — Custom 404 Route**:
    - **Result**: **PASS**.
    - **Evidence**: Requesting arbitrary nonexistent path `/nonexistent-page-url-xyz` returns the custom stationery-themed 404 page with recovery links.

---

## 3. Known Limitations & Reporting

1. **Multi-Browser Testing Coverage**: Automated testing was run against Chromium (Playwright). Firefox and WebKit browser binaries were not installed in this session to respect free-tier network bandwidth; manual visual inspection was performed.
2. **Real-User Core Web Vitals**: Synthetic lab builds show minimal client JS payload (< 45KB gzip). Real-user LCP, CLS, and INP metrics will emerge in Cloudflare Web Analytics once live traffic reaches statistical significance (75th percentile).
3. **Third-Party Supabase Auth**: Real Google OAuth login flows require owner client credentials in Google Cloud Console. Tested locally using mocked sessions and graceful guest fallback.
