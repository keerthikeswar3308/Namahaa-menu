'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, DailyOrderSummary } from '@/types';
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Printer,
  XCircle,
} from 'lucide-react';

export const OrdersManagement: React.FC = () => {
  // IST Date Helper
  const getTodayISTString = () => {
    const d = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffset + (d.getTimezoneOffset() * 60 * 1000));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIST = getTodayISTString();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayIST);
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DailyOrderSummary>({
    date: todayIST,
    formattedDate: '',
    orderCount: 0,
    itemCount: 0,
    totalOrderValue: 0,
    averageOrderValue: 0,
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });

  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set());
  const [newOrderToast, setNewOrderToast] = useState<{ table: number; orderNumber: string } | null>(null);

  const isTodaySelected = selectedDateStr === todayIST;

  const playChime = () => {
    try {
      if (typeof window === 'undefined' || !soundEnabled) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
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

  const loadDateOrders = async (dateStr: string) => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const data = await OrderStore.fetchLiveOrders(dateStr);
      setOrders(data.orders);
      setFormattedDate(data.formattedDate);
      if (data.summary) {
        setSummary(data.summary);
      }

      // Check for new pending order chime on today's view
      if (dateStr === todayIST) {
        const pendingCount = data.orders.filter((o) => o.orderStatus === 'pending').length;
        if (pendingCount > lastOrderCount && lastOrderCount !== 0) {
          playChime();
        }
        setLastOrderCount(pendingCount);
      }
    } catch (err: any) {
      console.error('loadDateOrders error:', err);
      setLoadError(err.message || 'Unable to load orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDateOrders(selectedDateStr);

    // Subscribe to realtime orders if viewing TODAY
    const unsubscribe = OrderStore.subscribeToLiveOrders((payload) => {
      if (selectedDateStr === todayIST) {
        if (payload && payload.new) {
          const raw = payload.new;
          const newOrdNum = raw.order_number || raw.orderNumber || `#ORD-${raw.id?.slice(-6)}`;
          const tableNum = Number(raw.table_number || raw.tableNumber || 1);

          if (raw.order_status === 'pending') {
            playChime();
            setNewOrderToast({ table: tableNum, orderNumber: newOrdNum });
            setTimeout(() => setNewOrderToast(null), 6000);
          }
        }
        loadDateOrders(todayIST);
      }
    });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && selectedDateStr === todayIST) {
        loadDateOrders(todayIST);
      }
    }, 45000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [selectedDateStr]);

  const handlePrevDate = () => {
    const cur = new Date(`${selectedDateStr}T00:00:00+05:30`);
    cur.setDate(cur.getDate() - 1);
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${day}`);
  };

  const handleNextDate = () => {
    const cur = new Date(`${selectedDateStr}T00:00:00+05:30`);
    cur.setDate(cur.getDate() + 1);
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${day}`);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (processingOrderIds.has(orderId)) return;
    setProcessingOrderIds((prev) => new Set(prev).add(orderId));

    try {
      const success = await OrderStore.updateOrderStatus(orderId, status);
      if (success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o))
        );
        // Recalculate summary locally
        setSummary((prev) => {
          let act = prev.activeCount;
          let comp = prev.completedCount;
          let canc = prev.cancelledCount;
          if (status === 'completed') {
            act = Math.max(0, act - 1);
            comp++;
          } else if (status === 'cancelled') {
            act = Math.max(0, act - 1);
            canc++;
          }
          return { ...prev, activeCount: act, completedCount: comp, cancelledCount: canc };
        });
      } else {
        alert('Could not update status. Please check your network connection.');
      }
    } catch (err) {
      console.error('Update status error:', err);
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
            body { font-family: system-ui, sans-serif; color: #000; margin: 0; padding: 15px; width: 280px; }
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
          <div class="center" style="font-size: 11px; font-weight: bold;">(Kitchen Copy)</div>
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
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #000; margin: 0; padding: 20px; width: 320px; }
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


  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeStatusFilter === 'new' && o.orderStatus !== 'pending') return false;
      if (activeStatusFilter === 'accepted' && o.orderStatus !== 'accepted') return false;
      if (activeStatusFilter === 'preparing' && o.orderStatus !== 'preparing') return false;
      if (activeStatusFilter === 'ready' && o.orderStatus !== 'ready' && o.orderStatus !== 'served') return false;
      if (activeStatusFilter === 'completed' && o.orderStatus !== 'completed') return false;
      if (activeStatusFilter === 'cancelled' && o.orderStatus !== 'cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTable = o.tableNumber.toString().includes(q);
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = (o.customerName || '').toLowerCase().includes(q);
        if (!matchesTable && !matchesNum && !matchesCustomer) return false;
      }
      return true;
    });
  }, [orders, activeStatusFilter, searchQuery]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> NEW
          </span>
        );
      case 'accepted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
          </span>
        );
      case 'preparing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5" /> PREPARING
          </span>
        );
      case 'ready':
      case 'served':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5" /> READY
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Realtime Toast Banner */}
      {newOrderToast && (
        <div className="p-4 rounded-2xl bg-amber-500 text-namaha-green-deep font-extrabold text-sm flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <span>NEW ORDER ARRIVED! Table #{newOrderToast.table} ({newOrderToast.orderNumber})</span>
          </div>
          <button onClick={() => setNewOrderToast(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-700 dark:text-namaha-gold">
              Live Kitchen Display System
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-namaha-green-deep dark:text-white flex items-center gap-3">
            <span>LIVE ORDERS</span>
            <span className="text-sm px-3 py-1 rounded-full bg-namaha-gold/20 text-namaha-gold font-sans font-extrabold">
              {formattedDate || selectedDateStr}
            </span>
          </h2>
        </div>

        {/* Date Selector Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDate}
            className="p-2 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <input
            type="date"
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="px-3 py-1.5 rounded-2xl bg-white dark:bg-namaha-green-dark border border-gray-300 dark:border-white/20 text-xs font-bold text-slate-800 dark:text-white"
          />

          <button
            onClick={handleNextDate}
            className="p-2 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSelectedDateStr(todayIST)}
            className={`px-3 py-2 rounded-2xl font-extrabold text-xs transition ${
              isTodaySelected
                ? 'bg-namaha-gold text-namaha-green-deep shadow-md'
                : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            TODAY
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-2xl border font-bold text-xs flex items-center gap-1 transition ${
              soundEnabled
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-namaha-gold'
                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'
            }`}
            title="Toggle Alert Audio Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600 dark:text-namaha-gold" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => loadDateOrders(selectedDateStr)}
            disabled={isRefreshing}
            className="p-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-md transition disabled:opacity-50"
            title="Sync Live Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TODAY'S COMPACT SUMMARY BAR */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-namaha-green-dark to-slate-900 border border-namaha-gold/30 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-namaha-gold block">
              {isTodaySelected ? "TODAY'S SUMMARY" : `SUMMARY FOR ${formattedDate}`}
            </span>
            <div className="flex items-center gap-6 mt-1 flex-wrap">
              <div>
                <span className="text-2xl font-serif font-extrabold text-white">{summary.orderCount}</span>
                <span className="text-xs text-gray-300 ml-1 font-semibold">Orders</span>
              </div>
              <div>
                <span className="text-2xl font-serif font-extrabold text-white">{summary.itemCount}</span>
                <span className="text-xs text-gray-300 ml-1 font-semibold">Items</span>
              </div>
              <div>
                <span className="text-2xl font-serif font-extrabold text-namaha-gold">₹{summary.totalOrderValue.toFixed(0)}</span>
                <span className="text-xs text-gray-300 ml-1 font-semibold">Order Value</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-extrabold">
            <span className="px-3 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ACTIVE {summary.activeCount}
            </span>
            <span className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              COMPLETED {summary.completedCount}
            </span>
            <span className="px-3 py-1.5 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
              CANCELLED {summary.cancelledCount}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: 'all', label: `ALL (${orders.length})` },
            { id: 'new', label: `NEW (${orders.filter((o) => o.orderStatus === 'pending').length})` },
            { id: 'accepted', label: `ACCEPTED (${orders.filter((o) => o.orderStatus === 'accepted').length})` },
            { id: 'preparing', label: `PREPARING (${orders.filter((o) => o.orderStatus === 'preparing').length})` },
            { id: 'ready', label: `READY (${orders.filter((o) => o.orderStatus === 'ready' || o.orderStatus === 'served').length})` },
            { id: 'completed', label: `COMPLETED (${summary.completedCount})` },
            { id: 'cancelled', label: `CANCELLED (${summary.cancelledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full font-extrabold text-xs whitespace-nowrap transition ${
                activeStatusFilter === tab.id
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
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search Order #, Table #, Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-full bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 text-xs text-slate-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Error state */}
      {loadError && (
        <div className="p-6 text-center bg-red-950/50 border border-red-500 rounded-3xl text-red-300">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h4 className="font-bold text-sm">UNABLE TO LOAD DATA</h4>
          <p className="text-xs text-red-300/80 mb-3">{loadError}</p>
          <button
            onClick={() => loadDateOrders(selectedDateStr)}
            className="px-4 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs"
          >
            RETRY
          </button>
        </div>
      )}

      {/* ORDERS GRID */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border transition shadow-lg flex flex-col justify-between ${
                order.orderStatus === 'pending'
                  ? 'border-amber-500/50 ring-2 ring-amber-500/20'
                  : order.orderStatus === 'preparing'
                  ? 'border-purple-500/50'
                  : 'border-emerald-950/10 dark:border-namaha-gold/20'
              }`}
            >
              <div>
                {/* Top Card Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10 mb-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-namaha-gold block">
                      TABLE #{order.tableNumber}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                      {order.orderNumber}
                    </h3>
                  </div>
                  <div>{getStatusBadge(order.orderStatus)}</div>
                </div>

                {/* Info Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 mb-3 font-medium">
                  <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {order.customerName && (
                    <span className="font-bold text-slate-800 dark:text-white">
                      {order.customerName}
                    </span>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2.5 my-3 max-h-48 overflow-y-auto pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                          {item.quantity}×
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
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 mb-3 italic font-medium">
                    &quot;{order.notes}&quot;
                  </div>
                )}
              </div>

              {/* Card Footer & Action Buttons */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase">ORDER VALUE</span>
                  <span className="text-xl font-serif font-extrabold text-namaha-green-deep dark:text-namaha-gold">
                    ₹{order.totalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Printing Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePrintKot(order)}
                    className="py-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-namaha-gold border border-amber-500/20 text-xs font-bold transition flex items-center justify-center gap-1"
                    title="Print Kitchen Order Ticket"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PRINT KOT</span>
                  </button>

                  <button
                    onClick={() => handlePrintBill(order)}
                    className="py-1.5 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs font-bold transition flex items-center justify-center gap-1"
                    title="Print Customer Bill Invoice"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PRINT BILL</span>
                  </button>
                </div>


                {/* Status Transition Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {order.orderStatus === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      className="flex-1 py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition"
                    >
                      ACCEPT
                    </button>
                  )}

                  {(order.orderStatus === 'pending' || order.orderStatus === 'accepted') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="flex-1 py-2 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition"
                    >
                      PREPARE
                    </button>
                  )}

                  {order.orderStatus === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      className="flex-1 py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition"
                    >
                      MARK READY
                    </button>
                  )}

                  {(order.orderStatus === 'ready' || order.orderStatus === 'served' || order.orderStatus === 'preparing') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={processingOrderIds.has(order.id)}
                      className="flex-1 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                    >
                      COMPLETE
                    </button>
                  )}

                  {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition"
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
            {isTodaySelected ? 'NO ORDERS TODAY' : 'NO ORDERS FOR THIS DATE'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-gray-400 max-w-md mx-auto font-medium">
            {isTodaySelected
              ? 'Orders placed today will appear here automatically.'
              : 'No orders were recorded for the selected calendar date.'}
          </p>
        </div>
      )}

    </div>
  );
};
