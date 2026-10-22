BEGIN;
-- A customer must never be able to promote their own profile to administrator.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, phone, updated_at) ON public.profiles TO authenticated;
ALTER FUNCTION public.is_admin() SET search_path = '';

CREATE TABLE public.commerce_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false,
  seller_name text NOT NULL DEFAULT '', seller_address text NOT NULL DEFAULT '',
  grievance_name text NOT NULL DEFAULT '', shipping_paise integer CHECK(shipping_paise >= 0),
  dispatch_note text NOT NULL DEFAULT '', allowed_states text[] NOT NULL DEFAULT '{}'
);
INSERT INTO public.commerce_settings(id) VALUES(true);
ALTER TABLE public.commerce_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin settings" ON public.commerce_settings FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
GRANT SELECT,UPDATE ON public.commerce_settings TO authenticated;
GRANT ALL ON public.commerce_settings TO service_role;

ALTER TABLE public.products ADD COLUMN checkout_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN sale_limit integer NOT NULL DEFAULT 0 CHECK(sale_limit >= 0),
 ADD COLUMN reserved_sales integer NOT NULL DEFAULT 0 CHECK(reserved_sales >= 0),
 ADD COLUMN sale_description text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD CONSTRAINT allocation_covers_reservations CHECK(sale_limit>=reserved_sales);
ALTER TABLE public.orders ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
 CHECK(payment_status IN ('unpaid','pending','paid','partially_refunded','refunded')),
 ADD COLUMN gateway_order_id text UNIQUE, ADD COLUMN gateway_payment_id text UNIQUE,
 ADD COLUMN checkout_key uuid UNIQUE, ADD COLUMN terms_version text,
 ADD COLUMN consent_text text, ADD COLUMN consent_name text, ADD COLUMN consent_at timestamptz,
 ADD COLUMN dispatch_snapshot text, ADD COLUMN sale_snapshot text,
 ADD COLUMN refunded_paise bigint NOT NULL DEFAULT 0;
GRANT ALL ON public.orders,public.order_items,public.order_events,public.products TO service_role;

