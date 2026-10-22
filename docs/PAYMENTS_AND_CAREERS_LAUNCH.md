# Payments and careers launch

Implemented 22 October 2026. This branch prepares checkout; it does not mean payments are live.

## What is included

- `/checkout`: Google sign-in, diary/quantity, Indian delivery address, item and shipping totals, mandatory unticked consent checkbox and typed name, Razorpay hosted checkout, verified payment result and order status.
- `/account/orders/:id`: real order details, payment state, agreed specification/dispatch snapshots, tracking and cancellation requests.
- `/admin/commerce`: seller details, shipping charge, permitted states, dispatch wording, product prices/specifications and batch allocations.
- `/careers`: short application using the signed-in email; no application fee.
- `/careers/tasks`: existing applications, task title/note, multiple HTTPS links and optional files.
- `/admin/careers`: paginated recruitment inbox, statuses and authenticated file downloads.
- Versioned terms covering minor print variations, no change-of-mind returns, lawful quality remedies, payment verification, delivery, cancellations, applicant ownership and privacy.

## Required before live payment

1. Apply to Razorpay honestly as the appropriate individual/unregistered business or proprietor. KYC and approval are separate from this implementation. Do not select a false business category. Payment processing is not guaranteed free; check the gateway's current fees before pricing.
2. Have a CA confirm the legal seller identity, applicable GST/registration/invoicing obligations and delivery states, especially for interstate sales of physical goods. Gateway approval alone does not settle these obligations. Ask a qualified adviser to review the final seller disclosures and policies; no policy prevents every legal claim.
3. Confirm exact product size, sheets/pages, GSM, cover finish, tax-inclusive prices, batch capacity, shipping and dispatch. No commercial values have been invented in the database.
4. Review the current consumer rules before launch. A blanket ban on remedies for defective or materially misdescribed goods is not what this policy implements. Review regulatory changes before 1 January 2027 too.

## Supabase setup

Apply migrations in filename order. For an existing installation that has the three 17 October migrations, apply only `supabase/migrations/20261022000000_checkout_careers.sql`. Back up first; use the SQL editor or your authenticated Supabase CLI. The supplied publishable key cannot run migrations or server-only operations.

The migration closes customer self-promotion through `profiles.role`. Audit existing admin roles and retain only approved owners. Set the real owner's profile role to `admin` in the SQL editor after they sign in. The existing admin-email allowlist must also include that owner for server admin-page access. Do not let customer accounts change roles.

RLS is enabled on recruitment tables. Browsers cannot write orders or recruitment records directly through the new flow; server endpoints verify a Supabase user token. The `career-files` bucket is private, with no direct public upload/download policy. Do not add an anonymous storage policy.

## Public build variables

Use these in the Cloudflare build environment and local `.env`:

```text
PUBLIC_SITE_URL=https://cumid.store
PUBLIC_SUPABASE_URL=https://jurjpvvgrqymawyttogv.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<your supplied publishable key>
```

Configure Supabase Google OAuth and authorised callback URLs for the actual site. Publishable keys are expected in browser code; service-role and gateway secrets are not.

## Server secrets

Set these in Cloudflare Worker Settings → Variables and Secrets. Local testing uses ignored `.dev.vars`. Do not paste secrets into chat or commit them.

```text
SUPABASE_SERVICE_ROLE_KEY=<Supabase server service-role key>
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=<test secret>
RAZORPAY_WEBHOOK_SECRET=<separate strong webhook secret>
PAYMENTS_LIVE_ENABLED=false
```

The service-role key is only read by server code. Rotate it if it is ever exposed. Protect Cloudflare, Supabase and gateway owner accounts with MFA.

In Razorpay, configure automatic capture and a webhook at `https://cumid.store/api/payments/webhook`. Subscribe to `payment.captured`, `order.paid` and `refund.processed`, using the same webhook secret. Test events must use the test environment. Verify the exact configured URL and signature handling before live mode.

Use `/admin/commerce` to enter seller, address, grievance contact, allowed states, shipping and dispatch. Set prices, confirmed descriptions and finite batch capacities; enable selected products and checkout for test mode. Do not use fabricated test selling details in production. Run a successful payment, decline, dismiss, reload, duplicate callback/webhook, delayed capture and refund through Razorpay TEST mode. Check customer order visibility from a second account and verify no cross-account access.

