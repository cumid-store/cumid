# Analytics implementation

GA4 is optional and loads only after affirmative consent and a valid PUBLIC_GA4_MEASUREMENT_ID. Account/auth paths are excluded. Rejection sends no Google requests. Withdrawal disables GA, clears GA cookies and reloads to remove loaded script listeners. Cloudflare Web Analytics is separately optional and excluded from private pages.

Turn OFF Enhanced Measurement in the GA4 web-stream settings before using production analytics. Otherwise vendor automatic events may collect extra URLs or properties outside the application's event allowlist. Verify actual vendor requests on the deployed domain; the automated suite mocks the Google script.

Implemented application events: view_item, view_item_list, select_item, collection_filter, whatsapp_preorder_click, faq_expand; favourite and account actions are limited by the analytics library. See src/lib/analytics.ts for the authoritative allowlist. Sending a WhatsApp click event does not indicate a sent message, preorder, payment or sale.

Application payloads use known product/collection IDs and CTA locations. URL query strings/fragments and referrer values are not forwarded. Campaign values are allowlisted: source instagram/whatsapp, medium social/organic/referral, campaign launch/cover-test. Do not add names, phone numbers, email addresses, free-text messages or session recordings.

Users can change consent in the footer. Consent and guest favourites may remain in browser storage until cleared; account deletion does not erase WhatsApp conversations or vendor aggregate data. Confirm retention and deletion processes before launch.
