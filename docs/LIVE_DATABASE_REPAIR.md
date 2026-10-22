# Live Supabase repair — 22 October 2026

Project: `jurjpvvgrqymawyttogv`. Applied through the connected Supabase migration API.

The production database had the original account and store tables but lacked
`commerce_settings`, all recruitment tables, and the timed task-round functions.
The complete repair installed these modules without replacing existing accounts,
favourites or orders. Checkout remains disabled pending gateway and seller setup.
All 13 products now have `price_paise = 14900`.

Applied migrations:

- `repair_missing_commerce_careers_setup`
- `harden_existing_account_functions`
- `restrict_profile_role_mutation`

Existing account functions now have fixed search paths and restricted execution.
Authenticated profile updates allow only display name, avatar, phone and timestamp;
customers cannot change their role or insert an administrator profile. Existing
owner accounts matching the website's administrator allowlist were synchronised
to the database administrator role, with an audit entry for each change.

Live rollback-only database verification passed for application creation,
acknowledgement, duplicate retries, candidate retrieval, successful open-round
submission, waiting/expired round rejection, candidate isolation, and role
mutation protection. Temporary auth/application/submission records were rolled
back. No real candidate credentials or sessions were used.

Anonymous REST access to recruitment tables now returns permission denied rather
than missing-table errors. The deployed careers API returns an explicit sign-in
requirement for unauthenticated requests. A real signed-in browser submission was
not performed on behalf of a customer.

All public tables have RLS enabled. Security advisory review retains intentional
guarded authenticated SECURITY DEFINER RPCs and `is_admin`, which existing public
catalogue RLS policies call. Password breach protection remains a separate Auth
configuration item; no paid features were enabled.

Direct file uploads still depend on a securely configured server service-role key.
The existing Drive-link submission fallback does not require that key. Payments
remain disabled until approved gateway credentials and seller/shipping information
are configured. No frontend deployment is required for this database repair.
