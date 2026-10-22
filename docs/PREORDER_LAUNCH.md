# Preorder offer — 22 October 2026

The owner confirmed fulfilment for the 13 current catalogue designs, ₹149 per
diary, ₹50 shipping and 14-day delivery. Shipping is interpreted as a flat charge
per order. Delivery is within 14 calendar days of payment confirmation and includes
manufacturing and shipping. Verify serviceability, full address and final product
specifications with each buyer before payment.

## Customer journey

Shop → cover → **Preorder this diary** → select quantity (1–10), name and PIN →
review total and accept terms → **Continue on WhatsApp** → send the prepared draft.
One diary totals ₹199; two of the same cover total ₹348. No login is needed for
WhatsApp preorders. A copy-message fallback and a no-JavaScript contact link exist.

This is a WhatsApp preorder request, not automatic payment collection or a paid
order. The customer must send the message. CUMID must then confirm specifications,
PIN serviceability, the full shipping address and payment instructions, verify
payment and issue an order reference. Record confirmed orders in store management.
Do not treat browser clicks or generated messages as paid orders. Form details
are not saved to local storage or sent to analytics.

The existing Razorpay checkout remains available when its server-side settings,
approved credentials, seller details and product allocations are fully configured.
No payment switch, credentials or seller identities were invented by this change.

## Data and pages

`supabase/PREORDER_LAUNCH.sql` was applied to the live project. It sets only the 13
published catalogue products to preorder availability and preserves existing order
snapshots. Commerce shipping is 5000 paise and its delivery note is updated. The
payment-enabled setting remains false.

Storefront copy, product offers, collection descriptions, FAQs, shipping and terms,
preorder guide, favourites and LLM reference information reflect the same offer.
Digital mockups remain labelled. Unconfirmed paper GSM, page count and dimensions
have not been fabricated.

## Verification

- Production build and Astro diagnostics: no errors, warnings or hints.
- 11 API/security tests, including a public catalogue without privileged secrets.
- Preorder tests: quantity limits, per-order totals and all 13 product offer schemas.
- Browser test: cover selection, native validation, consent, WhatsApp payload,
  clipboard fallback, mobile width and JavaScript-disabled ordering route.
- Existing careers/timed tasks/upload and secure checkout browser regressions pass.
- No WhatsApp message or real payment was sent during testing.
