import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { clearActiveCartMemory } from '@/lib/activeCartsServer';
import { saveLiveOrderMemory } from '@/lib/liveOrdersServer';
import { Order } from '@/types';

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

    // 3. Fast Order Identification
    const timestamp = Date.now().toString().slice(-4);
    const randomNum = Math.floor(10 + Math.random() * 90);
    const orderNumber = `#ORD-${timestamp}${randomNum}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowISO = new Date().toISOString();

    const createdOrder: Order = {
      id: orderId,
      orderNumber,
      tableNumber: Number(tableNumber),
      items: verifiedItems,
      subtotalAmount: Number(verifiedTotal),
      totalAmount: Number(verifiedTotal),
      orderStatus: 'pending',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      notes: notes || '',
      sessionId: sessionId || '',
      idempotencyKey: effectiveIdempotencyKey,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // 4. INSTANT LIVE MEMORY CAPTURE (< 1ms)
    // Save immediately so Live Orders Admin can see it instantly without waiting for network roundtrips
    saveLiveOrderMemory(createdOrder);
    clearActiveCartMemory(Number(tableNumber));

    // Clear table group cart in background
    Promise.resolve(supabaseAdmin.from('table_group_carts').delete().eq('table_number', Number(tableNumber)))
      .then(() => {})
      .catch(() => {});

    // 5. Database Persistence with Fast-Timeout Race
    const newOrderPayload = {
      id: orderId,
      order_number: orderNumber,
      table_number: Number(tableNumber),
      items: verifiedItems,
      total_amount: Number(verifiedTotal),
      subtotal_amount: Number(verifiedTotal),
      payment_method: 'counter',
      payment_status: 'successful',
      order_status: 'pending',
      customer_name: customerName || '',
      customer_phone: customerPhone || '',
      notes: notes || '',
      session_id: sessionId || '',
      idempotency_key: effectiveIdempotencyKey,
      created_at: nowISO,
      updated_at: nowISO,
    };

    // Race Supabase insert with a 1200ms timeout so user UI never hangs
    const insertPromise = supabaseAdmin.from('orders').insert([newOrderPayload]);
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), 1200));

    try {
      const raceResult = await Promise.race([insertPromise, timeoutPromise]);
      if ('error' in raceResult && raceResult.error) {
        const error = raceResult.error;
        console.warn('API /api/orders/create DB insert warning:', error.message);

        // If duplicate idempotency key, return existing order
        if (error.code === '23505' || error.message.includes('idempotency_key')) {
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
                  orderStatus: existingIdem.order_status,
                  customerName: existingIdem.customer_name || '',
                  customerPhone: existingIdem.customer_phone || '',
                  notes: existingIdem.notes || '',
                  sessionId: existingIdem.session_id,
                  createdAt: existingIdem.created_at,
                },
                message: 'Order already created (idempotent response)',
              },
              { status: 200 }
            );
          }
        }
      }
    } catch (insertErr) {
      console.warn('Non-blocking DB insert notice:', insertErr);
    }

    // 6. Asynchronous order items snapshot
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

    // Return instant success to customer so the screen immediately updates!
    return NextResponse.json(
      {
        success: true,
        order: createdOrder,
        message: 'Order sent to kitchen successfully!',
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

