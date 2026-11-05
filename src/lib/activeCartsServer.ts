import { supabaseAdmin } from './supabaseServer';
import { getRestaurantBusinessDateStr, getBusinessDateBoundsISO } from './businessDay';
import { ActiveTableCart, OrderItem } from '@/types';

// Ensure single global instance in Node.js server process
const globalActiveCarts = globalThis as unknown as {
  __namahaaActiveCarts?: Map<number, ActiveTableCart>;
};

if (!globalActiveCarts.__namahaaActiveCarts) {
  globalActiveCarts.__namahaaActiveCarts = new Map<number, ActiveTableCart>();
}

const activeCartsMemory = globalActiveCarts.__namahaaActiveCarts;

/**
 * Returns active carts stored in server memory (filtered for freshness < 12 hours)
 */
export function getActiveCartsMemory(): ActiveTableCart[] {
  const now = Date.now();
  const result: ActiveTableCart[] = [];

  for (const [tableNum, cart] of activeCartsMemory.entries()) {
    const age = now - new Date(cart.updatedAt).getTime();
    if (age > 12 * 60 * 60 * 1000) {
      activeCartsMemory.delete(tableNum);
    } else if (cart.items && cart.items.length > 0) {
      result.push(cart);
    }
  }

  return result.sort((a, b) => a.tableNumber - b.tableNumber);
}

/**
 * Saves or updates an active cart in server memory
 */
export function saveActiveCartMemory(
  tableNumber: number,
  items: any[],
  sessionId?: string,
  customerName?: string
): ActiveTableCart | null {
  if (!items || !Array.isArray(items) || items.length === 0) {
    activeCartsMemory.delete(tableNumber);
    return null;
  }

  const validItems: OrderItem[] = items.map((i) => ({
    id: String(i.id || `item_${Date.now()}`),
    name: String(i.name || 'Menu Item'),
    price: Number(i.price || 0),
    quantity: Math.max(1, Number(i.quantity || 1)),
    image: i.image ? String(i.image) : undefined,
    isVeg: i.isVeg !== false,
    notes: i.notes ? String(i.notes) : undefined,
  }));

  const itemCount = validItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const totalAmount = validItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0);

  const cart: ActiveTableCart = {
    tableNumber,
    items: validItems,
    itemCount,
    totalAmount,
    sessionId: sessionId || '',
    customerName: customerName || '',
    updatedAt: new Date().toISOString(),
  };

  activeCartsMemory.set(tableNumber, cart);
  return cart;
}

/**
 * Clears an active cart from memory for a table
 */
export function clearActiveCartMemory(tableNumber: number): void {
  activeCartsMemory.delete(tableNumber);
}

/**
 * Clears all active carts from server memory (used on DB reset)
 */
export function clearAllActiveCartsMemory(): void {
  activeCartsMemory.clear();
}

/**
 * Persists active cart to Supabase table_group_carts (if table exists)
 * and keeps server memory cache synchronized.
 */
export async function syncActiveCartServer(
  tableNumber: number,
  items: any[],
  sessionId?: string,
  customerName?: string
): Promise<ActiveTableCart | null> {
  const num = Number(tableNumber);
  if (isNaN(num) || num < 1 || num > 12) return null;

  if (!items || !Array.isArray(items) || items.length === 0) {
    clearActiveCartMemory(num);
    try {
      await supabaseAdmin.from('table_group_carts').delete().eq('table_number', num);
    } catch {}
    return null;
  }

  const cart = saveActiveCartMemory(num, items, sessionId, customerName);
  if (!cart) return null;

  // Asynchronously try upserting in Supabase
  try {
    await supabaseAdmin.from('table_group_carts').upsert(
      {
        table_number: num,
        items: cart.items,
        total_amount: cart.totalAmount,
        item_count: cart.itemCount,
        last_session_id: sessionId || '',
        customer_name: customerName || '',
        updated_at: cart.updatedAt,
      },
      { onConflict: 'table_number' }
    );
  } catch (err) {
    // Graceful fallback if table does not exist
  }

  return cart;
}

/**
 * Fetches all active carts combining in-memory cache and Supabase DB
 */
export async function fetchAllActiveCarts(): Promise<ActiveTableCart[]> {
  const memoryCarts = getActiveCartsMemory();

  if (memoryCarts.length > 0) {
    return memoryCarts;
  }

  // Fallback to Supabase if server memory was restarted
  try {
    const currentBusinessDate = getRestaurantBusinessDateStr();
    const { startISO } = getBusinessDateBoundsISO(currentBusinessDate);

    const { data: dbCarts } = await supabaseAdmin
      .from('table_group_carts')
      .select('*')
      .gte('updated_at', startISO);

    if (dbCarts && Array.isArray(dbCarts) && dbCarts.length > 0) {
      for (const row of dbCarts) {
        if (row.items && Array.isArray(row.items) && row.items.length > 0) {
          saveActiveCartMemory(
            Number(row.table_number),
            row.items,
            row.last_session_id,
            row.customer_name
          );
        }
      }
      return getActiveCartsMemory();
    }
  } catch (e) {
    // Database query error fallback
  }

  return memoryCarts;
}

