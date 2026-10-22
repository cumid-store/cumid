BEGIN;
-- Owner-confirmed selling price and MRP: ₹149 and ₹200 per diary.
-- MRP is the shared published value in src/config/pricing.ts.
ALTER TABLE public.products ALTER COLUMN price_paise SET DEFAULT 14900;
UPDATE public.products SET price_paise=14900,updated_at=now();
-- Existing order snapshots and payment amounts remain as agreed at purchase.
COMMIT;
