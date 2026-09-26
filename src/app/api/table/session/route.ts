import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from '@/lib/businessDay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/table/session?tableNumber=X&sessionId=Y
 * Returns table status (idle vs occupied), whether sessionId is joined,
 * active orders, and shared group cart items.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get('tableNumber');
    const sessionId = searchParams.get('sessionId') || '';
    const isGeneralParam = searchParams.get('qr') === '13' || searchParams.get('tableNumber') === '0';

    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO, endISO } = getBusinessDateBoundsISO(currentBusinessDate);

    // QR #13 (General / Takeaway / Admin Preview) Mode
    if (isGeneralParam || !tableParam || Number(tableParam) === 0 || Number(tableParam) === 13) {
      return NextResponse.json({
        success: true,
        isGeneralMode: true,
        isTableOccupied: false,
        tableNumber: null,
        activeOrders: [],
        groupCart: [],
      });
    }

    const tableNumber = Number(tableParam);
    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid table number. Must be between 1 and 12.' },
        { status: 400 }
      );
    }

    // Query active (uncompleted/uncancelled) orders for this table today
    const { data: tableOrders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('table_number', tableNumber)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.warn('Table session orders query error:', ordersErr);
    }

    const ordersList = tableOrders || [];
    const activeOrders = ordersList.filter(
      (o: any) => o.order_status !== 'completed' && o.order_status !== 'cancelled' && o.order_status !== 'merged'
    );

    // A table is occupied if there are active orders today
    const hasActiveOrders = activeOrders.length > 0;
    
    // Check if current sessionId created or joined any order/cart at this table today
    const sessionBelongsToCurrentDevice = ordersList.some((o: any) => o.session_id === sessionId);

    // Fetch shared group cart items for this table if any
    let groupCart: any[] = [];
    try {
      const { data: cartData } = await supabaseAdmin
        .from('table_group_carts')
        .select('*')
        .eq('table_number', tableNumber)
        .gte('updated_at', startISO)
        .maybeSingle();

      if (cartData && cartData.items) {
        groupCart = cartData.items;
      }
    } catch (err) {
      // Table group carts table may not exist yet or fallback
    }

    const isTableOccupied = hasActiveOrders || groupCart.length > 0;

    return NextResponse.json(
      {
        success: true,
        isGeneralMode: false,
        tableNumber,
        isTableOccupied,
        hasActiveOrders,
        sessionBelongsToCurrentDevice,
        activeOrdersCount: activeOrders.length,
        groupCart,
        currentBusinessDate,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/table/session GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/table/session
 * Syncs shared table group cart items for Table #X
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableNumber, items, sessionId } = body;

    const num = Number(tableNumber);
    if (isNaN(num) || num < 1 || num > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid table number' },
        { status: 400 }
      );
    }

    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO } = getBusinessDateBoundsISO(currentBusinessDate);

    // Try storing/upserting shared table cart in Supabase
    try {
      await supabaseAdmin.from('table_group_carts').upsert(
        {
          table_number: num,
          items: items || [],
          updated_at: new Date().toISOString(),
          last_session_id: sessionId || '',
        },
        { onConflict: 'table_number' }
      );
    } catch (err) {
      console.warn('Upsert table_group_carts notice:', err);
    }

    return NextResponse.json({
      success: true,
      tableNumber: num,
      itemsCount: (items || []).length,
    });
  } catch (err: any) {
    console.error('API /api/table/session POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/table/session?tableNumber=X
 * Clears table group session when order is completed by Admin
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get('tableNumber');
    const num = Number(tableParam);

    if (num && num >= 1 && num <= 12) {
      try {
        await supabaseAdmin
          .from('table_group_carts')
          .delete()
          .eq('table_number', num);
      } catch (err) {
        console.warn('Delete table_group_carts error:', err);
      }
    }

    return NextResponse.json({ success: true, tableNumber: num });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
