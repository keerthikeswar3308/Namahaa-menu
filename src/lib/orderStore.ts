import { Order, OrderItem, OrderStatus, DailyOrderSummary, SalesAnalytics } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const ORDERS_STORAGE_KEY = 'namahaa_orders_v1';

function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem('namahaa_admin_username');
    if (username) headers['x-admin-username'] = username;
    const passcode = localStorage.getItem('namahaa_admin_auth_code');
    if (passcode) {
      headers['x-admin-passcode'] = passcode;
      headers['x-admin-auth'] = passcode;
    }
    const token = sessionStorage.getItem('namahaa_admin_token') || localStorage.getItem('namahaa_admin_token');
    if (token) {
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading stored orders:', err);
    return [];
  }
}

function setStoredOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('namahaa_orders_updated'));
  } catch (err) {
    console.error('Error saving stored orders:', err);
  }
}

function notifyOrdersUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('namahaa_orders_updated'));
}

export class OrderStore {
  static getOrders(): Order[] {
    return getStoredOrders();
  }

  // Fetch Live Orders for a target date (defaults to Today IST)
  static async fetchLiveOrders(targetDate?: string): Promise<{
    orders: Order[];
    date: string;
    formattedDate: string;
    summary: DailyOrderSummary;
  }> {
    try {
      const url = targetDate
        ? `/api/admin/orders?mode=live&date=${targetDate}&t=${Date.now()}`
        : `/api/admin/orders?mode=live&t=${Date.now()}`;

      const res = await fetch(url, {
        cache: 'no-store',
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            orders: json.orders || [],
            date: json.date || '',
            formattedDate: json.formattedDate || '',
            summary: json.summary || {
              date: '',
              formattedDate: '',
              orderCount: 0,
              itemCount: 0,
              totalOrderValue: 0,
              averageOrderValue: 0,
              activeCount: 0,
              completedCount: 0,
              cancelledCount: 0,
            },
          };
        }
      }
    } catch (err) {
      console.warn('fetchLiveOrders error:', err);
    }

