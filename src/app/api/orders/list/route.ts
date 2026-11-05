import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from '@/lib/businessDay';
import { getLiveOrdersMemory } from '@/lib/liveOrdersServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const tableNumber = searchParams.get('tableNumber');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO, endISO } = getBusinessDateBoundsISO(currentBusinessDate);

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    if (tableNumber) {
      query = query.eq('table_number', Number(tableNumber));
    }

    const { data: dbOrders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('API /api/orders/list query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const mapped = (dbOrders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number || o.orderNumber,
      tableNumber: Number(o.table_number || o.tableNumber),
      items: o.items || [],
      subtotalAmount: Number(o.subtotal_amount || o.subtotalAmount || o.total_amount || 0),
      discountAmount: Number(o.discount_amount || 0),
      totalAmount: Number(o.total_amount || o.totalAmount),
      paymentMethod: o.payment_method || 'counter',
      paymentStatus: o.payment_status || 'successful',
      orderStatus: o.order_status || 'pending',
      customerName: o.customer_name || '',
      customerPhone: o.customer_phone || '',
      notes: o.notes || '',
      sessionId: o.session_id || '',
      paymentReference: o.payment_reference || '',
      idempotencyKey: o.idempotency_key || '',
      adminPaidBy: o.admin_paid_by || '',
      adminPaidAt: o.admin_paid_at || '',
      createdAt: o.created_at || new Date().toISOString(),
      updatedAt: o.updated_at || new Date().toISOString(),
    }));

    // Merge recent orders from server memory for this session
    const memoryOrders = getLiveOrdersMemory().filter((o) => o.sessionId === sessionId);
    const orderMap = new Map<string, any>();
    for (const ord of mapped) {
      orderMap.set(ord.id, ord);
    }
    for (const mem of memoryOrders) {
      if (!orderMap.has(mem.id)) {
        orderMap.set(mem.id, mem);
      }
    }

    const mergedList = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(
      {
        success: true,
        orders: mergedList,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/orders/list error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
