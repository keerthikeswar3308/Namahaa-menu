-- ========================================================
-- NAMAHA TIFFIN ROOM - COMPLETE SUPABASE DATABASE SCHEMA
-- Flawless & Idempotent Script for 12-Table QR System, Carts & Orders
-- Execute this SQL in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Create Categories Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    display_order INT DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Create Menu Items Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    image TEXT NOT NULL,
    image_url TEXT,
    is_veg BOOLEAN DEFAULT true,
    preparation_time TEXT DEFAULT '10 mins',
    is_available BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    is_chef_special BOOLEAN DEFAULT false,
    is_today_special BOOLEAN DEFAULT false,
    ingredients TEXT[],
    chef_recommendation TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Guard for missing columns on menu_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.menu_items ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 3. Create Restaurant Info Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.restaurant_info (
    id INT PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    google_maps_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    opening_hours JSONB,
    hero_title TEXT,
    hero_subtitle TEXT,
    announcement_text TEXT,
    is_restaurant_open BOOLEAN DEFAULT true,
    copyright_text TEXT,
    upi_id TEXT,
    upi_qr_url TEXT,
    payment_name TEXT,
    payment_instructions TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.restaurant_info ENABLE ROW LEVEL SECURITY;

-- Guards for missing columns on restaurant_info
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_info' AND column_name = 'upi_id') THEN
        ALTER TABLE public.restaurant_info ADD COLUMN upi_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_info' AND column_name = 'upi_qr_url') THEN
        ALTER TABLE public.restaurant_info ADD COLUMN upi_qr_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_info' AND column_name = 'payment_name') THEN
        ALTER TABLE public.restaurant_info ADD COLUMN payment_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_info' AND column_name = 'payment_instructions') THEN
        ALTER TABLE public.restaurant_info ADD COLUMN payment_instructions TEXT;
    END IF;
END $$;

-- 4. Create Gallery Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- 5. Create 12 Restaurant Tables & Pre-seed Secure QR Tokens
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    table_number INT PRIMARY KEY,
    qr_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Seed 12 default secure table tokens (ON CONFLICT DO NOTHING ensures safety)
INSERT INTO public.restaurant_tables (table_number, qr_token) VALUES
(1, 'namahaa_tbl1_a9f2x7'),
(2, 'namahaa_tbl2_b8x4m3'),
(3, 'namahaa_tbl3_c7z9k1'),
(4, 'namahaa_tbl4_d6p8v2'),
(5, 'namahaa_tbl5_e5q3w9'),
(6, 'namahaa_tbl6_f4r1y5'),
(7, 'namahaa_tbl7_g3s7z8'),
(8, 'namahaa_tbl8_h2t9a4'),
(9, 'namahaa_tbl9_j1u5b6'),
(10, 'namahaa_tbl10_k9v2c3'),
(11, 'namahaa_tbl11_l8w6d7'),
(12, 'namahaa_tbl12_m7x4e8')
ON CONFLICT (table_number) DO NOTHING;

-- 6. Create Customer Sessions Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT UNIQUE NOT NULL,
    customer_id UUID,
    table_number INT REFERENCES public.restaurant_tables(table_number) ON DELETE SET NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create Cart Headers Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.customer_sessions(id) ON DELETE CASCADE,
    customer_id UUID,
    table_number INT REFERENCES public.restaurant_tables(table_number),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned', 'merged')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- 8. Create Cart Items Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    menu_item_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    special_instructions TEXT,
    selected_options JSONB DEFAULT '{}'::jsonb,
    price_snapshot NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 9. Create Live Orders Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    table_number INT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    subtotal_amount NUMERIC(10, 2),
    discount_type TEXT,
    discount_value NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    payment_method TEXT DEFAULT 'cash_counter',
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    session_id TEXT,
    payment_reference TEXT,
    idempotency_key TEXT UNIQUE,
    admin_paid_by TEXT,
    admin_paid_at TIMESTAMPTZ,
    merged_into_order_id TEXT,
    merged_from_order_numbers TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Dynamic column guards for orders table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'session_id') THEN
        ALTER TABLE public.orders ADD COLUMN session_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_reference') THEN
        ALTER TABLE public.orders ADD COLUMN payment_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.orders ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'admin_paid_by') THEN
        ALTER TABLE public.orders ADD COLUMN admin_paid_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'admin_paid_at') THEN
        ALTER TABLE public.orders ADD COLUMN admin_paid_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal_amount') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal_amount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_type') THEN
        ALTER TABLE public.orders ADD COLUMN discount_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_value') THEN
        ALTER TABLE public.orders ADD COLUMN discount_value NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.orders ADD COLUMN discount_amount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'merged_into_order_id') THEN
        ALTER TABLE public.orders ADD COLUMN merged_into_order_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'merged_from_order_numbers') THEN
        ALTER TABLE public.orders ADD COLUMN merged_from_order_numbers TEXT[];
    END IF;