-- Only the server can invoke the checkout transaction. Prices and availability are read here.
CREATE FUNCTION public.begin_checkout(p_user uuid,p_key uuid,p_product text,p_qty integer,p_customer jsonb,p_terms text,p_consent text,p_expected_total bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.commerce_settings; p public.products; o public.orders; oid uuid:=gen_random_uuid();
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT * INTO o FROM public.orders WHERE checkout_key=p_key;
 IF FOUND THEN
   IF o.user_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'Invalid checkout reference'; END IF;
   IF o.total_paise IS DISTINCT FROM p_expected_total OR o.shipping_address IS DISTINCT FROM (p_customer->'address') OR o.consent_name IS DISTINCT FROM (p_customer->>'signedName') OR NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=o.id AND product_id=p_product AND quantity=p_qty) THEN RAISE EXCEPTION 'Checkout details changed. Contact support before starting a replacement order.'; END IF;
   RETURN jsonb_build_object('created',false,'order',to_jsonb(o));
 END IF;
 IF (SELECT count(*) FROM public.orders WHERE user_id=p_user AND created_at>now()-interval '1 day' AND checkout_key IS NOT NULL)>=5 THEN RAISE EXCEPTION 'Daily checkout limit reached. Please contact support.'; END IF;
 SELECT * INTO s FROM public.commerce_settings WHERE id=true FOR SHARE;
 IF NOT s.enabled OR s.seller_name='' OR s.seller_address='' OR s.grievance_name='' OR s.shipping_paise IS NULL OR s.dispatch_note='' OR cardinality(s.allowed_states)=0 THEN RAISE EXCEPTION 'Checkout is not open yet'; END IF;
 IF NOT ((p_customer->'address'->>'state')=ANY(s.allowed_states)) THEN RAISE EXCEPTION 'Delivery is not available to this state yet'; END IF;
 IF p_qty NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Choose between 1 and 5 diaries'; END IF;
 SELECT * INTO p FROM public.products WHERE id=p_product FOR UPDATE;
 IF NOT FOUND OR NOT p.checkout_enabled OR NOT p.is_published OR p.is_sold_out OR p.price_paise IS NULL OR p.price_paise<=0 OR p.sale_description='' OR p.reserved_sales+p_qty>p.sale_limit THEN RAISE EXCEPTION 'This diary is not available for checkout'; END IF;
 IF (p.price_paise*p_qty+s.shipping_paise)>10000000 THEN RAISE EXCEPTION 'Order amount exceeds checkout limit'; END IF;
 IF p_expected_total IS DISTINCT FROM (p.price_paise*p_qty+s.shipping_paise) THEN RAISE EXCEPTION 'Price changed. Review checkout again.'; END IF;
 UPDATE public.products SET reserved_sales=reserved_sales+p_qty WHERE id=p.id;
 INSERT INTO public.orders(id,order_number,user_id,customer_name,customer_phone,customer_email,shipping_address,status,subtotal_paise,shipping_paise,total_paise,payment_status,checkout_key,terms_version,consent_text,consent_name,consent_at,dispatch_snapshot,sale_snapshot)
 VALUES(oid,'CMD-'||upper(substr(replace(oid::text,'-',''),1,16)),p_user,p_customer->>'name',p_customer->>'phone',p_customer->>'email',p_customer->'address','awaiting_confirmation',p.price_paise*p_qty,s.shipping_paise,p.price_paise*p_qty+s.shipping_paise,'pending',p_key,p_terms,p_consent,p_customer->>'signedName',now(),s.dispatch_note,p.sale_description) RETURNING * INTO o;
 INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit_price_paise,total_price_paise) VALUES(oid,p.id,p.name,p_qty,p.price_paise,p.price_paise*p_qty);
 INSERT INTO public.order_events(order_id,event_type,description) VALUES(oid,'checkout_started','Checkout created; payment confirmation is pending.');
 RETURN jsonb_build_object('created',true,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION public.begin_checkout(uuid,uuid,text,integer,jsonb,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_checkout(uuid,uuid,text,integer,jsonb,text,text,bigint) TO service_role;

CREATE FUNCTION public.confirm_gateway_payment(p_order uuid,p_gateway_order text,p_payment text,p_amount bigint,p_refunded bigint DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.orders; next_payment text;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.checkout_key IS NULL OR o.total_paise<>p_amount OR (o.gateway_order_id IS NOT NULL AND o.gateway_order_id<>p_gateway_order) OR (o.gateway_payment_id IS NOT NULL AND o.gateway_payment_id<>p_payment) THEN RAISE EXCEPTION 'Payment mismatch'; END IF;
 IF p_refunded<0 OR p_refunded>p_amount THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;
 p_refunded:=greatest(p_refunded,o.refunded_paise);
 next_payment:=CASE WHEN p_refunded=p_amount THEN 'refunded' WHEN p_refunded>0 THEN 'partially_refunded' ELSE 'paid' END;
 IF o.payment_status=next_payment AND o.refunded_paise=p_refunded THEN RETURN; END IF;
 UPDATE public.orders SET gateway_order_id=p_gateway_order,gateway_payment_id=p_payment,payment_status=next_payment,refunded_paise=p_refunded,
 status=CASE WHEN next_payment='refunded' THEN 'refunded' WHEN status='awaiting_confirmation' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=p_order;
 INSERT INTO public.order_events(order_id,event_type,description) VALUES(p_order,'payment_'||next_payment,CASE WHEN next_payment='paid' THEN 'Payment verified with the payment provider. Your order is confirmed.' ELSE 'Refund status updated from the payment provider.' END);
END $$;
REVOKE ALL ON FUNCTION public.confirm_gateway_payment(uuid,text,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_gateway_payment(uuid,text,text,bigint,bigint) TO service_role;

CREATE FUNCTION public.request_customer_cancellation(p_user uuid,p_order uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.orders;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR o.status NOT IN('draft','awaiting_confirmation','confirmed','in_production') OR length(p_reason)>1000 THEN RAISE EXCEPTION 'Cannot request cancellation'; END IF;
 IF o.cancellation_reason IS NOT NULL THEN RETURN; END IF;
 UPDATE public.orders SET cancellation_reason=p_reason,updated_at=now() WHERE id=p_order;
 INSERT INTO public.order_events(order_id,event_type,description) VALUES(p_order,'cancellation_requested','Cancellation requested by customer. Awaiting review; this does not confirm cancellation or a refund.');
END $$;
REVOKE ALL ON FUNCTION public.request_customer_cancellation(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_customer_cancellation(uuid,uuid,text) TO service_role;

CREATE TABLE public.career_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name)<=100), email text NOT NULL, role text NOT NULL CHECK(length(role)<=80),
 introduction text NOT NULL CHECK(length(introduction)<=2000), links jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'received' CHECK(status IN('received','reviewing','task_sent','shortlisted','closed')),
 privacy_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,role)
);
CREATE TABLE public.career_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.career_applications(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title)<=160), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 links jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.career_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.career_applications(id) ON DELETE CASCADE,
 submission_id uuid NOT NULL REFERENCES public.career_submissions(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name)<=180), path text NOT NULL UNIQUE, size integer NOT NULL CHECK(size>0 AND size<=2097152),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','uploaded')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.career_applications(created_at DESC);
