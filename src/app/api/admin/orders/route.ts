import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyAdminRequest } from '@/lib/authServer';
import { getBusinessDateBoundsISO } from '@/lib/businessDay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Get IST Date String (YYYY-MM-DD) for a given Date
function getISTDateString(d: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset + (d.getTimezoneOffset() * 60 * 1000));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get ISO range for an IST YYYY-MM-DD date string
function getISTDateBounds(dateStr: string) {
  const startISO = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const endISO = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  return { startISO, endISO };
}

// Helper: Format date for display e.g. "30 AUG 2026"
function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${day} ${months[monthIdx] || ''} ${year}`;
  } catch {
    return dateStr;
  }
}

// Helper to map DB row to Order object
function mapDbOrder(o: any) {
  const items = Array.isArray(o.items) ? o.items : [];
  const rawSubtotal = Number(o.subtotal_amount || 0);
  const calculatedSubtotal = items.reduce((s: number, item: any) => s + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const subtotalAmount = rawSubtotal > 0 ? rawSubtotal : calculatedSubtotal;

  return {
    id: o.id,
    orderNumber: o.order_number || o.orderNumber || `#ORD-${o.id.slice(-6)}`,
    tableNumber: Number(o.table_number || o.tableNumber || 1),
    items,
    subtotalAmount,
    discountType: o.discount_type || 'none',
    discountValue: Number(o.discount_value || 0),
    discountAmount: Number(o.discount_amount || 0),
    totalAmount: Number(o.total_amount || o.totalAmount || subtotalAmount),
    orderStatus: o.order_status || 'pending',
    customerName: o.customer_name || '',
    customerPhone: o.customer_phone || '',
    notes: o.notes || '',
    sessionId: o.session_id || '',
    idempotencyKey: o.idempotency_key || '',
    mergedIntoOrderId: o.merged_into_order_id || undefined,
    mergedFromOrderNumbers: Array.isArray(o.merged_from_order_numbers) ? o.merged_from_order_numbers : undefined,
    createdAt: o.created_at || new Date().toISOString(),
    updatedAt: o.updated_at || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin request' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'live';
    const targetDate = searchParams.get('date') || getISTDateString();
    const range = searchParams.get('range') || 'last_7_days';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // -------------------------------------------------------------
    // MODE 1: LIVE ORDERS (Date Specific, Defaults to TODAY IST)
    // -------------------------------------------------------------
    if (mode === 'live' || mode === 'daily_details') {
      const { startISO, endISO } = getBusinessDateBoundsISO(targetDate);
      
      const { data: dbOrders, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`API /api/admin/orders GET (${mode}) DB error:`, error.message);
        return NextResponse.json({ success: true, orders: [], date: targetDate, formattedDate: formatDisplayDate(targetDate) });
      }

      const orders = (dbOrders || []).map(mapDbOrder);

      // Today Summary Stats
      let itemCount = 0;
      let totalOrderValue = 0;
      let activeCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;

      const nonMergedOrders = orders.filter((o) => o.orderStatus !== 'merged');

      nonMergedOrders.forEach((o) => {
        if (o.orderStatus !== 'cancelled') {
          totalOrderValue += o.totalAmount;
          itemCount += o.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);
        }
        if (o.orderStatus === 'completed') completedCount++;
        else if (o.orderStatus === 'cancelled') cancelledCount++;
        else activeCount++;
      });

      return NextResponse.json({
        success: true,
        date: targetDate,
        formattedDate: formatDisplayDate(targetDate),
        summary: {
          date: targetDate,
          formattedDate: formatDisplayDate(targetDate),
          orderCount: nonMergedOrders.length,
          itemCount,
          totalOrderValue,
          averageOrderValue: nonMergedOrders.length > 0 ? totalOrderValue / nonMergedOrders.length : 0,
          activeCount,
          completedCount,
          cancelledCount,
        },
        orders,
      });
    }


    // -------------------------------------------------------------
    // MODE 2: HISTORY LIST (Compact Past Days Aggregate Summary)
    // -------------------------------------------------------------
    if (mode === 'history_list') {
      const endDateStr = getISTDateString();
      const past90Date = new Date();
      past90Date.setDate(past90Date.getDate() - 90);
      const { startISO } = getISTDateBounds(getISTDateString(past90Date));
      const { endISO } = getISTDateBounds(endDateStr);

      const { data: dbOrders, error } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount, order_status, created_at, items')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('API /api/admin/orders history_list DB warning:', error.message);
        return NextResponse.json({ success: true, historyList: [] });
      }

      // Group by IST Date String
      const dateGroupMap = new Map<string, {
        date: string;
        formattedDate: string;
        orderCount: number;
        itemCount: number;
        totalOrderValue: number;
        activeCount: number;
        completedCount: number;
        cancelledCount: number;
      }>();

      (dbOrders || []).forEach((row: any) => {
        const status = row.order_status || 'pending';
        if (status === 'merged') return; // Exclude merged secondary orders from history summaries

        const istDateStr = getISTDateString(new Date(row.created_at));
        if (!dateGroupMap.has(istDateStr)) {
          dateGroupMap.set(istDateStr, {
            date: istDateStr,
            formattedDate: formatDisplayDate(istDateStr),
            orderCount: 0,
            itemCount: 0,
            totalOrderValue: 0,
            activeCount: 0,
            completedCount: 0,
            cancelledCount: 0,
          });
        }

        const group = dateGroupMap.get(istDateStr)!;
        group.orderCount++;
        const total = Number(row.total_amount) || 0;

        if (status !== 'cancelled') {
          group.totalOrderValue += total;
          const itemsArr = Array.isArray(row.items) ? row.items : [];
          group.itemCount += itemsArr.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);
        }

        if (status === 'completed') group.completedCount++;
        else if (status === 'cancelled') group.cancelledCount++;
        else group.activeCount++;
      });


      const historyList = Array.from(dateGroupMap.values()).map((g) => ({
        ...g,
        averageOrderValue: g.orderCount > 0 ? g.totalOrderValue / g.orderCount : 0,
      }));

      // Sort descending by date
      historyList.sort((a, b) => b.date.localeCompare(a.date));

      return NextResponse.json({
        success: true,
        historyList,
      });
    }

    // -------------------------------------------------------------
    // MODE 3: SALES ANALYZER (Server-Side Sales & Performance Metrics)
    // -------------------------------------------------------------
    if (mode === 'analytics') {
      let startDateStr = targetDate;
      let endDateStr = targetDate;
      const todayStr = getISTDateString();

      if (range === 'today') {
        startDateStr = todayStr;
        endDateStr = todayStr;
      } else if (range === 'yesterday') {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        startDateStr = getISTDateString(yDate);
        endDateStr = startDateStr;
      } else if (range === 'last_7_days') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        startDateStr = getISTDateString(d7);
        endDateStr = todayStr;
      } else if (range === 'last_30_days') {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 29);
        startDateStr = getISTDateString(d30);
        endDateStr = todayStr;
      } else if (range === 'this_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = getISTDateString(firstDay);
        endDateStr = todayStr;
      } else if (range === 'custom' && customStart && customEnd) {
        startDateStr = customStart;
        endDateStr = customEnd;
      }

      // Selected Range Bounds
      const { startISO: currStartISO } = getISTDateBounds(startDateStr);
      const { endISO: currEndISO } = getISTDateBounds(endDateStr);

      // Compute Equivalent Previous Period for Comparison
      const currStartObj = new Date(`${startDateStr}T00:00:00+05:30`);
      const currEndObj = new Date(`${endDateStr}T23:59:59+05:30`);
      const durationMs = currEndObj.getTime() - currStartObj.getTime();
      
      const prevEndObj = new Date(currStartObj.getTime() - 1);
      const prevStartObj = new Date(prevEndObj.getTime() - durationMs);
      
      const prevStartISO = prevStartObj.toISOString();
      const prevEndISO = prevEndObj.toISOString();

      // Query Current Period Orders
      const { data: currDbOrders, error: currErr } = await supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', currStartISO)
        .lte('created_at', currEndISO)
        .order('created_at', { ascending: true });

      if (currErr) {
        console.error('Analytics query error:', currErr);
        return NextResponse.json({ success: false, error: currErr.message }, { status: 500 });
      }

      // Query Previous Period Orders for Comparison
      const { data: prevDbOrders } = await supabaseAdmin
        .from('orders')
        .select('total_amount, order_status, items')
        .gte('created_at', prevStartISO)
        .lte('created_at', prevEndISO);

      const currOrders = (currDbOrders || []).map(mapDbOrder).filter((o) => o.orderStatus !== 'merged');
      const prevOrders = (prevDbOrders || []).map(mapDbOrder).filter((o) => o.orderStatus !== 'merged');


      // Calculate Current KPIs
      let totalOrderValue = 0;
      let totalOrders = 0;
      let totalItemsSold = 0;

      const itemSalesMap = new Map<string, { name: string; quantitySold: number; totalValue: number }>();
      const categorySalesMap = new Map<string, {
        categoryName: string;
        totalValue: number;
        quantitySold: number;
        itemsMap: Map<string, { qty: number; value: number }>;
      }>();
      const hourlySalesMap = new Map<number, { hour: number; hourLabel: string; orderCount: number; totalValue: number }>();
      const dailyTrendMap = new Map<string, { date: string; formattedDate: string; orderCount: number; totalValue: number }>();
      const tableSalesMap = new Map<number, { tableNumber: number; orderCount: number; totalValue: number }>();

      // Initialize 24 Hourly Slots
      for (let h = 0; h < 24; h++) {
        const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        hourlySalesMap.set(h, { hour: h, hourLabel: label, orderCount: 0, totalValue: 0 });
      }

      currOrders.forEach((o) => {
        if (o.orderStatus === 'cancelled') return;

        totalOrders++;
        totalOrderValue += o.totalAmount;

        // Date trend
        const istDateStr = getISTDateString(new Date(o.createdAt));
        if (!dailyTrendMap.has(istDateStr)) {
          dailyTrendMap.set(istDateStr, {
            date: istDateStr,
            formattedDate: formatDisplayDate(istDateStr),
            orderCount: 0,
            totalValue: 0,
          });
        }
        const dt = dailyTrendMap.get(istDateStr)!;
        dt.orderCount++;
        dt.totalValue += o.totalAmount;

        // Hourly trend (using IST hour)
        const istDateObj = new Date(new Date(o.createdAt).getTime() + (5.5 * 3600 * 1000) + (new Date(o.createdAt).getTimezoneOffset() * 60000));
        const hour = istDateObj.getHours();
        if (hourlySalesMap.has(hour)) {
          const hr = hourlySalesMap.get(hour)!;
          hr.orderCount++;
          hr.totalValue += o.totalAmount;
        }

        // Table sales
        const tbl = o.tableNumber || 1;
        if (!tableSalesMap.has(tbl)) {
          tableSalesMap.set(tbl, { tableNumber: tbl, orderCount: 0, totalValue: 0 });
        }
        const tSales = tableSalesMap.get(tbl)!;
        tSales.orderCount++;
        tSales.totalValue += o.totalAmount;

        // Items and Categories
        (o.items || []).forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const val = qty * price;
          totalItemsSold += qty;

          const itemName = item.name || 'Unknown Item';
          if (!itemSalesMap.has(itemName)) {
            itemSalesMap.set(itemName, { name: itemName, quantitySold: 0, totalValue: 0 });
          }
          const itemStat = itemSalesMap.get(itemName)!;
          itemStat.quantitySold += qty;
          itemStat.totalValue += val;

          // Normalize category name
          let catName = (item.categoryName || item.category_name || item.category || '').trim();
          if (!catName) {
            catName = 'General Menu';
          }

          if (!categorySalesMap.has(catName)) {
            categorySalesMap.set(catName, {
              categoryName: catName,
              totalValue: 0,
              quantitySold: 0,
              itemsMap: new Map<string, { qty: number; value: number }>(),
            });
          }
          const catStat = categorySalesMap.get(catName)!;
          catStat.quantitySold += qty;
          catStat.totalValue += val;

          if (!catStat.itemsMap.has(itemName)) {
            catStat.itemsMap.set(itemName, { qty: 0, value: 0 });
          }
          const catItem = catStat.itemsMap.get(itemName)!;
          catItem.qty += qty;
          catItem.value += val;
        });
      });

      // Calculate Previous Period KPIs
      let prevPeriodOrderValue = 0;
      let prevPeriodOrders = 0;
      let prevPeriodItemsSold = 0;

      prevOrders.forEach((o) => {
        if (o.orderStatus === 'cancelled') return;
        prevPeriodOrders++;
        prevPeriodOrderValue += o.totalAmount;
        (o.items || []).forEach((i: any) => {
          prevPeriodItemsSold += Number(i.quantity) || 1;
        });
      });

      const averageOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;
      const prevPeriodAvgValue = prevPeriodOrders > 0 ? prevPeriodOrderValue / prevPeriodOrders : 0;

      const valueChangePercentage = prevPeriodOrderValue > 0
        ? ((totalOrderValue - prevPeriodOrderValue) / prevPeriodOrderValue) * 100
        : 0;

      const ordersChangePercentage = prevPeriodOrders > 0
        ? ((totalOrders - prevPeriodOrders) / prevPeriodOrders) * 100
        : 0;

      // Top Selling Items (Sort by Quantity)
      const topSellingItems = Array.from(itemSalesMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10);

      // Category Sales Breakdown
      const categorySales = Array.from(categorySalesMap.values()).map((cat) => {
        let topItemName = '';
        let topItemQty = 0;

        cat.itemsMap.forEach((data, name) => {
          if (data.qty > topItemQty) {
            topItemQty = data.qty;
            topItemName = name;
          }
        });

        const percentageOfTotalSales = totalOrderValue > 0
          ? Math.round((cat.totalValue / totalOrderValue) * 1000) / 10
          : 0;

        return {
          categoryName: cat.categoryName,
          totalValue: cat.totalValue,
          quantitySold: cat.quantitySold,
          uniqueItemCount: cat.itemsMap.size,
          topItemName,
          topItemQty,
          percentageOfTotalSales,
        };
      }).sort((a, b) => b.totalValue - a.totalValue);


      // Hourly List
      const hourlySales = Array.from(hourlySalesMap.values());

      // Find Peak Hour
      interface PeakHourData {
        label: string;
        orderCount: number;
        totalValue: number;
      }
      let peakHour: PeakHourData | null = null;
      let maxOrders = 0;
      hourlySales.forEach((h) => {
        if (h.orderCount > maxOrders) {
          maxOrders = h.orderCount;
          const endH = (h.hour + 1) % 24;
          const endLabel = endH === 0 ? '12 AM' : endH < 12 ? `${endH} AM` : endH === 12 ? '12 PM' : `${endH - 12} PM`;
          peakHour = {
            label: `${h.hourLabel}–${endLabel}`,
            orderCount: h.orderCount,
            totalValue: h.totalValue,
          };
        }
      });

      // Daily Trend List
      const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // Table Sales List
      const tableSales = Array.from(tableSalesMap.values()).sort((a, b) => a.tableNumber - b.tableNumber);

      // Deterministic Insights
      const insights: string[] = [];
      if (peakHour) {
        const ph: PeakHourData = peakHour;
        insights.push(`Peak demand occurred during ${ph.label} with ${ph.orderCount} orders recorded.`);
      }

      if (topSellingItems.length > 0) {
        insights.push(`Top selling menu item was "${topSellingItems[0].name}" with ${topSellingItems[0].quantitySold} units ordered.`);
      }
      if (valueChangePercentage > 0) {
        insights.push(`Order value increased by ${valueChangePercentage.toFixed(1)}% compared to the previous equivalent period.`);
      } else if (valueChangePercentage < 0) {
        insights.push(`Order value dipped by ${Math.abs(valueChangePercentage).toFixed(1)}% compared to the previous equivalent period.`);
      }

      const dateRangeLabel = startDateStr === endDateStr
        ? formatDisplayDate(startDateStr)
        : `${formatDisplayDate(startDateStr)} – ${formatDisplayDate(endDateStr)}`;

      return NextResponse.json({
        success: true,
        analytics: {
          dateRangeLabel,
          totalOrderValue,
          totalOrders,
          averageOrderValue,
          totalItemsSold,
          prevPeriodOrderValue,
          prevPeriodOrders,
          prevPeriodAvgValue,
          prevPeriodItemsSold,
          valueChangePercentage,
          ordersChangePercentage,
          topSellingItems,
          categorySales,
          hourlySales,
          dailyTrend,
          tableSales,
          peakHour,
          insights,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
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

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.warn('API /api/admin/orders PATCH DB warning:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