After KYC approval and all tests, replace test keys with live keys, set the live webhook, and deliberately set `PAYMENTS_LIVE_ENABLED=true`. The database enable flag and product allocations must also permit orders. A missing dependency fails closed.

## Cloudflare deployment

This is a Worker application with static assets. Static drag-and-drop alone cannot run its APIs.

```text
npm ci
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Use that deploy command in the existing Cloudflare Git build. Keep both `dist/client` and `dist/server`. The adapter-generated Worker config is required; do not deploy only the source asset config. No Images or KV binding is required by this implementation (Supabase handles sign-in; Astro sessions are disabled).

The branch and release can be reviewed before deployment. Database migration, live credentials and gateway test payments were not executed using the publishable key.

## Payment operations and limits

- All totals originate from database prices and shipping settings. The displayed total is checked again atomically before reserving a batch slot.
- At most 5 diaries/order and 5 checkout attempts per authenticated account/day. Reusing a checkout key reuses its order; changed details are rejected.
- Capacity reservations do not automatically expire. A pending gateway order can be paid later: never release its allocation merely because a browser closed or a timer expired. Reconcile with the gateway first. This conservative policy can require manual support for abandoned checkouts but avoids overselling.
- A gateway timeout after order creation is treated as uncertain; the same checkout will not blindly create another gateway order. Search Razorpay by the CUMID receipt/reference, reconcile and contact the customer. Do not tell them to pay again until the earlier attempt is understood.
- Signed webhooks fetch current provider state and verify order identity, receipt, INR amount and captured status. Database confirmation is idempotent; refunds cannot regress on a late captured event.
- Issue approved refunds in the Razorpay dashboard. The processed-refund webhook updates the local payment record. Partial refunds retain a separate payment state; refunds do not automatically restock a diary.
- Order fulfilment status and payment status are separate. Do not dispatch because an administrator manually changed fulfilment status; verify the payment state first.
- Existing WhatsApp draft-order tools remain separate from online payment creation. The new payment integrity checks apply to the checkout flow.

## Recruitment storage and retention

Drive links are preferred. Candidates can submit up to 10 HTTPS links/task or 3 files, 2 MiB each. Direct uploads are capped at 6 MiB/application and 128 MiB for the recruitment bucket (including orphaned stored objects). A task remains saved if one file fails, and the UI asks for a Drive follow-up. At most 10 task submissions/application are allowed. Downloads are authenticated attachments with `nosniff`; arbitrary files are not rendered inline. This is not malware scanning: reviewers should not execute candidate files.

Run `node scripts/cleanup-careers.mjs` with server credentials in your environment to review deletion counts. Add `--apply` only when you intend deletion. This removes inactive (`received`/`closed`) applications older than 180 days and orphaned bucket files older than a day. Run regularly and review old active applications separately. The script defaults to a dry run. Re-run until no eligible entries remain. For an early deletion request, delete uploaded objects through the Storage API before deleting the application row. Direct database deletion of storage metadata is not a blob-cleanup method.

Keep recruitment and payment personal data out of analytics event payloads. Monitor Supabase usage and Cloudflare request limits. The 128 MiB cap reserves space for other app data but does not guarantee the whole project remains within every free-tier quota. For more volume, use links and review retention before raising the cap.

## Verification

```text
node scripts/test-commerce.mjs
npm install --prefix artifacts/sql-test --no-package-lock --no-save @electric-sql/pglite
node scripts/test-commerce-sql.mjs
npm run build
```

SQL tests use a local embedded PostgreSQL instance with stubbed Supabase auth/storage schemas. They exercise migrations, privileges, price tampering, capacity, idempotency, refunds, ownership and quotas. They are not proof of a successful production gateway charge. Browser QA covers the disabled-payment state and mocked authenticated forms; complete the provider test-mode checklist before enabling live collection.

References checked: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/ ; https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/ ; https://www.npci.org.in/what-we-do/upi/faqs ; https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf ; https://www.pib.gov.in/PressReleasePage.aspx?PRID=2308759 ; https://supabase.com/docs/guides/storage/security/access-control
