import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyAdminRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Strict Server-Side Authentication Verification
    const isAuthorized = verifyAdminRequest(request);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Valid Admin passcode or session token required',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      items,
      categories,
      restaurantInfo,
      gallery,
      mode = 'merge',
      deleteItemId,
      deleteCategoryId,
      deleteGalleryId,
    } = body;

    // 2. Handle Individual Record Deletions
    if (deleteItemId) {
      const { error: delItemErr } = await supabaseAdmin
        .from('menu_items')
        .delete()
        .eq('id', deleteItemId);

      if (delItemErr) {
        console.error('Supabase delete item error:', delItemErr);
        return NextResponse.json(
          { success: false, error: `Failed to delete menu item: ${delItemErr.message}` },
          { status: 500 }
        );
      }
    }

    if (deleteCategoryId) {
      const { error: delCatErr } = await supabaseAdmin
        .from('categories')
        .delete()
        .eq('id', deleteCategoryId);

      if (delCatErr) {
        console.error('Supabase delete category error:', delCatErr);
        return NextResponse.json(
          { success: false, error: `Failed to delete category: ${delCatErr.message}` },
          { status: 500 }
        );
      }
    }

    if (deleteGalleryId) {
      const { error: delGalErr } = await supabaseAdmin
        .from('gallery')
        .delete()
        .eq('id', deleteGalleryId);

      if (delGalErr) {
        console.error('Supabase delete gallery error:', delGalErr);
        return NextResponse.json(
          { success: false, error: `Failed to delete gallery image: ${delGalErr.message}` },
          { status: 500 }
        );
      }
    }

    // 3. Sync Categories first (Categories must exist before items for Foreign Key validity)
    if (categories && categories.length > 0) {
      const catPayload = categories.map((c: any, idx: number) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        image: c.image || '',
        display_order: c.displayOrder || idx + 1,
        is_enabled: c.isEnabled !== false,
      }));

      const { error: catError } = await supabaseAdmin
        .from('categories')
        .upsert(catPayload, { onConflict: 'id' });

      if (catError) {
        console.error('Supabase categories sync error:', catError);
        return NextResponse.json(
          { success: false, error: `Failed to sync categories to Supabase: ${catError.message}` },
          { status: 500 }
        );
      }
    }

    // 4. Sync Menu Items
    if (items && items.length > 0) {
      if (mode === 'replace') {
        const { data: existingRows, error: fetchErr } = await supabaseAdmin
          .from('menu_items')
          .select('id');

        if (fetchErr) {
          console.error('Supabase fetch existing items error:', fetchErr);
        } else if (existingRows && existingRows.length > 0) {
          const newIds = new Set(items.map((i: any) => i.id));
          const idsToDelete = existingRows.map((r) => r.id).filter((id) => !newIds.has(id));

          if (idsToDelete.length > 0) {
            const { error: batchDelErr } = await supabaseAdmin
              .from('menu_items')
              .delete()
              .in('id', idsToDelete);

            if (batchDelErr) {
              console.error('Supabase batch delete stale items error:', batchDelErr);
              return NextResponse.json(
                { success: false, error: `Failed to remove deleted items: ${batchDelErr.message}` },
                { status: 500 }
              );
            }
          }
        }
      }

      const batchSize = 25;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const itemPayload = batch.map((item: any, idx: number) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: Number(item.price),
          category_id: item.categoryId || null,
          category_name: item.categoryName || '',
          image: item.image || item.imageUrl || '',
          is_veg: item.isVeg !== false,
          preparation_time: item.preparationTime || '10 mins',
          is_available: item.isAvailable !== false,
          is_popular: Boolean(item.isPopular),
          is_chef_special: Boolean(item.isChefSpecial),
          is_today_special: Boolean(item.isTodaySpecial),
          ingredients: item.ingredients || [],
          chef_recommendation: item.chefRecommendation || '',
          display_order: item.displayOrder || i + idx + 1,
        }));

        const { error: itemError } = await supabaseAdmin
          .from('menu_items')
          .upsert(itemPayload, { onConflict: 'id' });

        if (itemError) {
          console.error(`Supabase menu items batch ${i / batchSize + 1} sync error:`, itemError);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to sync menu items batch ${i + 1}-${Math.min(i + batchSize, items.length)}: ${itemError.message}`,
            },
            { status: 500 }
          );
        }
      }
    } else if (items && items.length === 0 && mode === 'replace') {
      // Clear all items if explicitly requested in replace mode
      const { error: clearErr } = await supabaseAdmin
        .from('menu_items')
        .delete()
        .neq('id', '___none___');

      if (clearErr) {
        console.error('Supabase clear items error:', clearErr);
        return NextResponse.json(
          { success: false, error: `Failed to clear menu items: ${clearErr.message}` },
          { status: 500 }
        );
      }
    }

    // 5. Sync Restaurant Info
    if (restaurantInfo) {
      const infoPayload = {
        id: 1,
        name: restaurantInfo.name || 'Namahaa Tiffin Room',
        tagline: restaurantInfo.tagline || '',
        description: restaurantInfo.description || '',
        logo_url: restaurantInfo.logoUrl || '',
        banner_url: restaurantInfo.bannerUrl || '',
        phone: restaurantInfo.phone || '',
        email: restaurantInfo.email || '',
        address: restaurantInfo.address || '',
        google_maps_url: restaurantInfo.googleMapsUrl || '',
        instagram_url: restaurantInfo.instagramUrl || '',
        facebook_url: restaurantInfo.facebookUrl || '',
        opening_hours: restaurantInfo.openingHours || null,
        hero_title: restaurantInfo.heroTitle || '',
        hero_subtitle: restaurantInfo.heroSubtitle || '',
        announcement_text: restaurantInfo.announcementText || '',
        is_restaurant_open: restaurantInfo.isRestaurantOpen ?? true,
        copyright_text: restaurantInfo.copyrightText || '',
        updated_at: new Date().toISOString(),
      };

      const { error: infoError } = await supabaseAdmin
        .from('restaurant_info')
        .upsert(infoPayload, { onConflict: 'id' });

      if (infoError) {
        console.error('Supabase restaurant_info sync error:', infoError);
        return NextResponse.json(
          { success: false, error: `Failed to sync restaurant info to Supabase: ${infoError.message}` },
          { status: 500 }
        );
      }
    }

    // 6. Sync Gallery
    if (gallery && gallery.length > 0) {
      const galPayload = gallery.map((g: any) => ({
        id: g.id,
        url: g.url,
        title: g.title,
        category: g.category,
        is_enabled: g.isEnabled !== false,
      }));

      const { error: galError } = await supabaseAdmin
        .from('gallery')
        .upsert(galPayload, { onConflict: 'id' });

      if (galError) {
        console.error('Supabase gallery sync error:', galError);
        return NextResponse.json(
          { success: false, error: `Failed to sync gallery to Supabase: ${galError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data successfully synchronized with Supabase database',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Admin sync-menu unhandled exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error during Supabase sync' },
      { status: 500 }
    );
  }
}
