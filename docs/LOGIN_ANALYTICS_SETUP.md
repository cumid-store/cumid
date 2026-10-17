# CUMID login, analytics and upload setup

## Details to provide

1. Supabase project URL, such as `https://PROJECT.supabase.co`.
2. Supabase **publishable key** or legacy **anon public key**. The existing environment variable is named `PUBLIC_SUPABASE_ANON_KEY`; it accepts the browser-safe key. Never send a service-role/secret key.
3. GA4 web-stream measurement ID, starting `G-` (not the numeric property or stream ID).
4. Optional Cloudflare Web Analytics beacon token, if you want this in addition to GA4. Tell us if your Cloudflare dashboard already injects the beacon so it is not added twice.
5. Confirmation that `support@cumid.store` receives mail; publishing the address does not create a mailbox. Seller/owner name, public business address, and the retention period for WhatsApp enquiries are still needed for the final business disclosures.

## Google login configuration

Create a Supabase Free project. In its SQL editor, apply the repository migrations in order:

- `supabase/migrations/20261017000000_cumid_init.sql`
- `supabase/migrations/20261017010000_harden_account_functions.sql`

In Google Auth Platform, create a web-application OAuth client for CUMID. Use the homepage `https://cumid.store`, privacy URL `https://cumid.store/privacy`, terms URL `https://cumid.store/terms`, and your verified support email. Configure basic identity scopes only: openid, email, profile. Select the appropriate audience and add test users while the application is in testing.

Authorized JavaScript origin: `https://cumid.store`.
Google authorized redirect URI: copy the callback displayed in Supabase's Google provider settings, normally `https://PROJECT.supabase.co/auth/v1/callback`.

Enter the Google Client ID and Client Secret directly in Supabase Authentication → Google provider. **Do not put the secret in chat, frontend code, .env PUBLIC variables, or dist.** You do not need to share a Google password.

In Supabase URL Configuration set Site URL to `https://cumid.store` and allow `https://cumid.store/auth/callback`. If testing login on the Workers hostname, also allow exactly `https://fancy-smoke-e09a.ankshitdey-mr-veteran.workers.dev/auth/callback`, and add its origin to the Google client. Do not use a broad wildcard.

Source: [Supabase Google login guide](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect allowlist guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Analytics configuration

Create/select a GA4 property and web data stream for `https://cumid.store`. Send its `G-...` measurement ID. For this implementation, turn Enhanced Measurement off so automatic URL/event collection does not bypass our explicit allowlists; leave Google Signals and advertising personalisation off. Choose and document the data-retention setting in GA4. Do not enable session recording or collect enquiry text.

The app records approved page/product interactions and WhatsApp link clicks only after consent. A click is not a completed enquiry or sale. Account and callback pages are excluded. Validate production network requests and DebugView after setup.

Source: [Find your GA4 tag ID](https://support.google.com/analytics/answer/9539598).

## Rebuild after receiving the public configuration

Create `.env.local` in the project root:

```dotenv
PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
PUBLIC_SUPABASE_ANON_KEY=YOUR_BROWSER_SAFE_KEY
PUBLIC_GA4_MEASUREMENT_ID=G-YOURID
PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
```

Run `npm run build`, then upload the NEW dist. These values are baked in at build time: adding Worker runtime variables after uploading compiled HTML will not activate them. Current delivery remains guest-only with Google Analytics disabled until real values are supplied. No paid service is required by the implementation.

## Cloudflare upload

The provided URL is Cloudflare **Workers Static Assets**. Upload the contents of `dist`, with `index.html` and `_headers` at the upload root. Do not upload the whole source repository or `dist-e2e`. The delivery ZIP has the same root layout. A `wrangler.jsonc` is included in the source project for an optional future CLI deployment; no deployment command has been run for this update.

Preserve `_headers`. Workers Static Assets applies it to static responses; a future custom Worker that returns its own responses would need to set headers itself. Source: [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).

After upload: check home, shop, each product gallery, `/faq`, guest favourites, `/privacy`, a nonexistent URL (404), and the custom domain certificate. After enabling accounts, test real sign-in/cancellation/sign-out, two-user database isolation, guest import, and deletion. Confirm email delivery separately. Live Google/Supabase configuration cannot be verified using mocked tests.