CREATE INDEX ON public.career_submissions(application_id);
CREATE INDEX ON public.career_files(application_id);
CREATE FUNCTION public.create_career_submission(p_user uuid,p_application uuid,p_title text,p_notes text,p_links jsonb)
RETURNS public.career_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.career_submissions;
BEGIN
 PERFORM 1 FROM public.career_applications WHERE id=p_application AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 IF (SELECT count(*) FROM public.career_submissions WHERE application_id=p_application)>=10 THEN RAISE EXCEPTION 'Submission limit reached'; END IF;
 INSERT INTO public.career_submissions(application_id,title,notes,links) VALUES(p_application,p_title,p_notes,p_links) RETURNING * INTO s;
 RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) TO service_role;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_files ENABLE ROW LEVEL SECURITY;
-- Access goes through authenticated server routes; no public direct writes or file URLs.
REVOKE ALL ON public.career_applications,public.career_submissions,public.career_files FROM anon,authenticated;
GRANT ALL ON public.career_applications,public.career_submissions,public.career_files TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('career-files','career-files',false,2097152,ARRAY['application/octet-stream']) ON CONFLICT(id) DO NOTHING;

CREATE FUNCTION public.reserve_career_file(p_user uuid,p_submission uuid,p_name text,p_size integer)
RETURNS public.career_files LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a uuid; f public.career_files;
BEGIN
 PERFORM pg_advisory_xact_lock(721022);
 SELECT s.application_id INTO a FROM public.career_submissions s JOIN public.career_applications c ON c.id=s.application_id WHERE s.id=p_submission AND c.user_id=p_user;
 IF a IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
 IF (SELECT count(*) FROM public.career_files WHERE submission_id=p_submission)>=3 OR (SELECT coalesce(sum(size),0) FROM public.career_files WHERE application_id=a)+p_size>6291456 OR (SELECT coalesce(sum(size),0) FROM public.career_files WHERE state='reserved')+(SELECT coalesce(sum((metadata->>'size')::bigint),0) FROM storage.objects WHERE bucket_id='career-files')+p_size>134217728 THEN RAISE EXCEPTION 'Upload allowance reached. Please submit a Drive link instead.'; END IF;
 INSERT INTO public.career_files(application_id,submission_id,name,path,size) VALUES(a,p_submission,p_name,p_user::text||'/'||gen_random_uuid()::text,p_size) RETURNING * INTO f;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) TO service_role;
COMMIT;
