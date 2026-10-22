-- CUMID: complete missing Supabase setup. Run in the owner's Supabase SQL Editor.
-- Adds missing modules, preserves existing order/payment snapshots, and sets diary price to Rs 149.
-- Checkout stays disabled by default. No credentials are embedded. Safe to run again.
BEGIN;
DO $repair$ BEGIN
IF to_regclass('public.profiles') IS NULL THEN
EXECUTE $step0$
-- ==============================================================================
-- CUMID STORE (cumid.store) — SUPABASE INITIAL SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create favourites table with unique constraint to prevent duplicate saves
CREATE TABLE IF NOT EXISTS public.favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_product_favourite UNIQUE (user_id, product_id)
);

-- Index for fast user favourites retrieval
CREATE INDEX IF NOT EXISTS idx_favourites_user_id ON public.favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_product_id ON public.favourites(product_id);

-- 3. Enable Row-Level Security (RLS) on all user-data tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Profiles Table
-- Policy: Users can view only their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Users can update only their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 5. RLS Policies for Favourites Table
-- Policy: Users can view only their own favourites
CREATE POLICY "Users can view own favourites" 
  ON public.favourites 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert favourites only for their own user_id
CREATE POLICY "Users can insert own favourites" 
  ON public.favourites 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own favourites
CREATE POLICY "Users can delete own favourites" 
  ON public.favourites 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Trigger to automatically create a profile record upon OAuth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Reader'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Account Self-Service Deletion Function (RPC)
-- Securely deletes the caller's auth account and cascading records
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID AS $$
BEGIN
  -- Authenticated user can delete only their own account
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

$step0$;
END IF;
IF to_regclass('public.orders') IS NULL THEN
EXECUTE $step1$
-- ==============================================================================
-- CUMID STORE (cumid.store) — STORE MANAGEMENT MIGRATION (Phase 2)
-- Tables: products, product_images, batches, inventory, enquiries,
--         orders, order_items, order_events, admin_audit_log
-- ==============================================================================

-- 1. Upgrade profiles table with role and phone
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Products table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  collection TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  price_paise BIGINT, -- NULL if unconfirmed; integer paise (100 paise = 1 INR)
  currency TEXT NOT NULL DEFAULT 'INR',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_sold_out BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  personality_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);

-- 4. Product Images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- 5. Production Batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_quantity INT NOT NULL DEFAULT 0,
  expected_dispatch_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_production', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  available_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Preorder Enquiries table
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);

-- 8. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'awaiting_confirmation',
      'confirmed',
      'in_production',
      'ready',
      'dispatched',
      'delivered',
      'cancelled',
      'refunded'
    )
  ),
  subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  shipping_paise BIGINT NOT NULL DEFAULT 0 CHECK (shipping_paise >= 0),
  total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  tracking_number TEXT,
  tracking_carrier TEXT,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 9. Order Items table (Immutable snapshot of product name and unit price at time of order)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_paise >= 0),
  total_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_price_paise >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 10. Order Events (Timeline audit history)
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);