    return {
      orders: [],
      date: targetDate || '',
      formattedDate: targetDate || '',
      summary: {
        date: targetDate || '',
        formattedDate: targetDate || '',
        orderCount: 0,
        itemCount: 0,
        totalOrderValue: 0,
        averageOrderValue: 0,
        activeCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      },
    };
  }

  // Fetch Compact Previous Days Summary List
  static async fetchHistoryList(): Promise<DailyOrderSummary[]> {
    try {
      const res = await fetch(`/api/admin/orders?mode=history_list&t=${Date.now()}`, {
        cache: 'no-store',
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.historyList)) {
          return json.historyList;
        }
      }
    } catch (err) {
      console.warn('fetchHistoryList error:', err);
    }
    return [];
  }

  // Fetch Detailed Orders for a Specific Past Date
  static async fetchDailyDetails(dateStr: string): Promise<{
    orders: Order[];
    date: string;
    formattedDate: string;
    summary: DailyOrderSummary;
  }> {
    try {
      const res = await fetch(`/api/admin/orders?mode=daily_details&date=${dateStr}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            orders: json.orders || [],
            date: json.date || dateStr,
            formattedDate: json.formattedDate || dateStr,
            summary: json.summary,
          };
        }
      }
    } catch (err) {
      console.warn('fetchDailyDetails error:', err);
    }
    return {
      orders: [],
      date: dateStr,
      formattedDate: dateStr,
      summary: {
        date: dateStr,
        formattedDate: dateStr,
        orderCount: 0,
        itemCount: 0,
        totalOrderValue: 0,
        averageOrderValue: 0,
        activeCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      },
    };
  }

  // Fetch Sales Analytics for a Selected Range
  static async fetchSalesAnalytics(
    range: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesAnalytics | null> {
    try {
      let url = `/api/admin/orders?mode=analytics&range=${range}&t=${Date.now()}`;
      if (range === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url, {
        cache: 'no-store',
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.analytics) {
          return json.analytics;
        }
      }
    } catch (err) {
      console.warn('fetchSalesAnalytics error:', err);
    }
    return null;
  }

  static async fetchOrdersFromSupabase(): Promise<Order[]> {
    const { orders } = await this.fetchLiveOrders();
    return orders;
  }

  static async fetchCustomerOrders(tableNumber?: number | null, sessionId?: string): Promise<Order[]> {
    if (!sessionId) return getStoredOrders();
    try {
      const url = `/api/orders/list?sessionId=${sessionId}&t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          const current = getStoredOrders();
          const merged = [...current];
          json.orders.forEach((newOrd: Order) => {
            const idx = merged.findIndex((o) => o.id === newOrd.id);
            if (idx !== -1) {
              merged[idx] = newOrd;
            } else {
              merged.push(newOrd);
            }
          });
          setStoredOrders(merged);
          return json.orders;
        }
      }
    } catch (err) {
      console.warn('fetchCustomerOrders error:', err);
    }
    return getStoredOrders().filter((o) => !sessionId || o.sessionId === sessionId);
  }

  static subscribeToCustomerSessionOrders(sessionId: string, onOrderUpdate: (payload?: any) => void): () => void {
    if (typeof window === 'undefined' || !sessionId) return () => {};

    const handleEvent = () => onOrderUpdate();
    window.addEventListener('namahaa_orders_updated', handleEvent);
    window.addEventListener('storage', handleEvent);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupSubscription = () => {
      if (!isSupabaseConfigured()) return;
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
        channel = supabase
          .channel(`customer_session_${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `session_id=eq.${sessionId}`,
            },
            (payload) => {
              onOrderUpdate(payload);
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              if (reconnectTimer) clearTimeout(reconnectTimer);
              reconnectTimer = setTimeout(() => {
                setupSubscription();
              }, 4000);
            }
          });
      } catch (err) {
        console.warn('subscribeToCustomerSessionOrders error:', err);
      }
    };

    setupSubscription();

    return () => {
      window.removeEventListener('namahaa_orders_updated', handleEvent);
      window.removeEventListener('storage', handleEvent);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }

  static async createOrder(payload: {
    tableNumber: number;
    items: OrderItem[];
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    sessionId?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        const current = getStoredOrders();
        const existingIdx = current.findIndex((o) => o.id === data.order.id);
        let updated = [];
        if (existingIdx !== -1) {
          current[existingIdx] = data.order;
          updated = [...current];
        } else {
          updated = [data.order, ...current];
        }
        setStoredOrders(updated);
        notifyOrdersUpdated();
        return { success: true, order: data.order };
      }

      return { success: false, error: data.error || 'Failed to place order in database' };
    } catch (err: any) {
      console.error('createOrder exception:', err);
      return {
        success: false,
        error: err.message || 'Network error placing order. Please check your connection and try again.',
      };
    }
  }

  static async updateOrderStatus(
    orderId: string,
    orderStatus: OrderStatus
  ): Promise<boolean> {
    const orders = getStoredOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    let previousOrderState: Order | null = null;

    if (idx !== -1) {
      previousOrderState = { ...orders[idx] };
      orders[idx].orderStatus = orderStatus;
      setStoredOrders(orders);
      notifyOrdersUpdated();
    }

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ orderId, orderStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return true;
      } else {
        if (previousOrderState && idx !== -1) {
          orders[idx] = previousOrderState;
          setStoredOrders(orders);
          notifyOrdersUpdated();
        }
        return false;
      }
    } catch (err) {
      console.error('updateOrderStatus error:', err);
      return true;
    }
  }

  static async executeAdminOrderAction(payload: {
    action: 'apply_discount' | 'merge_orders' | 'change_table' | 'add_items' | 'update_notes' | 'cancel_order';
    orderId: string;
    [key: string]: any;
  }): Promise<{ success: boolean; order?: Order; primaryOrder?: Order; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/admin/orders/actions', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notifyOrdersUpdated();
        return data;
      }
      return { success: false, error: data.error || 'Failed to execute order action' };
    } catch (err: any) {
      console.error('executeAdminOrderAction exception:', err);
      return { success: false, error: err.message || 'Network error executing action' };
    }
  }


  static subscribeToLiveOrders(onOrderUpdate: (payload?: any) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleEvent = () => onOrderUpdate();
    window.addEventListener('namahaa_orders_updated', handleEvent);
    window.addEventListener('storage', handleEvent);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupSubscription = () => {
      if (!isSupabaseConfigured()) return;

      try {
        if (channel) {
          supabase.removeChannel(channel);
        }

        channel = supabase
          .channel('namahaa_live_orders_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
              onOrderUpdate(payload);
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.warn(`Supabase Realtime channel status: ${status}. Attempting auto-reconnect in 3s...`, err);
              if (reconnectTimer) clearTimeout(reconnectTimer);
              reconnectTimer = setTimeout(() => {
                setupSubscription();
              }, 3000);
            }
          });
      } catch (subErr) {
        console.warn('Realtime channel setup exception:', subErr);
      }
    };

    setupSubscription();

    return () => {
      window.removeEventListener('namahaa_orders_updated', handleEvent);
      window.removeEventListener('storage', handleEvent);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }
}