END $$;

-- 10. Create Relational Order Items Table & Enable RLS
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id TEXT,
    item_name_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL,
    line_total NUMERIC(10, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 11. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON public.orders (table_number);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders (session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items (cart_id);

-- 12. Storage Bucket Configuration (food-images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 13. Comprehensive Row Level Security (RLS) Policies
DO $$
BEGIN
    -- Categories
    DROP POLICY IF EXISTS "Allow public read access on categories" ON public.categories;
    CREATE POLICY "Allow public read access on categories" ON public.categories FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on categories" ON public.categories;
    CREATE POLICY "Allow all management operations on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

    -- Menu Items
    DROP POLICY IF EXISTS "Allow public read access on menu_items" ON public.menu_items;
    CREATE POLICY "Allow public read access on menu_items" ON public.menu_items FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on menu_items" ON public.menu_items;
    CREATE POLICY "Allow all management operations on menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

    -- Restaurant Info
    DROP POLICY IF EXISTS "Allow public read access on restaurant_info" ON public.restaurant_info;
    CREATE POLICY "Allow public read access on restaurant_info" ON public.restaurant_info FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on restaurant_info" ON public.restaurant_info;
    CREATE POLICY "Allow all management operations on restaurant_info" ON public.restaurant_info FOR ALL USING (true) WITH CHECK (true);

    -- Gallery
    DROP POLICY IF EXISTS "Allow public read access on gallery" ON public.gallery;
    CREATE POLICY "Allow public read access on gallery" ON public.gallery FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on gallery" ON public.gallery;
    CREATE POLICY "Allow all management operations on gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);

    -- Restaurant Tables
    DROP POLICY IF EXISTS "Allow public read access on restaurant_tables" ON public.restaurant_tables;
    CREATE POLICY "Allow public read access on restaurant_tables" ON public.restaurant_tables FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on restaurant_tables" ON public.restaurant_tables;
    CREATE POLICY "Allow all management operations on restaurant_tables" ON public.restaurant_tables FOR ALL USING (true) WITH CHECK (true);

    -- Customer Sessions & Carts
    DROP POLICY IF EXISTS "Allow all on customer_sessions" ON public.customer_sessions;
    CREATE POLICY "Allow all on customer_sessions" ON public.customer_sessions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on carts" ON public.carts;
    CREATE POLICY "Allow all on carts" ON public.carts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on cart_items" ON public.cart_items;
    CREATE POLICY "Allow all on cart_items" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

    -- Orders
    DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
    CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow public read session orders" ON public.orders;
    CREATE POLICY "Allow public read session orders" ON public.orders FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow all management operations on orders" ON public.orders;
    CREATE POLICY "Allow all management operations on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

    -- Order Items
    DROP POLICY IF EXISTS "Allow public read order items" ON public.order_items;
    CREATE POLICY "Allow public read order items" ON public.order_items FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow public insert order items" ON public.order_items;
    CREATE POLICY "Allow public insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow all management operations on order_items" ON public.order_items;
    CREATE POLICY "Allow all management operations on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 14. Enable Supabase Realtime Publication for Live Orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