-- 11. Admin Audit Log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_log(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Products RLS
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products FOR SELECT 
  USING (is_published = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access to products" ON public.products;
CREATE POLICY "Admin full access to products" ON public.products FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Product Images RLS
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT 
  USING (TRUE);

DROP POLICY IF EXISTS "Admin full access to product images" ON public.product_images;
CREATE POLICY "Admin full access to product images" ON public.product_images FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Batches RLS
DROP POLICY IF EXISTS "Admin full access to batches" ON public.batches;
CREATE POLICY "Admin full access to batches" ON public.batches FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Inventory RLS
DROP POLICY IF EXISTS "Admin full access to inventory" ON public.inventory;
CREATE POLICY "Admin full access to inventory" ON public.inventory FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Enquiries RLS: Public can submit preorders; Admin can manage all
DROP POLICY IF EXISTS "Public can submit enquiries" ON public.enquiries;
CREATE POLICY "Public can submit enquiries" ON public.enquiries FOR INSERT 
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin can view and update enquiries" ON public.enquiries;
CREATE POLICY "Admin can view and update enquiries" ON public.enquiries FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Orders RLS: Customers can view only their own orders; Admin can manage all
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access to orders" ON public.orders;
CREATE POLICY "Admin full access to orders" ON public.orders FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Order Items RLS
DROP POLICY IF EXISTS "Customers can view items of own orders" ON public.order_items;
CREATE POLICY "Customers can view items of own orders" ON public.order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin full access to order items" ON public.order_items;
CREATE POLICY "Admin full access to order items" ON public.order_items FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Order Events RLS
DROP POLICY IF EXISTS "Customers can view events of own orders" ON public.order_events;
CREATE POLICY "Customers can view events of own orders" ON public.order_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_events.order_id 
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admin full access to order events" ON public.order_events;
CREATE POLICY "Admin full access to order events" ON public.order_events FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Admin Audit Log RLS
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admin can view audit logs" ON public.admin_audit_log FOR SELECT 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admin can insert audit logs" ON public.admin_audit_log FOR INSERT 
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- SEED 13 PRODUCTS INTO DATABASE TABLE (Initial Sync)
-- ==============================================================================

INSERT INTO public.products (
  id, slug, name, tagline, short_description, long_description,
  collection, collection_name, price_paise, currency, is_published, is_sold_out,
  confirmed_specs, personality_note
) VALUES
  ('CUMID-FL-001', 'lavender-bloom', 'Lavender Bloom', 'For your late-night notes.', 'Purple flowers, a crescent moon and a lavender sky.', 'Purple flowers, a crescent moon and a lavender sky. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'floral', 'Floral', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'For your late-night notes.'),
  ('CUMID-HG-001', 'kal-se-productive', 'Kal Se Productive', 'Tomorrow looks productive.', 'A blue clock cover with a familiar promise: “Kal se productive. Pakka.”', 'A blue clock cover with a familiar promise: “Kal se productive. Pakka.” Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'hinglish', 'Hinglish', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Tomorrow looks productive.'),
  ('CUMID-CT-001', 'low-battery', 'Low Battery', 'Big plans. Very little charge.', 'Peach artwork and a tired battery. “Plans bade. Battery low.”', 'Peach artwork and a tired battery. “Plans bade. Battery low.” Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cute', 'Cute', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Big plans. Very little charge.'),
  ('CUMID-CT-002', 'complicated-thoughts', 'Complicated Thoughts', 'A place for the overthinking.', 'A yellow cat cover that reads “Cute cover. Complicated thoughts.”', 'A yellow cat cover that reads “Cute cover. Complicated thoughts.” Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cute', 'Cute', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'A place for the overthinking.'),
  ('CUMID-CJ-001', 'grounded-temporarily', 'Grounded, Temporarily', 'For the next takeoff.', 'An aircraft against an icy blue background. “Grounded. Temporarily.”', 'An aircraft against an icy blue background. “Grounded. Temporarily.” Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cars-and-jets', 'Cars & Jets', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'For the next takeoff.'),
  ('CUMID-CJ-002', 'plans-in-overdrive', 'Plans in Overdrive', 'Ideas in the fast lane.', 'An orange sports car on a green cover, with racing-inspired lettering.', 'An orange sports car on a green cover, with racing-inspired lettering. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cars-and-jets', 'Cars & Jets', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Ideas in the fast lane.'),
  ('CUMID-CT-003', 'soft-looks-strong-opinions', 'Soft Looks, Strong Opinions', 'Sweet cover. Clear opinions.', 'A lavender bunny cover with the words “Soft looks. Strong opinions.”', 'A lavender bunny cover with the words “Soft looks. Strong opinions.” Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cute', 'Cute', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Sweet cover. Clear opinions.'),
  ('CUMID-CJ-003', 'afterburner', 'Afterburner', 'A notebook for flight plans.', 'Jet-themed artwork from the aviation cover series.', 'Jet-themed artwork from the aviation cover series. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cars-and-jets', 'Cars & Jets', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'A notebook for flight plans.'),
  ('CUMID-OR-001', 'desi-by-default', 'Desi by Default', 'Everyday India, on your cover.', 'Chai, cricket, a kite and an auto-rickshaw surround bold orange lettering.', 'Chai, cricket, a kite and an auto-rickshaw surround bold orange lettering. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'originals', 'Originals', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Everyday India, on your cover.'),
  ('CUMID-OR-002', 'built-for-grit', 'Built for Grit', 'For plans that take persistence.', 'Army-inspired cover artwork from the original catalogue.', 'Army-inspired cover artwork from the original catalogue. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'originals', 'Originals', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'For plans that take persistence.'),
  ('CUMID-CT-004', 'boo-whatever', 'Boo. Whatever.', 'A little spooky. Mostly unbothered.', 'A ghost-themed cover with a dry sense of humour.', 'A ghost-themed cover with a dry sense of humour. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'cute', 'Cute', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'A little spooky. Mostly unbothered.'),
  ('CUMID-OR-003', 'too-many-tabs', 'Too Many Tabs', 'Write one thought down. Then the next.', 'Doodle artwork for a brain with too many tabs open.', 'Doodle artwork for a brain with too many tabs open. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'originals', 'Originals', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Write one thought down. Then the next.'),
  ('CUMID-OR-004', 'hero-in-progress', 'Hero in Progress', 'Still figuring out the superpowers.', 'A comic-style heroine, cosmic skies and an illustrated Indian city.', 'A comic-style heroine, cosmic skies and an illustrated Indian city. Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.', 'originals', 'Originals', NULL, 'INR', TRUE, TRUE, '{"format":"Square pocket diary","binding":"Spiral binding along top edge","orientation":"Top-flip notebook format"}'::jsonb, 'Still figuring out the superpowers.')
ON CONFLICT (id) DO NOTHING;

$step1$;
END IF;
IF to_regclass('public.commerce_settings') IS NULL THEN
EXECUTE $step2$

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


$step2$;
END IF;
IF to_regclass('public.career_applications') IS NULL THEN
EXECUTE $step3$
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

$step3$;
END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_applications' AND column_name='task_deadline') THEN
EXECUTE $step4$

ALTER TABLE public.career_applications
 ADD COLUMN task_opens_at timestamptz,
 ADD COLUMN task_deadline timestamptz,
 ADD COLUMN task_brief text NOT NULL DEFAULT '' CHECK(length(task_brief)<=4000),
 ADD CONSTRAINT task_window_valid CHECK((task_opens_at IS NULL AND task_deadline IS NULL) OR (task_opens_at IS NOT NULL AND task_deadline>task_opens_at));

CREATE POLICY "Candidate or admin reads applications" ON public.career_applications FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY "Candidate or admin reads submissions" ON public.career_submissions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.career_applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.is_admin())));
CREATE POLICY "Candidate or admin reads file metadata" ON public.career_files FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.career_applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.is_admin())));
GRANT SELECT ON public.career_applications,public.career_submissions,public.career_files TO authenticated;

CREATE FUNCTION public.apply_for_career(p_name text,p_role text,p_introduction text,p_links jsonb,p_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid:=auth.uid(); a public.career_applications; added boolean:=false;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in to apply'; END IF;
 IF p_role NOT IN('Design & illustration','Content & social media','Web development','Marketing & sales','Operations & sourcing','Other') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 1 AND 100 OR length(trim(p_introduction)) NOT BETWEEN 1 AND 2000 OR length(p_role)>80 OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)>10 THEN RAISE EXCEPTION 'Invalid application'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_links) v WHERE jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^https://') THEN RAISE EXCEPTION 'Use HTTPS links'; END IF;
 INSERT INTO public.career_applications(user_id,name,email,role,introduction,links,privacy_version)
 SELECT u,trim(p_name),email,p_role,trim(p_introduction),p_links,p_version FROM auth.users WHERE id=u
 ON CONFLICT(user_id,role) DO NOTHING RETURNING * INTO a;
 IF FOUND THEN added:=true; ELSE SELECT * INTO a FROM public.career_applications WHERE user_id=u AND role=p_role; END IF;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Application was not saved'; END IF;
 RETURN jsonb_build_object('id',a.id,'name',a.name,'role',a.role,'status',a.status,'created_at',a.created_at,'task_opens_at',a.task_opens_at,'task_deadline',a.task_deadline,'task_brief',a.task_brief,'created',added);
END $$;
REVOKE ALL ON FUNCTION public.apply_for_career(text,text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_for_career(text,text,text,jsonb,text) TO authenticated;

-- Preserve the existing quota/storage transactions behind ownership and time gates.
ALTER FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) RENAME TO create_career_submission_internal;
REVOKE ALL ON FUNCTION public.create_career_submission_internal(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.create_career_submission(p_user uuid,p_application uuid,p_title text,p_notes text,p_links jsonb)
RETURNS public.career_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.career_applications;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid()<>p_user) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO a FROM public.career_applications WHERE id=p_application AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR a.status<>'task_sent' OR a.task_opens_at IS NULL OR a.task_deadline IS NULL OR now()<a.task_opens_at OR now()>=a.task_deadline THEN RAISE EXCEPTION 'Task round is not open'; END IF;
 IF jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)>10 THEN RAISE EXCEPTION 'Invalid links'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_links) v WHERE jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^https://') THEN RAISE EXCEPTION 'Use HTTPS links'; END IF;
 RETURN public.create_career_submission_internal(p_user,p_application,p_title,p_notes,p_links);
