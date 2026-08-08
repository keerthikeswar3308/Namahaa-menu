-- ========================================================
-- NAMAHA TIFFIN ROOM - SUPABASE DATABASE SCHEMA & MIGRATION
-- Execute this SQL in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Create Categories Table
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

-- 2. Create Menu Items Table
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

-- If table already exists without image_url column:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.menu_items ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 3. Create Restaurant Info Table
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allow public reading for table QR digital menu
-- ========================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Categories RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on categories') THEN
        CREATE POLICY "Allow public read access on categories" ON public.categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all management operations on categories') THEN
        CREATE POLICY "Allow all management operations on categories" ON public.categories FOR ALL USING (true);
    END IF;
END $$;

-- Menu Items RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on menu_items') THEN
        CREATE POLICY "Allow public read access on menu_items" ON public.menu_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all management operations on menu_items') THEN
        CREATE POLICY "Allow all management operations on menu_items" ON public.menu_items FOR ALL USING (true);
    END IF;
END $$;

-- Restaurant Info RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on restaurant_info') THEN
        CREATE POLICY "Allow public read access on restaurant_info" ON public.restaurant_info FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all management operations on restaurant_info') THEN
        CREATE POLICY "Allow all management operations on restaurant_info" ON public.restaurant_info FOR ALL USING (true);
    END IF;
END $$;

-- Gallery RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on gallery') THEN
        CREATE POLICY "Allow public read access on gallery" ON public.gallery FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all management operations on gallery') THEN
        CREATE POLICY "Allow all management operations on gallery" ON public.gallery FOR ALL USING (true);
    END IF;
END $$;

-- ========================================================
-- 5. SUPABASE STORAGE BUCKET CONFIGURATION (food-images)
-- Public Bucket: ON for customer read access
-- Uploads / Deletions run securely via Next.js Server API
-- ========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Customers have public read access to food-images
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Food Images') THEN
        CREATE POLICY "Public Read Food Images" ON storage.objects FOR SELECT USING (bucket_id = 'food-images');
    END IF;
END $$;
