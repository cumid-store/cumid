-- Owner-confirmed preorder availability and offer. Does not enable online payments.
BEGIN;
UPDATE public.products SET is_sold_out=false, price_paise=14900, updated_at=now()
WHERE is_published=true AND id IN ('CUMID-FL-001','CUMID-HG-001','CUMID-CT-001','CUMID-CT-002','CUMID-CJ-001','CUMID-CJ-002','CUMID-CT-003','CUMID-CJ-003','CUMID-OR-001','CUMID-OR-002','CUMID-CT-004','CUMID-OR-003','CUMID-OR-004');
UPDATE public.commerce_settings
SET shipping_paise=5000,
    dispatch_note='Delivery within 14 days of payment confirmation (manufacturing and shipping included)'
WHERE id=true;
COMMIT;
