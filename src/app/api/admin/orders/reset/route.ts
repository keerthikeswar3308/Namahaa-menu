import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { setDynamicAdminCredentials, verifyAdminPasscode, verifyAdminRequest } from '@/lib/authServer';
import { clearLiveOrdersMemory } from '@/lib/liveOrdersServer';
import { clearAllActiveCartsMemory } from '@/lib/activeCartsServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 1. Load custom credentials saved in Supabase restaurant_info first
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
      // Fallback to default credentials
    }

    // 2. Parse request body
    let passcode = '';
    try {
      const body = await request.json();
      if (body && typeof body.passcode === 'string') {
        passcode = body.passcode.trim();
      }
    } catch {}

    // Check header passcode as well if body empty
    if (!passcode) {
      passcode = (request.headers.get('x-admin-passcode') || '').trim();
    }

    // 3. Verify admin authorization: either valid admin session or valid admin passcode
    const isPasscodeValid = passcode ? verifyAdminPasscode(passcode) : false;
    const isRequestAuthorized = verifyAdminRequest(request);

    if (!isPasscodeValid && !isRequestAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required.' },
        { status: 401 }
      );
    }

    if (!isPasscodeValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect admin password. Database reset denied.' },
        { status: 403 }
      );
    }

    // 4. Clear in-memory live orders and carts immediately
    clearLiveOrdersMemory();
    clearAllActiveCartsMemory();

    // 5. Delete order_items from Supabase
    const { error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (itemsErr) {
      console.error('Failed to clear order_items:', itemsErr);
    }

    // 6. Delete orders from Supabase
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

    // 7. Delete active draft table carts
    try {
      await supabaseAdmin.from('table_group_carts').delete().neq('table_number', 0);
    } catch {}

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
