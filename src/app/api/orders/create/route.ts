import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from '@/lib/businessDay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tableNumber,
      items,
      totalAmount,
      customerName,
      customerPhone,
      notes,
      sessionId,
      idempotencyKey,
    } = body;

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order details. Table number and items are required.' },
        { status: 400 }
      );
    }

    // 1. Server-side Idempotency & Duplicate Order Protection
    const effectiveIdempotencyKey =
      idempotencyKey || `idem-${sessionId || 'nosess'}-${tableNumber}-${Date.now().toString().slice(0, -3)}`;

    if (idempotencyKey) {
      const { data: existingIdem } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingIdem) {
        return NextResponse.json(
          {
            success: true,
            order: {
              id: existingIdem.id,
              orderNumber: existingIdem.order_number,
              tableNumber: Number(existingIdem.table_number),
              items: existingIdem.items,
              totalAmount: Number(existingIdem.total_amount),
              paymentMethod: existingIdem.payment_method,
              paymentStatus: existingIdem.payment_status,
              orderStatus: existingIdem.order_status,
              customerName: existingIdem.customer_name || '',
              customerPhone: existingIdem.customer_phone || '',
              notes: existingIdem.notes || '',
              sessionId: existingIdem.session_id,
              paymentReference: existingIdem.payment_reference,
              idempotencyKey: existingIdem.idempotency_key,
              createdAt: existingIdem.created_at,
            },
            message: 'Order already created (idempotent response)',
          },
          { status: 200 }
        );
      }
    }

    // 2. Fast-Path Item Verification & Snapshots
    let verifiedTotal = 0;
    const verifiedItems = items.map((rawItem: any) => {
      const unitPrice = Number(rawItem.price || 0);
      const qty = Math.max(1, Number(rawItem.quantity || 1));
      const lineTotal = unitPrice * qty;
      verifiedTotal += lineTotal;

      return {
        id: rawItem.id,
        name: rawItem.name || 'Food Item',
        price: unitPrice,
        quantity: qty,
        image: rawItem.image || '',
        isVeg: rawItem.isVeg !== false,
        notes: rawItem.notes || '',
      };
    });


    // 3. CREATE PERSISTENT COMPLETE ORDER IN SUPABASE (#ORD-XXXX)
    const timestamp = Date.now().toString().slice(-4);
    const randomNum = Math.floor(10 + Math.random() * 90);
    const orderNumber = `#ORD-${timestamp}${randomNum}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newOrderPayload = {
      id: orderId,
      order_number: orderNumber,
      table_number: Number(tableNumber),
      items: verifiedItems,
      total_amount: Number(verifiedTotal),
      payment_method: 'counter',
      payment_status: 'successful',
      order_status: 'pending',
      customer_name: customerName || '',
      customer_phone: customerPhone || '',
      notes: notes || '',
      session_id: sessionId || '',
      idempotency_key: effectiveIdempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt insert into Supabase orders table
    let { data, error } = await supabaseAdmin
      .from('orders')
      .insert([newOrderPayload])
      .select()
      .single();

    // Fallback if session_id, payment_reference or idempotency_key columns are missing in remote DB
    if (error && (error.message.includes('session_id') || error.message.includes('payment_reference') || error.message.includes('idempotency_key'))) {
      console.warn('Supabase orders table missing extra columns, falling back to base payload:', error.message);
      const { session_id, payment_reference, idempotency_key, admin_paid_by, admin_paid_at, ...basePayload } = newOrderPayload as any;
      const fallbackRes = await supabaseAdmin.from('orders').insert([basePayload]).select().single();
      error = fallbackRes.error;
      data = fallbackRes.data;
    }

    if (error) {
      console.error('API /api/orders/create DB insert error:', error.message);
      return NextResponse.json(
        { success: false, error: `Failed to create order in database: ${error.message}` },
        { status: 500 }
      );
    }

    const itemSnapshotsPayload = verifiedItems.map((item, idx) => ({
      id: `oi-${orderId}-${idx + 1}`,
      order_id: orderId,
      menu_item_id: item.id,
      item_name_snapshot: item.name,
      unit_price_snapshot: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
      special_instructions: item.notes || notes || '',
    }));

    // 4. Non-blocking asynchronous insertion of item snapshots into order_items relational table
    (async () => {
      try {
        const { error: oiErr } = await supabaseAdmin.from('order_items').insert(itemSnapshotsPayload);
        if (oiErr) console.warn('Non-blocking order_items insert warning:', oiErr.message);
      } catch (oiErr) {
        console.warn('Non-blocking order_items insert exception:', oiErr);
      }
    })();

    const createdOrder = {
      id: orderId,
      orderNumber,
      tableNumber: Number(tableNumber),
      items: verifiedItems,
      subtotalAmount: Number(verifiedTotal),
      totalAmount: Number(verifiedTotal),
      paymentMethod: 'counter',
      paymentStatus: 'successful',
      orderStatus: 'pending',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      notes: notes || '',
      sessionId: newOrderPayload.session_id,
      idempotencyKey: effectiveIdempotencyKey,
      createdAt: newOrderPayload.created_at,
      updatedAt: newOrderPayload.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        order: createdOrder,
        message: 'Order created successfully!',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('API /api/orders/create error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error while creating order' },
      { status: 500 }
    );
  }
}

