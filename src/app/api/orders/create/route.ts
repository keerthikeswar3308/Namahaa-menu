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

    // 1. Server-side Idempotency Key
    const effectiveIdempotencyKey =
      idempotencyKey || `idem-${sessionId || 'nosess'}-${tableNumber}-${Date.now().toString().slice(0, -3)}`;

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

    // 3. Fast Single-Trip Insert into Supabase (#ORD-XXXX)
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

    let { error } = await supabaseAdmin
      .from('orders')
      .insert([newOrderPayload]);

    // Handle Idempotency Duplicate Key (error 23505) without extra upfront SELECT query
    if (error && (error.code === '23505' || error.message.includes('idempotency_key'))) {
      const { data: existingIdem } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('idempotency_key', effectiveIdempotencyKey)
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

    if (error) {
      console.error('API /api/orders/create DB insert error:', error.message);
      return NextResponse.json(
        { success: false, error: `Failed to create order in database: ${error.message}` },
        { status: 500 }
      );
    }

    // 4. Fire-and-forget asynchronous snapshot into order_items
    try {
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

      Promise.resolve(supabaseAdmin.from('order_items').insert(itemSnapshotsPayload))
        .then(() => {})
        .catch((e: any) => console.warn('Non-blocking order_items warning:', e?.message));
    } catch {}

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