END $$;
REVOKE ALL ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) TO authenticated,service_role;

ALTER FUNCTION public.reserve_career_file(uuid,uuid,text,integer) RENAME TO reserve_career_file_internal;
REVOKE ALL ON FUNCTION public.reserve_career_file_internal(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reserve_career_file(p_user uuid,p_submission uuid,p_name text,p_size integer)
RETURNS public.career_files LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM public.career_applications a JOIN public.career_submissions s ON s.application_id=a.id WHERE s.id=p_submission AND a.user_id=p_user AND a.status='task_sent' AND now()>=a.task_opens_at AND now()<a.task_deadline FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task round is not open'; END IF;
 RETURN public.reserve_career_file_internal(p_user,p_submission,p_name,p_size);
END $$;
REVOKE ALL ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) TO service_role;

CREATE FUNCTION public.manage_career_round(p_application uuid,p_status text,p_open timestamptz DEFAULT NULL,p_deadline timestamptz DEFAULT NULL,p_brief text DEFAULT NULL,p_update_window boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_status NOT IN('received','reviewing','task_sent','shortlisted','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF p_update_window THEN
  IF p_open IS NULL OR p_deadline IS NULL OR p_deadline<=p_open OR p_deadline<=now() OR length(trim(p_brief)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Choose a future deadline and task brief'; END IF;
  UPDATE public.career_applications SET status=p_status,task_opens_at=p_open,task_deadline=p_deadline,task_brief=trim(p_brief) WHERE id=p_application;
 ELSE UPDATE public.career_applications SET status=p_status WHERE id=p_application;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) TO authenticated;

$step4$;
END IF;
END $repair$;

-- Owner-confirmed selling price and MRP: ₹149 and ₹200 per diary.
-- MRP is the shared published value in src/config/pricing.ts.
ALTER TABLE public.products ALTER COLUMN price_paise SET DEFAULT 14900;
UPDATE public.products SET price_paise=14900,updated_at=now();
-- Existing order snapshots and payment amounts remain as agreed at purchase.

COMMIT;
NOTIFY pgrst, 'reload schema';
