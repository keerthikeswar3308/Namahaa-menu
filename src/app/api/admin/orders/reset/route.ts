import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { setDynamicAdminCredentials, verifyAdminPasscode, verifyAdminRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required.' },
        { status: 401 }
      );
    }

    // Load custom credentials saved in Supabase restaurant_info
    try {
      const { data: dbInfo } = await supabaseAdmin
        .from('restaurant_info')
        .select('admin_username, admin_passcode')
        .limit(1)
        .single();
      if (dbInfo && dbInfo.admin_username && dbInfo.admin_passcode) {
        setDynamicAdminCredentials(dbInfo.admin_username, dbInfo.admin_passcode);
      }
    } catch (e) {
      // Fallback
    }

    const body = await request.json();
    const { passcode } = body as { passcode?: string };

    if (!passcode || typeof passcode !== 'string' || !passcode.trim()) {
      return NextResponse.json(
        { success: false, error: 'Admin password is required to reset database.' },
        { status: 400 }
      );
    }

    // Verify admin passcode
    if (!verifyAdminPasscode(passcode.trim())) {
      return NextResponse.json(
        { success: false, error: 'Incorrect admin password. Database reset denied.' },
        { status: 403 }
      );
    }

    // 1. Delete order_items
    const { error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (itemsErr) {
      console.error('Failed to clear order_items:', itemsErr);
    }

    // 2. Delete orders
    const { error: ordersErr } = await supabaseAdmin
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ordersErr) {
      console.error('Failed to clear orders:', ordersErr);
      return NextResponse.json(
        { success: false, error: `Failed to reset orders: ${ordersErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully! All customer and admin order records have been cleared.',
      resetTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Database reset endpoint error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error resetting database' },
      { status: 500 }
    );
  }
}
