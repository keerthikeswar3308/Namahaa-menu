import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { initialCategories, initialMenuItems } from '@/data/initialMenuData';
import { defaultGalleryImages, defaultRestaurantInfo } from '@/data/restaurantInfo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // 1. Fetch Categories
    let { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (catError) {
      console.warn('API /api/menu categories fetch error:', catError);
    }

    // 2. Fetch Menu Items
    let { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (menuError) {
      console.warn('API /api/menu items fetch error:', menuError);
    }

    // 3. Fetch Restaurant Info
    let { data: restaurantInfo } = await supabaseAdmin
      .from('restaurant_info')
      .select('*')
      .limit(1)
      .single();

    // 4. Fetch Gallery
    let { data: gallery } = await supabaseAdmin
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    // --- AUTO-SEED: If database tables are empty, seed initial data automatically ---
    let needsReseed = false;

    if (!categories || categories.length === 0) {
      needsReseed = true;
      const catSeed = initialCategories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        image: c.image || '',
        display_order: c.displayOrder || idx + 1,
        is_enabled: c.isEnabled !== false,
      }));
      await supabaseAdmin.from('categories').upsert(catSeed);
      const recheck = await supabaseAdmin.from('categories').select('*').order('display_order', { ascending: true });
      if (recheck.data && recheck.data.length > 0) {
        categories = recheck.data;
      }
    }

    if (!menuItems || menuItems.length === 0) {
      needsReseed = true;
      const itemSeed = initialMenuItems.map((item, idx) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price),
        category_id: item.categoryId,
        category_name: item.categoryName,
        image: item.image,
        image_url: item.image,
        is_veg: item.isVeg !== false,
        preparation_time: item.preparationTime || '10 mins',
        is_available: item.isAvailable !== false,
        is_popular: Boolean(item.isPopular),
        is_chef_special: Boolean(item.isChefSpecial),
        is_today_special: Boolean(item.isTodaySpecial),
        ingredients: item.ingredients || [],
        chef_recommendation: item.chefRecommendation || '',
        display_order: item.displayOrder || idx + 1,
      }));
      await supabaseAdmin.from('menu_items').upsert(itemSeed);
      const recheckItems = await supabaseAdmin.from('menu_items').select('*').order('display_order', { ascending: true });
      if (recheckItems.data && recheckItems.data.length > 0) {
        menuItems = recheckItems.data;
      }
    }

    if (!restaurantInfo) {
      await supabaseAdmin.from('restaurant_info').upsert({
        id: 1,
        name: defaultRestaurantInfo.name,
        tagline: defaultRestaurantInfo.tagline,
        description: defaultRestaurantInfo.description,
        logo_url: defaultRestaurantInfo.logoUrl,
        banner_url: defaultRestaurantInfo.bannerUrl,
        phone: defaultRestaurantInfo.phone,
        email: defaultRestaurantInfo.email,
        address: defaultRestaurantInfo.address,
        google_maps_url: defaultRestaurantInfo.googleMapsUrl,
        instagram_url: defaultRestaurantInfo.instagramUrl,
        facebook_url: defaultRestaurantInfo.facebookUrl,
        opening_hours: defaultRestaurantInfo.openingHours,
        hero_title: defaultRestaurantInfo.heroTitle,
        hero_subtitle: defaultRestaurantInfo.heroSubtitle,
        announcement_text: defaultRestaurantInfo.announcementText,
        is_restaurant_open: defaultRestaurantInfo.isRestaurantOpen,
        copyright_text: defaultRestaurantInfo.copyrightText,
      });
      const recheckInfo = await supabaseAdmin.from('restaurant_info').select('*').limit(1).single();
      if (recheckInfo.data) {
        restaurantInfo = recheckInfo.data;
      }
    }

    if (!gallery || gallery.length === 0) {
      const galSeed = defaultGalleryImages.map((g) => ({
        id: g.id,
        url: g.url,
        title: g.title,
        category: g.category,
        is_enabled: g.isEnabled !== false,
      }));
      await supabaseAdmin.from('gallery').upsert(galSeed);
      const recheckGal = await supabaseAdmin.from('gallery').select('*').order('created_at', { ascending: false });
      if (recheckGal.data && recheckGal.data.length > 0) {
        gallery = recheckGal.data;
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        categories: categories || [],
        items: menuItems || [],
        restaurantInfo: restaurantInfo || null,
        gallery: gallery || [],
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/menu exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching menu' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
