import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from '@/lib/businessDay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const requestedTable = searchParams.get('tableNumber');
    const isGeneralMode = searchParams.get('qr') === '13' || requestedTable === '0' || requestedTable === '13';

    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO, endISO } = getBusinessDateBoundsISO(currentBusinessDate);

    if (isGeneralMode) {
      return NextResponse.json({
        success: true,
        currentBusinessDate,
        isGeneralMode: true,
        isValidSameDaySession: false,
        tableNumber: null,
        activeOrders: [],
      });
    }

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        currentBusinessDate,
        isValidSameDaySession: false,
        tableNumber: requestedTable ? Number(requestedTable) : null,
        activeOrders: [],
      });
    }

    // Query DB for orders belonging to this sessionId placed in today's business day
    const { data: todayOrders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Session verify DB query error:', error);
    }

    const ordersList = todayOrders || [];
    
    // Find active or most recent same-day order for this session
    const activeOrder = ordersList.find(
      (o: any) => o.order_status !== 'completed' && o.order_status !== 'cancelled' && o.order_status !== 'merged'
    );
    const mostRecentTodayOrder = ordersList[0];

    // Determine authoritative table number for today
    let tableNumber: number | null = null;
    if (activeOrder) {
      tableNumber = Number(activeOrder.table_number);
    } else if (mostRecentTodayOrder) {
      tableNumber = Number(mostRecentTodayOrder.table_number);
    } else if (requestedTable) {
      tableNumber = Number(requestedTable);
    }

    const mappedOrders = ordersList.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number || o.orderNumber,
      tableNumber: Number(o.table_number || o.tableNumber),
      items: o.items || [],
      subtotalAmount: Number(o.subtotal_amount || o.total_amount),
      discountAmount: Number(o.discount_amount || 0),
      totalAmount: Number(o.total_amount || o.totalAmount),
      paymentMethod: o.payment_method || 'cash_counter',
      paymentStatus: o.payment_status || 'pending',
      orderStatus: o.order_status || 'pending',
      customerName: o.customer_name || '',
      customerPhone: o.customer_phone || '',
      notes: o.notes || '',
      sessionId: o.session_id || '',
      createdAt: o.created_at,
    }));

    return NextResponse.json(
      {
        success: true,
        currentBusinessDate,
        isValidSameDaySession: ordersList.length > 0 || Boolean(tableNumber),
        tableNumber,
        activeOrders: mappedOrders.filter(
          (o) => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'merged'
        ),
        todayOrdersCount: ordersList.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/session/verify error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
