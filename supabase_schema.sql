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
CREATE POLICY "Allow public read access on categories" 
    ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow all management operations on categories" 
    ON public.categories FOR ALL USING (true);

-- Menu Items RLS
CREATE POLICY "Allow public read access on menu_items" 
    ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow all management operations on menu_items" 
    ON public.menu_items FOR ALL USING (true);

-- Restaurant Info RLS
CREATE POLICY "Allow public read access on restaurant_info" 
    ON public.restaurant_info FOR SELECT USING (true);
CREATE POLICY "Allow all management operations on restaurant_info" 
    ON public.restaurant_info FOR ALL USING (true);

-- Gallery RLS
CREATE POLICY "Allow public read access on gallery" 
    ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Allow all management operations on gallery" 
    ON public.gallery FOR ALL USING (true);

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Insert Categories
INSERT INTO public.categories (id, name, description, display_order, is_enabled) VALUES
('cat-idly-vada', 'Idly & Vada Special', 'Melt-in-mouth Thatte Idlis, Crispy Medu Vadas & Ghee Sambar Dips', 1, true),
('cat-dosas', 'Benne & Signature Dosas', 'Crispy Tawa Dosas prepared with pure Davanagere butter & cow ghee', 2, true),
('cat-millet-dosas', 'Millet & Healthy Tiffins', 'Nutrient-rich Ragi, Kodo & Foxtail Millet preparations', 3, true),
('cat-rice-special', 'Heritage Rice & Bath', 'Bisi Bele Bath, Ghee Rice, Puliogare & Fresh Curd Rice', 4, true),
('cat-beverages', 'Filter Coffee & Drinks', 'Authentic South Indian Degree Filter Coffee & Refreshing Drinks', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Insert Restaurant Info
INSERT INTO public.restaurant_info (
    id, name, tagline, description, logo_url, banner_url, phone, email, address, 
    google_maps_url, instagram_url, facebook_url, opening_hours, hero_title, hero_subtitle, 
    announcement_text, is_restaurant_open, copyright_text
) VALUES (
    1,
    'Namahaa Tiffin Room',
    'Experience Authentic South Indian Flavours',
    'Welcome to Namahaa Tiffin Room – a celebration of authentic South Indian heritage. We craft crispy Davanagere Benne Dosas, melt-in-mouth Thatte Idlis, fragrant Ghee Pongal, and nutrient-dense Millet Dosas prepared using pure ghee and traditional iron tawas.',
    '/logo-circle.svg',
    '/logo-banner.svg',
    '+91 98765 43210',
    'hello@namahaatiffinroom.com',
    'Main Road, Near Heritage Hub, South Indian Culinary District',
    'https://maps.google.com/?q=Namahaa+Tiffin+Room',
    'https://www.instagram.com/namahaa.tiffinroom/',
    'https://facebook.com/namahaa.tiffinroom',
    '[{"days": "Monday - Sunday (Morning Session)", "hours": "7:00 AM - 12:30 PM"}, {"days": "Monday - Sunday (Evening Session)", "hours": "4:30 PM - 10:30 PM"}]'::jsonb,
    'Authentic South Indian Heritage',
    'Handcrafted Dosa, Ghee Thatte Idly & Traditional Tiffins',
    '✨ Pure Vegetarian • Made with 100% Pure Cow Ghee & White Butter • Fresh Daily Batch',
    true,
    '© 2026 Namahaa Tiffin Room. All Rights Reserved.'
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Gallery Images
INSERT INTO public.gallery (id, url, title, category, is_enabled) VALUES
('gal-1', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80', 'Hot Soft Steamed Idlis', 'Breakfast', true),
('gal-2', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80', 'Golden Benne Masala Dosa', 'Special Dosas', true),
('gal-3', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80', 'Ghee Sambar Idly & Vada Combo', 'Idly & Vada', true),
('gal-4', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80', 'Aromatic Ghee Pongal', 'Heritage Tiffin', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================================
-- 6. SUPABASE STORAGE BUCKET CONFIGURATION (food-menu-images)
-- Secure Architecture: Public Read Only for Customers
-- Uploads / Deletions run securely via Next.js Server API
-- ========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-menu-images', 'food-menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Customers have public read access only (no anonymous upload/delete)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Food Menu Images') THEN
        CREATE POLICY "Public Read Food Menu Images" ON storage.objects FOR SELECT USING (bucket_id = 'food-menu-images');
    END IF;
END $$;
