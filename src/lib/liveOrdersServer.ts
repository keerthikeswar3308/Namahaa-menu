import { Order, OrderStatus } from '@/types';
import { supabaseAdmin } from './supabaseServer';
import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from './businessDay';

// Global singleton map for live orders in Node.js server process
// Key: orderId -> Order
const globalOrders = globalThis as unknown as {
  __namahaaLiveOrders?: Map<string, Order>;
};

if (!globalOrders.__namahaaLiveOrders) {
  globalOrders.__namahaaLiveOrders = new Map<string, Order>();
}

const liveOrdersMemory = globalOrders.__namahaaLiveOrders;

/**
 * Saves or updates an order in server memory (instant, 0ms latency)
 */
export function saveLiveOrderMemory(order: Order): Order {
  if (!order || !order.id) return order;
  liveOrdersMemory.set(order.id, order);
  return order;
}

/**
 * Updates order status in server memory
 */
export function updateLiveOrderStatusMemory(orderId: string, status: OrderStatus): boolean {
  const existing = liveOrdersMemory.get(orderId);
  if (existing) {
    existing.orderStatus = status;
    existing.updatedAt = new Date().toISOString();
    liveOrdersMemory.set(orderId, existing);
    return true;
  }
  return false;
}

/**
 * Returns all active orders and recent orders stored in server memory (< 24 hours)
 */
export function getLiveOrdersMemory(): Order[] {
  const now = Date.now();
  const list: Order[] = [];

  for (const [id, order] of liveOrdersMemory.entries()) {
    const age = now - new Date(order.createdAt).getTime();
    // Prune closed orders older than 24h
    if (age > 24 * 60 * 60 * 1000 && (order.orderStatus === 'completed' || order.orderStatus === 'cancelled')) {
      liveOrdersMemory.delete(id);
    } else {
      list.push(order);
    }
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Maps Supabase DB order row to Order object
 */
export function mapDbRowToOrder(o: any): Order {
  const items = Array.isArray(o.items) ? o.items : [];
  const rawSubtotal = Number(o.subtotal_amount || 0);
  const calculatedSubtotal = items.reduce(
    (s: number, item: any) => s + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const subtotalAmount = rawSubtotal > 0 ? rawSubtotal : calculatedSubtotal;

  return {
    id: String(o.id),
    orderNumber: String(o.order_number || o.orderNumber || `#ORD-${String(o.id).slice(-6)}`),
    tableNumber: Number(o.table_number || o.tableNumber || 1),
    items,
    subtotalAmount,
    discountType: o.discount_type || 'none',
    discountValue: Number(o.discount_value || 0),
    discountAmount: Number(o.discount_amount || 0),
    totalAmount: Number(o.total_amount || o.totalAmount || subtotalAmount),
    orderStatus: (o.order_status || 'pending') as OrderStatus,
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

/**
 * Merges orders from database and memory, deduplicating by ID,
 * ensuring no active order is ever lost or filtered out.
 */
export function mergeOrdersWithMemory(dbOrders: Order[] = []): Order[] {
  const memoryOrders = getLiveOrdersMemory();
  const orderMap = new Map<string, Order>();

  // Add DB orders first
  for (const order of dbOrders) {
    if (order && order.id) {
      orderMap.set(order.id, order);
    }
  }

  // Merge memory orders (overwriting with newest memory state if newer, or adding new orders)
  for (const memOrder of memoryOrders) {
    if (memOrder && memOrder.id) {
      const existing = orderMap.get(memOrder.id);
      if (!existing) {
        orderMap.set(memOrder.id, memOrder);
      } else {
        const memTime = new Date(memOrder.updatedAt || memOrder.createdAt).getTime();
        const dbTime = new Date(existing.updatedAt || existing.createdAt).getTime();
        if (memTime >= dbTime) {
          orderMap.set(memOrder.id, { ...existing, ...memOrder });
        }
      }
    }
  }

  // Sort newest first
  return Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

