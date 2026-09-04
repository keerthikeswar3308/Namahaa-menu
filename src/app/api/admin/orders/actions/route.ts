import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyAdminRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin request' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, orderId } = body;

    if (!action || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Action type and Order ID are required.' },
        { status: 400 }
      );
    }

    // Fetch Target Order from DB
    const { data: targetOrder, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !targetOrder) {
      return NextResponse.json(
        { success: false, error: 'Target order not found.' },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------
    // ACTION 1: APPLY DISCOUNT (Percentage %, Fixed ₹, Round Figure)
    // -------------------------------------------------------------
    if (action === 'apply_discount') {
      const { discountType, discountValue } = body;

      if (!discountType || discountValue === undefined || discountValue === null) {
        return NextResponse.json(
          { success: false, error: 'Discount type and value are required.' },
          { status: 400 }
        );
      }

      const items = Array.isArray(targetOrder.items) ? targetOrder.items : [];
      const subtotal = items.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
      let calculatedDiscount = 0;
      const val = Number(discountValue);

      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { success: false, error: 'Discount value cannot be negative or invalid.' },
          { status: 400 }
        );
      }

      if (discountType === 'percentage') {
        if (val > 100) {
          return NextResponse.json(
            { success: false, error: 'Percentage discount cannot exceed 100%.' },
            { status: 400 }
          );
        }
        calculatedDiscount = Math.round((subtotal * (val / 100)) * 100) / 100;
      } else if (discountType === 'fixed') {
        if (val > subtotal) {
          return NextResponse.json(
            { success: false, error: 'Fixed discount cannot exceed order subtotal amount.' },
            { status: 400 }
          );
        }
        calculatedDiscount = Math.round(val * 100) / 100;
      } else if (discountType === 'round_off') {
        // Target final amount e.g. 147 -> 145 or 150
        const targetFinal = Math.max(0, val);
        calculatedDiscount = Math.round((subtotal - targetFinal) * 100) / 100;
      } else if (discountType === 'none') {
        calculatedDiscount = 0;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid discount type specified.' },
          { status: 400 }
        );
      }

      const finalAmount = Math.max(0, Math.round((subtotal - calculatedDiscount) * 100) / 100);

      const updatePayload = {
        subtotal_amount: subtotal,
        discount_type: discountType,
        discount_value: val,
        discount_amount: calculatedDiscount,
        total_amount: finalAmount,
        updated_at: new Date().toISOString(),
      };

      let { data: updatedDbOrder, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      // Fallback if discount_amount or subtotal_amount columns pre-exist or are missing in remote DB
      if (updateErr && (updateErr.message.includes('column') || updateErr.message.includes('schema cache'))) {
        console.warn('Supabase orders table missing extra discount columns, falling back to base payload:', updateErr.message);
        const fallbackRes = await supabaseAdmin
          .from('orders')
          .update({
            total_amount: finalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select()
          .single();

        updatedDbOrder = fallbackRes.data;
        updateErr = fallbackRes.error;
      }

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedDbOrder || {
          ...targetOrder,
          subtotal_amount: subtotal,
          discount_type: discountType,
          discount_value: val,
          discount_amount: calculatedDiscount,
          total_amount: finalAmount,
        },
        message: 'Discount applied successfully',
      });
    }

    // -------------------------------------------------------------
    // ACTION 2: MERGE ORDERS (Combine 2 or More Open Orders into Primary)
    // -------------------------------------------------------------
    if (action === 'merge_orders') {
      const { secondaryOrderId, secondaryOrderIds } = body;
      const targetSecondaryIds: string[] = Array.isArray(secondaryOrderIds) && secondaryOrderIds.length > 0
        ? secondaryOrderIds
        : (secondaryOrderId ? [secondaryOrderId] : []);

      if (targetSecondaryIds.length === 0 || targetSecondaryIds.includes(orderId)) {
        return NextResponse.json(
          { success: false, error: 'At least one valid secondary order must be selected to merge.' },
          { status: 400 }
        );
      }

      // Validate primary status
      if (['completed', 'cancelled', 'merged'].includes(targetOrder.order_status)) {
        return NextResponse.json(
          { success: false, error: 'Primary order is closed or completed and cannot be merged.' },
          { status: 400 }
        );
      }

      // Fetch All Secondary Orders
      const { data: secondaryOrders, error: secErr } = await supabaseAdmin
        .from('orders')
        .select('*')
        .in('id', targetSecondaryIds);

      if (secErr || !secondaryOrders || secondaryOrders.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Selected secondary orders to merge were not found.' },
          { status: 404 }
        );
      }

      // Check if any secondary order is closed
      const closedOrder = secondaryOrders.find((o: any) => ['completed', 'cancelled', 'merged'].includes(o.order_status));
      if (closedOrder) {
        return NextResponse.json(
          { success: false, error: `Order #${closedOrder.order_number} is closed or completed and cannot be merged.` },
          { status: 400 }
        );
      }

      // Combine Items from Primary and ALL Secondary Orders
      const primaryItems = Array.isArray(targetOrder.items) ? targetOrder.items : [];
      let combinedItems = [...primaryItems];

      let notesList: string[] = targetOrder.notes ? [targetOrder.notes] : [];
      let newMergedOrderNumbers: string[] = [];

      for (const secOrder of secondaryOrders) {
        const secItems = Array.isArray(secOrder.items) ? secOrder.items : [];
        combinedItems = [...combinedItems, ...secItems];

        if (secOrder.notes) {
          notesList.push(`[Order #${secOrder.order_number}: ${secOrder.notes}]`);
        }
        newMergedOrderNumbers.push(secOrder.order_number);
      }

      const mergedSubtotal = combinedItems.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

      // Preserve discount if primary order had one
      let calculatedDiscount = Number(targetOrder.discount_amount || 0);
      if (targetOrder.discount_type === 'percentage') {
        calculatedDiscount = Math.round((mergedSubtotal * (Number(targetOrder.discount_value || 0) / 100)) * 100) / 100;
      }

      const mergedTotal = Math.max(0, Math.round((mergedSubtotal - calculatedDiscount) * 100) / 100);

      const existingMergedFrom = Array.isArray(targetOrder.merged_from_order_numbers)
        ? targetOrder.merged_from_order_numbers
        : [];
      
      const updatedMergedFrom = Array.from(new Set([...existingMergedFrom, ...newMergedOrderNumbers]));
      const combinedNotes = notesList.join(' | ');

      // Update Primary Order
      const primaryPayload = {
        items: combinedItems,
        subtotal_amount: mergedSubtotal,
        discount_amount: calculatedDiscount,
        total_amount: mergedTotal,
        notes: combinedNotes,
        merged_from_order_numbers: updatedMergedFrom,
        updated_at: new Date().toISOString(),
      };

      let { data: updatedPrimary, error: updatePrimErr } = await supabaseAdmin
        .from('orders')
        .update(primaryPayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updatePrimErr && (updatePrimErr.message.includes('column') || updatePrimErr.message.includes('schema cache'))) {
        console.warn('Supabase orders table missing extra merge columns, falling back to base payload:', updatePrimErr.message);
        const { subtotal_amount, discount_amount, merged_from_order_numbers, ...basePayload } = primaryPayload as any;
        const fallbackRes = await supabaseAdmin
          .from('orders')
          .update(basePayload)
          .eq('id', orderId)
          .select()
          .single();

        updatedPrimary = fallbackRes.data;
        updatePrimErr = fallbackRes.error;
      }

      if (updatePrimErr) {
        return NextResponse.json({ success: false, error: updatePrimErr.message }, { status: 500 });
      }

      // Update ALL Secondary Orders as MERGED (Closed, linked to primary)
      const secondaryPayload = {
        order_status: 'merged',
        merged_into_order_id: orderId,
        notes: `Merged into ${targetOrder.order_number}`,
        updated_at: new Date().toISOString(),
      };

      const { error: secUpdateErr } = await supabaseAdmin
        .from('orders')
        .update(secondaryPayload)
        .in('id', targetSecondaryIds);

      if (secUpdateErr && (secUpdateErr.message.includes('column') || secUpdateErr.message.includes('schema cache'))) {
        await supabaseAdmin
          .from('orders')
          .update({
            order_status: 'merged',
            notes: `Merged into ${targetOrder.order_number}`,
            updated_at: new Date().toISOString(),
          })
          .in('id', targetSecondaryIds);
      }

      return NextResponse.json({
        success: true,
        primaryOrder: updatedPrimary,
        message: `Merged ${newMergedOrderNumbers.join(', ')} into ${targetOrder.order_number} successfully.`,
      });
    }

    // -------------------------------------------------------------
    // ACTION 3: CHANGE TABLE
    // -------------------------------------------------------------
    if (action === 'change_table') {
      const { newTableNumber } = body;
      const num = Number(newTableNumber);

      if (!num || isNaN(num) || num <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid positive table number is required.' },
          { status: 400 }
        );
      }

      const { data: updatedDbOrder, error: tableErr } = await supabaseAdmin
        .from('orders')
        .update({
          table_number: num,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (tableErr) {
        return NextResponse.json({ success: false, error: tableErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedDbOrder,
        message: `Table changed to Table #${num}`,
      });
    }

    // -------------------------------------------------------------
    // ACTION 4: ADD ITEMS TO OPEN ORDER
    // -------------------------------------------------------------
    if (action === 'add_items') {
      const { newItems } = body;

      if (!Array.isArray(newItems) || newItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'New items array is required.' },
          { status: 400 }
        );
      }

      // Fetch menu items for authoritative prices
      const { data: dbMenuItems } = await supabaseAdmin.from('menu_items').select('id, name, price, is_veg');
      const menuMap = new Map((dbMenuItems || []).map((m) => [m.id, m]));

      const verifiedNewItems: any[] = [];
      let addedSubtotal = 0;

      for (const item of newItems) {
        const dbMatch = menuMap.get(item.id);
        const unitPrice = dbMatch ? Number(dbMatch.price) : Number(item.price || 0);
        const qty = Math.max(1, Number(item.quantity || 1));
        const lineTotal = unitPrice * qty;

        addedSubtotal += lineTotal;
        verifiedNewItems.push({
          id: item.id,
          name: dbMatch?.name || item.name,
          price: unitPrice,
          quantity: qty,
          image: item.image || '',
          isVeg: dbMatch ? dbMatch.is_veg !== false : item.isVeg !== false,
          notes: item.notes || '',
        });
      }

      const existingItems = Array.isArray(targetOrder.items) ? targetOrder.items : [];
      const updatedItems = [...existingItems, ...verifiedNewItems];

      const newSubtotal = updatedItems.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

      let calculatedDiscount = Number(targetOrder.discount_amount || 0);
      if (targetOrder.discount_type === 'percentage') {
        calculatedDiscount = Math.round((newSubtotal * (Number(targetOrder.discount_value || 0) / 100)) * 100) / 100;
      }

      const newTotal = Math.max(0, Math.round((newSubtotal - calculatedDiscount) * 100) / 100);

      const updatePayload = {
        items: updatedItems,
        subtotal_amount: newSubtotal,
        discount_amount: calculatedDiscount,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedDbOrder, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedDbOrder,
        message: 'Items added to order successfully',
      });
    }

    // -------------------------------------------------------------
    // ACTION 5: UPDATE NOTES
    // -------------------------------------------------------------
    if (action === 'update_notes') {
      const { notes } = body;

      const { data: updatedDbOrder, error: noteErr } = await supabaseAdmin
        .from('orders')
        .update({
          notes: notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (noteErr) {
        return NextResponse.json({ success: false, error: noteErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedDbOrder,
        message: 'Order notes updated',
      });
    }

    // -------------------------------------------------------------
    // ACTION 6: CANCEL ORDER
    // -------------------------------------------------------------
    if (action === 'cancel_order') {
      const { data: updatedDbOrder, error: cancelErr } = await supabaseAdmin
        .from('orders')
        .update({
          order_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (cancelErr) {
        return NextResponse.json({ success: false, error: cancelErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order: updatedDbOrder,
        message: 'Order cancelled successfully',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action type.' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/admin/orders/actions exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error processing order action' },
      { status: 500 }
    );
  }
}
