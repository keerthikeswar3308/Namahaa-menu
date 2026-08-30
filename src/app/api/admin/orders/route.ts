import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyAdminRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin request' },
        { status: 401 }
      );
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('API /api/admin/orders GET warning:', error.message);
      return NextResponse.json({ success: true, orders: [] });
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (err: any) {
    console.error('API /api/admin/orders GET error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin request' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, orderStatus } = body;

    if (!orderId || !orderStatus) {
      return NextResponse.json(
        { success: false, error: 'Order ID and orderStatus are required.' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      order_status: orderStatus,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    // Fallback if admin_paid_by or admin_paid_at columns are missing in remote DB schema
    if (error && (error.message.includes('admin_paid_by') || error.message.includes('admin_paid_at'))) {
      console.warn('Supabase orders missing admin_paid_by/at columns, removing from update:', error.message);
      const { admin_paid_by, admin_paid_at, ...cleanUpdates } = updates;
      const fallbackRes = await supabaseAdmin.from('orders').update(cleanUpdates).eq('id', orderId);
      error = fallbackRes.error;
    }

    if (error) {
      console.warn('API /api/admin/orders PATCH DB warning:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
    });
  } catch (err: any) {
    console.error('API /api/admin/orders PATCH error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

