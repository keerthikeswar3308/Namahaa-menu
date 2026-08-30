'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus } from '@/types';
import { OrderStore } from '@/lib/orderStore';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  RefreshCw,
  Utensils,
  ChefHat,
  Search,
  Filter,
  TrendingUp,
  XCircle,
  Sparkles,
  Printer,
} from 'lucide-react';

export const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set());

  const playChime = () => {
    try {
      if (typeof window === 'undefined' || !soundEnabled) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  const loadLiveOrders = async () => {
    setIsRefreshing(true);
    const fetched = await OrderStore.fetchOrdersFromSupabase();
    setOrders(fetched);

    // If new pending order arrived, trigger chime
    const currentPendingCount = fetched.filter((o) => o.orderStatus === 'pending').length;
    if (currentPendingCount > lastOrderCount && lastOrderCount !== 0) {
      playChime();
    }
    setLastOrderCount(currentPendingCount);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadLiveOrders();

    const unsubscribe = OrderStore.subscribeToLiveOrders((payload) => {
      if (payload && payload.new) {
        const raw = payload.new;
        const mappedNewOrder: Order = {
          id: raw.id,
          orderNumber: raw.order_number || raw.orderNumber || `#ORD-${raw.id.slice(-6)}`,
          tableNumber: Number(raw.table_number || raw.tableNumber || 1),
          items: Array.isArray(raw.items) ? raw.items : [],
          totalAmount: Number(raw.total_amount || raw.totalAmount || 0),
          orderStatus: raw.order_status || 'pending',
          customerName: raw.customer_name || '',
          customerPhone: raw.customer_phone || '',
          notes: raw.notes || '',
          sessionId: raw.session_id || '',
          idempotencyKey: raw.idempotency_key || '',
          createdAt: raw.created_at || new Date().toISOString(),
          updatedAt: raw.updated_at || new Date().toISOString(),
        };

        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === mappedNewOrder.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = mappedNewOrder;
            return updated;
          }
          if (mappedNewOrder.orderStatus === 'pending') {
            playChime();
          }
          return [mappedNewOrder, ...prev];
        });
      } else {
        loadLiveOrders();
      }
    });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadLiveOrders();
      }
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (processingOrderIds.has(orderId)) return;

    setProcessingOrderIds((prev) => new Set(prev).add(orderId));

    try {
      const success = await OrderStore.updateOrderStatus(orderId, status);
      if (success) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                orderStatus: status,
              };
            }
            return o;
          })
        );
      } else {
        alert('Could not update order in database. Please check your network connection and try again.');
      }
    } catch (err) {
      console.error('handleUpdateStatus exception:', err);
      alert('Network error updating order in database.');
    } finally {
      setProcessingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handlePrintKot = (order: Order) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups to print KOT tickets.');
      return;
    }

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="font-size: 16px; font-weight: bold; padding: 6px 0; font-family: monospace;">
            ${item.quantity} x ${item.name.toUpperCase()}
          </td>
        </tr>
      `
      )
      .join('');

    const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <html>
        <head>
          <title>KOT ${order.orderNumber}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #000;
              margin: 0;
              padding: 15px;
              width: 280px;
            }
            .center { text-align: center; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            .title { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <span class="title">NAMAHAA TIFFIN ROOM</span><br/>
            <span style="font-size: 14px; font-weight: bold;">*** KITCHEN ORDER TICKET (KOT) ***</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 14px; line-height: 1.5;">
            <strong>Order #:</strong> ${order.orderNumber}<br/>
            <strong>Table #:</strong> ${order.tableNumber}<br/>
            <strong>Time   :</strong> ${formattedTime}
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          ${order.notes ? `<div style="font-size: 13px; font-weight: bold;"><strong>Kitchen Notes:</strong> "${order.notes}"</div><div class="divider"></div>` : ''}
          <div class="center" style="font-size: 11px; font-weight: bold;">
            (Kitchen copy)
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBill = (order: Order) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=480,height=650');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups to print customer bills.');
      return;
    }

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 4px 0; font-size: 12px;">${item.name}</td>
          <td style="padding: 4px 0; font-size: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 4px 0; font-size: 12px; text-align: right;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 4px 0; font-size: 12px; text-align: right; font-weight: bold;">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const formattedDate = new Date(order.createdAt).toLocaleDateString();
    const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <html>
        <head>
          <title>BILL ${order.orderNumber}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #000;
              margin: 0;
              padding: 20px;
              width: 320px;
            }
            .center { text-align: center; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .double-divider { border-top: 2px double #000; margin: 10px 0; }
            .title { font-size: 18px; font-weight: bold; font-family: serif; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 4px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <span class="title">NAMAHAA TIFFIN ROOM</span><br/>
            <span style="font-size: 11px;">Authentic South Indian Tiffins</span><br/>
            <span style="font-size: 12px; font-weight: bold; margin-top: 4px; display: inline-block;">CUSTOMER INVOICE</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;"><span>Order #: <strong>${order.orderNumber}</strong></span> <span>Table #: <strong>${order.tableNumber}</strong></span></div>
            <div style="display: flex; justify-content: space-between;"><span>Date: ${formattedDate}</span> <span>Time: ${formattedTime}</span></div>
            ${order.customerName ? `<div>Customer: <strong>${order.customerName}</strong></div>` : ''}
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">ITEM</th>
                <th style="width: 15%; text-align: center;">QTY</th>
                <th style="width: 20%; text-align: right;">PRICE</th>
                <th style="width: 20%; text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="double-divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold;">
            <span>GRAND TOTAL:</span>
            <span>₹${order.totalAmount.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 11px; font-style: italic; margin-top: 10px;">
            Thank you for dining with Namahaa Tiffin Room!<br/>Please visit again!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.orderStatus === 'pending').length;
    const preparingCount = orders.filter((o) => o.orderStatus === 'preparing').length;
    const completedCount = orders.filter((o) => o.orderStatus === 'completed').length;
    const totalRevenue = orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return { totalCount, pendingCount, preparingCount, completedCount, totalRevenue };
  }, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'active' && (o.orderStatus === 'completed' || o.orderStatus === 'cancelled')) return false;
      if (activeTab === 'pending' && o.orderStatus !== 'pending') return false;
      if (activeTab === 'preparing' && o.orderStatus !== 'preparing') return false;
      if (activeTab === 'completed' && o.orderStatus !== 'completed') return false;
      if (activeTab === 'cancelled' && o.orderStatus !== 'cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTable = o.tableNumber.toString().includes(q);
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = (o.customerName || '').toLowerCase().includes(q);
        if (!matchesTable && !matchesNum && !matchesCustomer) return false;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Kitchen
          </span>
        );
      case 'preparing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5" /> Preparing...
          </span>
        );
      case 'served':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5" /> Served at Table
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Order Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-700 dark:text-namaha-gold">
              Live Kitchen Display System (KDS)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-namaha-green-deep dark:text-white">
            Customer Table Orders
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center gap-2 transition ${
              soundEnabled
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-namaha-gold'
                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'
            }`}
            title="Toggle kitchen order alert sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600 dark:text-namaha-gold" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadLiveOrders}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-white">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
            Kitchen Pending
          </span>
          <div className="text-3xl font-serif font-extrabold text-amber-600 dark:text-amber-400">
            {stats.pendingCount}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-slate-800 dark:text-white">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block mb-1">
            Now Preparing
          </span>
          <div className="text-3xl font-serif font-extrabold text-blue-600 dark:text-blue-400">
            {stats.preparingCount}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-white">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
            Completed Orders
          </span>
          <div className="text-3xl font-serif font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.completedCount}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-slate-800 dark:text-white">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block mb-1">
            Total Live Sales
          </span>
          <div className="text-3xl font-serif font-extrabold text-purple-600 dark:text-purple-400">
            ₹{stats.totalRevenue.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: 'active', label: `Live Active (${orders.filter((o) => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled').length})` },
            { id: 'pending', label: `Pending (${stats.pendingCount})` },
            { id: 'preparing', label: `Preparing (${stats.preparingCount})` },
            { id: 'completed', label: `Completed History (${stats.completedCount})` },
            { id: 'all', label: `All Orders (${stats.totalCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full font-extrabold text-xs whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 text-slate-700 dark:text-gray-300 hover:bg-amber-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Table # or Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-full bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 text-xs text-slate-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border transition shadow-lg flex flex-col justify-between ${
                order.orderStatus === 'pending'
                  ? 'border-amber-500/50 ring-2 ring-amber-500/20'
                  : order.orderStatus === 'preparing'
                  ? 'border-blue-500/50'
                  : 'border-emerald-950/10 dark:border-namaha-gold/20'
              }`}
            >
              <div>
                {/* Top Card Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 mb-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-namaha-gold block">
                      Table #{order.tableNumber}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                      {order.orderNumber}
                    </h3>
                  </div>
                  <div>{getStatusBadge(order.orderStatus)}</div>
                </div>

                {/* Customer Details */}
                <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-gray-400 mb-3 font-medium">
                  <div className="flex items-center justify-between">
                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {order.customerName && (
                      <span className="font-bold text-slate-800 dark:text-white">
                        Customer: {order.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2.5 my-4 max-h-48 overflow-y-auto pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-gray-300">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 mb-4 italic font-medium">
                    &quot;{order.notes}&quot;
                  </div>
                )}
              </div>

              {/* Card Footer & Action Buttons */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Total Bill:</span>
                  <span className="text-xl font-serif font-extrabold text-namaha-green-deep dark:text-namaha-gold">
                    ₹{order.totalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Printing Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePrintKot(order)}
                    className="py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-namaha-gold border border-amber-500/20 text-xs font-bold transition flex items-center justify-center gap-1"
                    title="Print Kitchen Order Ticket (No prices)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print KOT</span>
                  </button>

                  <button
                    onClick={() => handlePrintBill(order)}
                    className="py-1.5 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs font-bold transition flex items-center justify-center gap-1"
                    title="Print Customer Bill Receipt"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                </div>

                {/* Status Transition Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {order.orderStatus === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4" /> Start Preparing
                    </button>
                  )}

                  {order.orderStatus === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'served')}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Utensils className="w-4 h-4" /> Mark Served
                    </button>
                  )}

                  {(order.orderStatus === 'preparing' || order.orderStatus === 'served' || order.orderStatus === 'pending') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={processingOrderIds.has(order.id)}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {processingOrderIds.has(order.id) ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Completing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete Order</span>
                        </>
                      )}
                    </button>
                  )}

                  {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 font-bold text-xs transition animate-fade-in"
                      title="Cancel Order"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-namaha-green-deep rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl my-8">
          <Utensils className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-serif font-bold text-namaha-green-deep dark:text-white mb-2">
            No Orders Found
          </h3>
          <p className="text-sm text-slate-600 dark:text-gray-400 max-w-md mx-auto font-medium">
            There are currently no customer orders matching your selected status tab. New table orders will chime here automatically!
          </p>
        </div>
      )}

    </div>
  );
};
