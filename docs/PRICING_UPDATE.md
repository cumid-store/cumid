# Confirmed diary pricing

All diary covers: selling price ₹149, MRP ₹200, saving ₹51. The MRP is labelled as MRP, rather than as a claimed historical selling price. Shipping remains separate and appears at checkout.

The catalogue, product pages, checkout price summary and product structured data use the confirmed price. New admin-created products default to ₹149. Stock/checkout enablement and existing order agreements are unchanged.

Apply `supabase/migrations/20261022020000_diary_pricing.sql` once in Supabase SQL Editor to update all existing product prices and the database default. It requires the existing products table from the store-management migration. Existing order/payment snapshots are not repriced. The SQL was not run against production because this task has no authenticated Supabase administrator connection.

Deploy the branch using the existing Cloudflare Worker workflow. Changing the static catalogue alone does not update database-controlled checkout amounts; apply the pricing SQL as part of this deployment.
