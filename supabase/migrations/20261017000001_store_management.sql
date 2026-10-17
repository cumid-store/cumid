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
CREATE POLICY "Public can view published products" 
  ON public.products FOR SELECT 
  USING (is_published = TRUE OR public.is_admin());

CREATE POLICY "Admin full access to products" 
  ON public.products FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Product Images RLS
CREATE POLICY "Public can view product images" 
  ON public.product_images FOR SELECT 
  USING (TRUE);

CREATE POLICY "Admin full access to product images" 
  ON public.product_images FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Batches RLS
CREATE POLICY "Admin full access to batches" 
  ON public.batches FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Inventory RLS
CREATE POLICY "Admin full access to inventory" 
  ON public.inventory FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Enquiries RLS: Public can submit preorders; Admin can manage all
CREATE POLICY "Public can submit enquiries" 
  ON public.enquiries FOR INSERT 
  WITH CHECK (TRUE);

CREATE POLICY "Admin can view and update enquiries" 
  ON public.enquiries FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Orders RLS: Customers can view only their own orders; Admin can manage all
CREATE POLICY "Customers can view own orders" 
  ON public.orders FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin full access to orders" 
  ON public.orders FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Order Items RLS
CREATE POLICY "Customers can view items of own orders" 
  ON public.order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admin full access to order items" 
  ON public.order_items FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Order Events RLS
CREATE POLICY "Customers can view events of own orders" 
  ON public.order_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_events.order_id 
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admin full access to order events" 
  ON public.order_events FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Admin Audit Log RLS
CREATE POLICY "Admin can view audit logs" 
  ON public.admin_audit_log FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admin can insert audit logs" 
  ON public.admin_audit_log FOR INSERT 
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
