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


    // 3. Server-side Active Order Boundary Check (SAME DEVICE + SAME TABLE + CURRENT BUSINESS DAY)
    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO, endISO } = getBusinessDateBoundsISO(currentBusinessDate);

    let existingActiveOrder: any = null;
    if (tableNumber && sessionId) {
      const { data: foundOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('table_number', Number(tableNumber))
        .eq('session_id', sessionId)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .in('order_status', ['pending', 'accepted', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (foundOrder) {
        existingActiveOrder = foundOrder;
      }
    }

    // IF AN ACTIVE ORDER FOR TODAY'S BUSINESS DAY EXISTS → APPEND ITEMS TO IT
    if (existingActiveOrder) {
      const existingItems = Array.isArray(existingActiveOrder.items) ? existingActiveOrder.items : [];
      const updatedItems = [...existingItems, ...verifiedItems];
      const updatedTotal = Number(existingActiveOrder.total_amount || 0) + verifiedTotal;
      const combinedNotes = notes
        ? existingActiveOrder.notes
          ? `${existingActiveOrder.notes} | ${notes}`
          : notes
        : existingActiveOrder.notes || '';

      const updatePayload = {
        items: updatedItems,
        total_amount: updatedTotal,
        notes: combinedNotes,
        order_status: 'pending', // Reset status to pending so kitchen & admin get chime & alert for newly added items
        updated_at: new Date().toISOString(),
      };

      let { data: updatedDbOrder, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', existingActiveOrder.id)
        .select()
        .single();

      if (updateErr) {
        console.warn('API /api/orders/create append update warning:', updateErr.message);
        // Fallback update
        const fallbackRes = await supabaseAdmin
          .from('orders')
          .update({
            items: updatedItems,
            total_amount: updatedTotal,
            notes: combinedNotes,
            order_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingActiveOrder.id)
          .select()
          .single();

        if (fallbackRes.data) {
          updatedDbOrder = fallbackRes.data;
          updateErr = null;
        }
      }

      if (updateErr) {
        console.error('API /api/orders/create DB append error:', updateErr.message);
        return NextResponse.json(
          { success: false, error: `Failed to update active order: ${updateErr.message}` },
          { status: 500 }
        );
      }

      // Insert new item snapshots for appended items into order_items
      const itemSnapshotsPayload = verifiedItems.map((item, idx) => ({
        id: `oi-${existingActiveOrder.id}-${existingItems.length + idx + 1}`,
        order_id: existingActiveOrder.id,
        menu_item_id: item.id,
        item_name_snapshot: item.name,
        unit_price_snapshot: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
        special_instructions: item.notes || notes || '',
      }));

      (async () => {
        try {
          await supabaseAdmin.from('order_items').insert(itemSnapshotsPayload);
        } catch (oiErr) {
          console.warn('Order items insert exception:', oiErr);
        }
      })();

      const finalOrderData = updatedDbOrder || {
        ...existingActiveOrder,
        items: updatedItems,
        total_amount: updatedTotal,
        notes: combinedNotes,
        order_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      return NextResponse.json(
        {
          success: true,
          order: {
            id: finalOrderData.id,
            orderNumber: finalOrderData.order_number,
            tableNumber: Number(finalOrderData.table_number),
            items: finalOrderData.items,
            totalAmount: Number(finalOrderData.total_amount),
            orderStatus: finalOrderData.order_status,
            customerName: finalOrderData.customer_name || '',
            customerPhone: finalOrderData.customer_phone || '',
            notes: finalOrderData.notes || '',
            sessionId: finalOrderData.session_id,
            idempotencyKey: finalOrderData.idempotency_key,
            createdAt: finalOrderData.created_at,
            updatedAt: finalOrderData.updated_at,
          },
          message: `Added new items to active order ${finalOrderData.order_number}`,
        },
        { status: 200 }
      );
    }

    // 4. NO ACTIVE ORDER FOR TODAY'S BUSINESS DAY EXISTS → CREATE NEW ORDER (#ORD-XXXX)

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
      totalAmount: Number(verifiedTotal),
      orderStatus: 'pending',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      notes: notes || '',
      sessionId: newOrderPayload.session_id,
      idempotencyKey: effectiveIdempotencyKey,
      createdAt: newOrderPayload.created_at,
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

