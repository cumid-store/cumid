# Launch checklist — 17 October 2026

Implemented locally: 13 cover concepts with original web-optimised artwork; 4 minimal artwork alternatives; Notebook Bird branding; all products sold out; WhatsApp enquiries; guest favourites; optional Google OAuth and cloud favourites; consent-controlled GA4; canonical URLs, sitemap and structured data; generated CSP script hashes.

Before publishing:
- Review legal seller identity, business contact details and retention policy; support@cumid.store is published, but seller name/address and a formal retention schedule still require owner input.
- Review all 13 cover concepts and confirm sample production. Preview images are not finished-stock photography.
- Build using Node 24 (`npm ci`, `npm run build`). Publish `dist`, not the source `public` directory; the build inserts CSP hashes into `_headers`.
- If enabling accounts, apply both SQL migrations, configure exact OAuth callback URLs, and test two real accounts, cross-user RLS isolation and account deletion.
- If enabling GA4, turn Enhanced Measurement OFF in the web stream. Verify real network payloads after consent, rejection and withdrawal. Mocked tests cannot prove vendor configuration.
- Configure Cloudflare analytics only with the correct token. Check deployed headers, HTTPS, redirects, cache behaviour and DNS records. Preserve existing mail records.

Before accepting an order: confirm dimensions, GSM, page count, cover finish, price, shipping costs, dispatch estimate and cancellation/refund terms in writing. No checkout or payment gateway is implemented.

No deployment, DNS changes, live migrations or external service configuration were performed in this local update. See TEST_RESULTS.md for the measured checks and limits.
