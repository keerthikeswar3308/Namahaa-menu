import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { initialCategories, initialMenuItems } from '@/data/initialMenuData';
import { defaultGalleryImages, defaultRestaurantInfo } from '@/data/restaurantInfo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // 1. Parallel execution of all table queries via Promise.all to minimize Cloudflare Worker CPU execution time
    const [catRes, menuRes, infoRes, galRes] = await Promise.all([
      supabaseAdmin.from('categories').select('*').order('display_order', { ascending: true }),
      supabaseAdmin.from('menu_items').select('*').order('display_order', { ascending: true }),
      supabaseAdmin.from('restaurant_info').select('*').limit(1).single(),
      supabaseAdmin.from('gallery').select('*').order('created_at', { ascending: false }),
    ]);

    let categories = catRes.data;
    let menuItems = menuRes.data;
    let restaurantInfo = infoRes.data;
    let gallery = galRes.data;

    if (catRes.error) console.warn('API /api/menu categories fetch error:', catRes.error);
    if (menuRes.error) console.warn('API /api/menu items fetch error:', menuRes.error);
    if (infoRes.error && infoRes.error.code !== 'PGRST116') console.warn('API /api/menu restaurant_info fetch error:', infoRes.error);
    if (galRes.error) console.warn('API /api/menu gallery fetch error:', galRes.error);

    // --- SEEDING SAFETY: ONLY seed if tables are completely empty (0 records) ---
    // If Supabase contains existing Admin records, NEVER overwrite them.

    if (!categories || categories.length === 0) {
      const catSeed = initialCategories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        image: c.image || '',
        display_order: c.displayOrder || idx + 1,
        is_enabled: c.isEnabled !== false,
      }));
      const { error: seedCatErr } = await supabaseAdmin.from('categories').upsert(catSeed, { onConflict: 'id' });
      if (!seedCatErr) {
        const recheck = await supabaseAdmin.from('categories').select('*').order('display_order', { ascending: true });
        if (recheck.data && recheck.data.length > 0) {
          categories = recheck.data;
        }
      } else {
        console.error('API /api/menu initial categories seed error:', seedCatErr);
      }
    }

    if (!menuItems || menuItems.length === 0) {
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
      const { error: seedItemErr } = await supabaseAdmin.from('menu_items').upsert(itemSeed, { onConflict: 'id' });
      if (!seedItemErr) {
        const recheckItems = await supabaseAdmin.from('menu_items').select('*').order('display_order', { ascending: true });
        if (recheckItems.data && recheckItems.data.length > 0) {
          menuItems = recheckItems.data;
        }
      } else {
        console.error('API /api/menu initial items seed error:', seedItemErr);
      }
    }

    if (!restaurantInfo) {
      let seedPayload: any = {
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
      };

      const { error: seedInfoErr } = await supabaseAdmin.from('restaurant_info').upsert(seedPayload, { onConflict: 'id' });

      if (!seedInfoErr) {
        const recheckInfo = await supabaseAdmin.from('restaurant_info').select('*').limit(1).single();
        if (recheckInfo.data) {
          restaurantInfo = recheckInfo.data;
        }
      } else {
        console.error('API /api/menu initial restaurant_info seed error:', seedInfoErr);
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
      const { error: seedGalErr } = await supabaseAdmin.from('gallery').upsert(galSeed, { onConflict: 'id' });
      if (!seedGalErr) {
        const recheckGal = await supabaseAdmin.from('gallery').select('*').order('created_at', { ascending: false });
        if (recheckGal.data && recheckGal.data.length > 0) {
          gallery = recheckGal.data;
        }
      } else {
        console.error('API /api/menu initial gallery seed error:', seedGalErr);
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
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/menu exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching menu from Supabase' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
