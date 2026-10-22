# Fix the incomplete-service error

Read-only checks of the supplied live Supabase project reported `PGRST205` for `career_applications` and `commerce_settings`, while `profiles` and `products` were available. The application backend cannot complete queries against missing schema objects. This is not resolved by repeatedly submitting the form or rebuilding static files.

1. Sign in to Supabase and open project `jurjpvvgrqymawyttogv` → SQL Editor → New query.
2. Copy the full contents of `supabase/REPAIR_MISSING_SETUP.sql`, paste into the editor and run it. It creates only missing setup modules, refreshes the API schema cache, and sets diary prices to the confirmed ₹149. Existing order and payment snapshots are preserved. The script is transactional and tested for repeat runs.
3. Refresh the CUMID page and sign in again if requested. Confirm a test application displays its reference in the task portal. For administrator features, your own profile must have role `admin`; use the Supabase dashboard to assign only the verified owner.
4. Deploy the updated code in this PR. Missing schema, access denial and missing-record failures now have distinct error codes. Unexpected failures produce a support reference without exposing database details or personal information.

The public key can authenticate visitors and enforce database access policies; it cannot create tables or run this administrative SQL. No authenticated Supabase administration connection is available in this task, so the live repair has not been applied automatically. Do not post service-role secrets in chat.

Payments additionally require the existing documented gateway KYC, server secrets, seller configuration and enable flags. This repair does not activate real-money payments.
