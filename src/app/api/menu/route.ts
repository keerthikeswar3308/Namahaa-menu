import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch Categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (catError) {
      console.error('API /api/menu categories fetch error:', catError);
    }

    // 2. Fetch Menu Items
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (menuError) {
      console.error('API /api/menu items fetch error:', menuError);
    }

    // 3. Fetch Restaurant Info
    const { data: restaurantInfo } = await supabaseAdmin
      .from('restaurant_info')
      .select('*')
      .limit(1)
      .single();

    // 4. Fetch Gallery
    const { data: gallery } = await supabaseAdmin
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      categories: categories || [],
      items: menuItems || [],
      restaurantInfo: restaurantInfo || null,
      gallery: gallery || [],
    });
  } catch (err: any) {
    console.error('API /api/menu exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching menu' },
      { status: 500 }
    );
  }
}
