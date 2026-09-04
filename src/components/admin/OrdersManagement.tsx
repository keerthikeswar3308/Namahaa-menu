'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, OrderStatus, DailyOrderSummary, MenuItem } from '@/types';
import { OrderStore } from '@/lib/orderStore';
import {
  Bell,
  Clock,
  CheckCircle2,
  CheckCircle,
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
  MoreVertical,
  Eye,
  Tag,
  Layers,
  MoveRight,
  Edit3,
  RotateCcw,
  FileText,
  PlusCircle,
  Percent,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Minus,
  Plus,
} from 'lucide-react';

import { ThermalPrinterModal } from './ThermalPrinterModal';

export const OrdersManagement: React.FC = () => {
  const [printModalState, setPrintModalState] = useState<{ order: Order; type: 'kot' | 'bill' } | null>(null);
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
  const [printedCounts, setPrintedCounts] = useState<Record<string, number>>({});

  // Three-Dot Menu & Modal States
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [discountModalOrder, setDiscountModalOrder] = useState<Order | null>(null);
  const [mergeModalOrder, setMergeModalOrder] = useState<Order | null>(null);
  const [changeTableModalOrder, setChangeTableModalOrder] = useState<Order | null>(null);
  const [addItemsModalOrder, setAddItemsModalOrder] = useState<Order | null>(null);
  const [noteModalOrder, setNoteModalOrder] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);

  // Discount Modal Inputs
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'round_off'>('percentage');
  const [discountValueInput, setDiscountValueInput] = useState<string>('10');
  const [discountActionError, setDiscountActionError] = useState<string | null>(null);
  const [isSubmittingDiscount, setIsSubmittingDiscount] = useState<boolean>(false);

  // Merge Orders Inputs
  const [selectedSecondaryOrders, setSelectedSecondaryOrders] = useState<Order[]>([]);
  const [mergeSearchQuery, setMergeSearchQuery] = useState<string>('');
  const [isSubmittingMerge, setIsSubmittingMerge] = useState<boolean>(false);
  const [mergeActionError, setMergeActionError] = useState<string | null>(null);

  // Change Table Inputs
  const [newTableInput, setNewTableInput] = useState<string>('');
  const [isSubmittingTable, setIsSubmittingTable] = useState<boolean>(false);

  // Add Items Modal State
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [addItemsSearch, setAddItemsSearch] = useState<string>('');
  const [selectedNewItems, setSelectedNewItems] = useState<Record<string, { item: MenuItem; quantity: number; notes: string }>>({});
  const [isSubmittingAddItems, setIsSubmittingAddItems] = useState<boolean>(false);

  // Note Modal State
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  const isTodaySelected = selectedDateStr === todayIST;

  // Auto-dismiss three-dot menu on outside click or Escape key
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuOrderId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuOrderId(null);
        setViewingOrder(null);
        setDiscountModalOrder(null);
        setMergeModalOrder(null);
        setChangeTableModalOrder(null);
        setAddItemsModalOrder(null);
        setNoteModalOrder(null);
        setCancelModalOrder(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch Available Menu Items for Add Items modal
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.menuItems)) {
            setAvailableMenuItems(json.menuItems);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch menu items:', err);
      }
    };
    fetchMenu();
  }, []);

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

      if (dateStr === todayIST) {
        const pendingCount = data.orders.filter((o) => o.orderStatus === 'pending').length;
        if (pendingCount > lastOrderCount && lastOrderCount !== 0) {
          playChime();
        }
        setLastOrderCount(pendingCount);
      }
    } catch (err: any) {
      console.error('Error fetching date orders:', err);
      setLoadError('Failed to load orders. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDateOrders(selectedDateStr);
  }, [selectedDateStr]);

  useEffect(() => {
    if (!isTodaySelected) return;

    const unsubscribe = OrderStore.subscribeToLiveOrders(() => {
      loadDateOrders(todayIST);
    });

    const interval = setInterval(() => {
      loadDateOrders(todayIST);
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [selectedDateStr, todayIST, isTodaySelected]);

  const handleDateChange = (daysDelta: number) => {
    const current = new Date(`${selectedDateStr}T00:00:00+05:30`);
    current.setDate(current.getDate() + daysDelta);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
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
        loadDateOrders(selectedDateStr);
      } else {
        alert(`Failed to update order status to ${status}. Please try again.`);
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

  // KOT Printing (Incremental for new items)
  const handlePrintKot = (order: Order) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups to print KOT tickets.');
      return;
    }

    const prevCount = printedCounts[order.id] || 0;
    const isIncremental = prevCount > 0 && order.items.length > prevCount;
    const itemsToPrint = isIncremental ? order.items.slice(prevCount) : order.items;

    const itemsHtml = itemsToPrint
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
    const kotTitle = isIncremental ? '*** KITCHEN ORDER TICKET (ADDITIONAL ITEMS) ***' : '*** KITCHEN ORDER TICKET (KOT) ***';

    printWindow.document.write(`
      <html>
        <head>
          <title></title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #000; margin: 0; padding: 10px; width: 280px; }
            .center { text-align: center; }
            .divider { border-top: 2px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div style="font-size: 15px; line-height: 1.5;">
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
        </body>
      </html>
    `);
    printWindow.document.close();
    setPrintedCounts((prev) => ({ ...prev, [order.id]: order.items.length }));
  };

  // Explicit Reprint KOT (All items)
  const handleReprintKot = (order: Order) => {
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
          <title></title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #000; margin: 0; padding: 10px; width: 280px; }
            .center { text-align: center; }
            .divider { border-top: 2px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div style="font-size: 15px; line-height: 1.5;">
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
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Customer Bill Printing (Subtotal, Discount/Adjustment, Final Total)
  const handlePrintBill = (order: Order) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=480,height=650');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups to print customer bills.');
      return;
    }

    const subtotal = order.subtotalAmount || order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const discountAmount = order.discountAmount || 0;

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
          <title></title>
          <style>
            @page { size: auto; margin: 0mm; }
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
          <div class="divider"></div>
          <div style="font-size: 12px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;"><span>SUBTOTAL:</span> <span>₹${subtotal.toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div style="display: flex; justify-content: space-between; font-weight: bold; color: #b45309;"><span>DISCOUNT / ADJUSTMENT:</span> <span>-₹${discountAmount.toFixed(2)}</span></div>` : ''}
          </div>
          <div class="double-divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold;">
            <span>FINAL AMOUNT:</span>
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

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Exclude secondary merged orders from active list
      if (o.orderStatus === 'merged') return false;

      if (activeStatusFilter === 'active' && (o.orderStatus === 'completed' || o.orderStatus === 'cancelled')) return false;
      if (activeStatusFilter === 'completed' && o.orderStatus !== 'completed') return false;
      if (activeStatusFilter === 'cancelled' && o.orderStatus !== 'cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = o.orderNumber.toLowerCase().includes(q);
        const matchesTable = `table ${o.tableNumber}`.includes(q) || `${o.tableNumber}` === q;
        const matchesCustomer = (o.customerName || '').toLowerCase().includes(q);
        const matchesItems = o.items.some((i) => i.name.toLowerCase().includes(q));
        return matchesNumber || matchesTable || matchesCustomer || matchesItems;
      }

      return true;
    });
  }, [orders, activeStatusFilter, searchQuery]);

  // Open Orders eligible for merging
  const eligibleMergeOrders = useMemo(() => {
    if (!mergeModalOrder) return [];
    return orders.filter(
      (o) =>
        o.id !== mergeModalOrder.id &&
        o.orderStatus !== 'completed' &&
        o.orderStatus !== 'cancelled' &&
        o.orderStatus !== 'merged' &&
        (mergeSearchQuery.trim() === '' ||
          o.orderNumber.toLowerCase().includes(mergeSearchQuery.toLowerCase()) ||
          `${o.tableNumber}` === mergeSearchQuery.trim())
    );
  }, [orders, mergeModalOrder, mergeSearchQuery]);

  // Helper for Discount Calculation Preview
  const discountPreview = useMemo(() => {
    if (!discountModalOrder) return { subtotal: 0, discount: 0, final: 0, isValid: true, error: null };
    const items = discountModalOrder.items || [];
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const val = parseFloat(discountValueInput) || 0;

    let discount = 0;
    let error: string | null = null;

    if (isNaN(val) || val < 0) {
      error = 'Discount value cannot be negative or invalid.';
    } else if (discountType === 'percentage') {
      if (val > 100) error = 'Percentage discount cannot exceed 100%.';
      else discount = (subtotal * val) / 100;
    } else if (discountType === 'fixed') {
      if (val > subtotal) error = 'Discount cannot be greater than the order subtotal.';
      else discount = val;
    } else if (discountType === 'round_off') {
      const targetFinal = Math.max(0, val);
      discount = subtotal - targetFinal;
    }

    const final = Math.max(0, subtotal - discount);
    return {
      subtotal,
      discount: Math.round(discount * 100) / 100,
      final: Math.round(final * 100) / 100,
      isValid: !error,
      error,
    };
  }, [discountModalOrder, discountType, discountValueInput]);

  // Handle Submit Discount
  const handleApplyDiscountSubmit = async () => {
    if (!discountModalOrder || !discountPreview.isValid) return;
    setIsSubmittingDiscount(true);
    setDiscountActionError(null);

    try {
      const res = await OrderStore.executeAdminOrderAction({
        action: 'apply_discount',
        orderId: discountModalOrder.id,
        discountType,
        discountValue: parseFloat(discountValueInput) || 0,
      });

      if (res.success) {
        setDiscountModalOrder(null);
        loadDateOrders(selectedDateStr);
      } else {
        setDiscountActionError(res.error || 'Failed to apply discount');
      }
    } catch (err: any) {
      setDiscountActionError(err.message || 'Error applying discount');
    } finally {
      setIsSubmittingDiscount(false);
    }
  };

  // Handle Submit Merge
  const handleMergeSubmit = async () => {
    if (!mergeModalOrder || selectedSecondaryOrders.length === 0) return;
    setIsSubmittingMerge(true);
    setMergeActionError(null);

    try {
      const res = await OrderStore.executeAdminOrderAction({
        action: 'merge_orders',
        orderId: mergeModalOrder.id,
        secondaryOrderIds: selectedSecondaryOrders.map((o) => o.id),
      });

      if (res.success) {
        setMergeModalOrder(null);
        setSelectedSecondaryOrders([]);
        loadDateOrders(selectedDateStr);
      } else {
        setMergeActionError(res.error || 'Failed to merge orders');
      }
    } catch (err: any) {
      setMergeActionError(err.message || 'Error merging orders');
    } finally {
      setIsSubmittingMerge(false);
    }
  };

  // Handle Change Table Submit
  const handleChangeTableSubmit = async () => {
    if (!changeTableModalOrder || !newTableInput) return;
    setIsSubmittingTable(true);

    try {
      const res = await OrderStore.executeAdminOrderAction({
        action: 'change_table',
        orderId: changeTableModalOrder.id,
        newTableNumber: parseInt(newTableInput, 10),
      });

      if (res.success) {
        setChangeTableModalOrder(null);
        loadDateOrders(selectedDateStr);
      } else {
        alert(res.error || 'Failed to change table number');
      }
    } catch (err: any) {
      alert(err.message || 'Error changing table number');
    } finally {
      setIsSubmittingTable(false);
    }
  };

  // Handle Add Items Submit
  const handleAddItemsSubmit = async () => {
    if (!addItemsModalOrder) return;
    const itemsToAdd = Object.values(selectedNewItems).map((i) => ({
      id: i.item.id,
      name: i.item.name,
      price: i.item.price,
      quantity: i.quantity,
      image: i.item.image,
      isVeg: i.item.isVeg,
      notes: i.notes,
    }));

    if (itemsToAdd.length === 0) return;
    setIsSubmittingAddItems(true);

    try {
      const res = await OrderStore.executeAdminOrderAction({
        action: 'add_items',
        orderId: addItemsModalOrder.id,
        newItems: itemsToAdd,
      });

      if (res.success) {
        setAddItemsModalOrder(null);
        setSelectedNewItems({});
        loadDateOrders(selectedDateStr);
      } else {
        alert(res.error || 'Failed to add items to order');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding items to order');
    } finally {
      setIsSubmittingAddItems(false);
    }
  };

  // Handle Note Submit
  const handleNoteSubmit = async () => {
    if (!noteModalOrder) return;
    setIsSubmittingNote(true);

    try {
      const res = await OrderStore.executeAdminOrderAction({
        action: 'update_notes',
        orderId: noteModalOrder.id,
        notes: noteInput,
      });

      if (res.success) {
        setNoteModalOrder(null);
        loadDateOrders(selectedDateStr);
      } else {
        alert(res.error || 'Failed to update order notes');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating order notes');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> NEW
          </span>
        );
      case 'accepted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5" /> ACCEPTED
          </span>
        );
      case 'preparing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5 animate-spin" /> PREPARING
          </span>
        );
      case 'ready':
      case 'served':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> READY
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      case 'merged':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> MERGED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-namaha-green-deep p-6 rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-namaha-green-deep dark:text-white">
              LIVE ORDERS MANAGEMENT
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-namaha-gold text-xs font-extrabold border border-amber-500/30">
              IST LIVE
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 font-medium">
            Manage current business day active kitchen tickets, billing, discounts, and order updates.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Date Picker Controls */}
          <div className="flex items-center gap-2 bg-emerald-950/5 dark:bg-black/40 p-1.5 rounded-2xl border border-emerald-950/10 dark:border-namaha-gold/20">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2 text-xs font-bold text-slate-800 dark:text-white">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>{isTodaySelected ? `TODAY (${formattedDate || todayIST})` : formattedDate}</span>
            </div>

            <button
              onClick={() => handleDateChange(1)}
              disabled={isTodaySelected}
              className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 transition disabled:opacity-30"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition ${
              soundEnabled
                ? 'bg-amber-500/10 text-amber-600 dark:text-namaha-gold border-amber-500/30'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
            }`}
            title={soundEnabled ? 'Chime sound active' : 'Chime sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => loadDateOrders(selectedDateStr)}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            title="Refresh Live Orders"
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
            { id: 'all', label: `ALL (${orders.filter((o) => o.orderStatus !== 'merged').length})` },
            { id: 'active', label: `ACTIVE ORDERS (${summary.activeCount})` },
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
          {filteredOrders.map((order) => {
            const isClosed = order.orderStatus === 'completed' || order.orderStatus === 'cancelled' || order.orderStatus === 'merged';

            return (
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

                    <div className="flex items-center gap-2 relative">
                      {getStatusBadge(order.orderStatus)}

                      {/* THREE-DOT BUTTON (⋮) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuOrderId(activeMenuOrderId === order.id ? null : order.id);
                          }}
                          className="px-2.5 py-0.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-extrabold text-base transition shadow-sm active:scale-95 flex items-center justify-center"
                          title="Order Actions"
                          aria-label="Order Actions Menu"
                        >
                          ⋮
                        </button>


                        {/* THREE-DOT MENU DROPDOWN */}
                        {activeMenuOrderId === order.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 w-56 bg-slate-900 border border-namaha-gold/30 rounded-2xl shadow-2xl z-50 py-2 text-xs divide-y divide-white/10 animate-fade-in"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setActiveMenuOrderId(null);
                                  setViewingOrder(order);
                                }}
                                className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                              >
                                <Eye className="w-4 h-4 text-amber-400" />
                                <span>View Order Details</span>
                              </button>


                              {!isClosed && (
                                <button
                                  onClick={() => {
                                    setActiveMenuOrderId(null);
                                    setDiscountModalOrder(order);
                                    setDiscountType('percentage');
                                    setDiscountValueInput('10');
                                    setDiscountActionError(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                                >
                                  <Tag className="w-4 h-4 text-amber-400" />
                                  <span>Apply Discount</span>
                                </button>
                              )}

                              {!isClosed && (
                                <button
                                  onClick={() => {
                                    setActiveMenuOrderId(null);
                                    setMergeModalOrder(order);
                                    setSelectedSecondaryOrders([]);
                                    setMergeActionError(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                                >
                                  <Layers className="w-4 h-4 text-purple-400" />
                                  <span>Merge Order</span>
                                </button>
                              )}

                              {!isClosed && (
                                <button
                                  onClick={() => {
                                    setActiveMenuOrderId(null);
                                    setChangeTableModalOrder(order);
                                    setNewTableInput(`${order.tableNumber}`);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                                >
                                  <MoveRight className="w-4 h-4 text-blue-400" />
                                  <span>Change Table</span>
                                </button>
                              )}

                              {!isClosed && (
                                <button
                                  onClick={() => {
                                    setActiveMenuOrderId(null);
                                    setNoteModalOrder(order);
                                    setNoteInput(order.notes || '');
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                                >
                                  <Edit3 className="w-4 h-4 text-teal-400" />
                                  <span>Add/Edit Note</span>
                                </button>
                              )}
                            </div>

                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setActiveMenuOrderId(null);
                                  handlePrintKot(order);
                                }}
                                className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                              >
                                <Printer className="w-4 h-4 text-amber-400" />
                                <span>Print KOT</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuOrderId(null);
                                  handleReprintKot(order);
                                }}
                                className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                              >
                                <RotateCcw className="w-4 h-4 text-amber-500" />
                                <span>Reprint KOT</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuOrderId(null);
                                  handlePrintBill(order);
                                }}
                                className="w-full px-4 py-2 text-left text-gray-200 hover:bg-namaha-gold/20 hover:text-namaha-gold flex items-center gap-2 font-medium"
                              >
                                <FileText className="w-4 h-4 text-purple-400" />
                                <span>Print Bill</span>
                              </button>
                            </div>

                            {!isClosed && (
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveMenuOrderId(null);
                                    setCancelModalOrder(order);
                                  }}
                                  className="w-full px-4 py-2 text-left text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-2 font-bold"
                                >
                                  <XCircle className="w-4 h-4 text-rose-400" />
                                  <span>Cancel Order</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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

                  {/* Merged Info Badge */}
                  {order.mergedFromOrderNumbers && order.mergedFromOrderNumbers.length > 0 && (
                    <div className="mb-3 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Merged from: {order.mergedFromOrderNumbers.join(', ')}</span>
                    </div>
                  )}

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
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase block">ORDER VALUE</span>
                      {order.discountAmount && order.discountAmount > 0 ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          Subtotal ₹{(order.subtotalAmount || order.totalAmount + order.discountAmount).toFixed(0)} • Disc -₹{order.discountAmount.toFixed(0)}
                        </span>
                      ) : null}
                    </div>
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

                  {/* Status Action Buttons (COMPLETE & CANCEL ONLY) */}
                  {!isClosed && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                        disabled={processingOrderIds.has(order.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>COMPLETE</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                        disabled={processingOrderIds.has(order.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>CANCEL</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

      {/* ======================================================== */}
      {/* MODAL 1: VIEW ORDER DETAILS                              */}
      {/* ======================================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">ORDER DETAILS</span>
                <h3 className="text-xl font-serif font-bold text-white">{viewingOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-black/40 p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-gray-400 block">Table Number:</span>
                <span className="font-bold text-amber-400 text-sm">Table #{viewingOrder.tableNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Current Status:</span>
                <div>{getStatusBadge(viewingOrder.orderStatus)}</div>
              </div>
              <div>
                <span className="text-gray-400 block">Created Time:</span>
                <span className="font-semibold text-gray-200">
                  {new Date(viewingOrder.createdAt).toLocaleDateString()} {new Date(viewingOrder.createdAt).toLocaleTimeString()}
                </span>
              </div>
              {viewingOrder.customerName && (
                <div>
                  <span className="text-gray-400 block">Customer Name:</span>
                  <span className="font-semibold text-gray-200">{viewingOrder.customerName}</span>
                </div>
              )}
            </div>

            {viewingOrder.mergedFromOrderNumbers && viewingOrder.mergedFromOrderNumbers.length > 0 && (
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Merged orders included: {viewingOrder.mergedFromOrderNumbers.join(', ')}</span>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h4 className="text-xs uppercase font-extrabold text-namaha-gold mb-2">Order Items</h4>
              <div className="space-y-2 bg-black/30 p-3 rounded-2xl border border-white/10">
                {viewingOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{item.quantity}× {item.name}</span>
                      <span className="text-gray-400 text-[10px] block">₹{item.price.toFixed(2)} / unit</span>
                    </div>
                    <span className="font-bold text-amber-300">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Breakdown */}
            <div className="space-y-1.5 text-xs border-t border-b border-white/10 py-3">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal Amount:</span>
                <span className="font-semibold">₹{(viewingOrder.subtotalAmount || viewingOrder.totalAmount + (viewingOrder.discountAmount || 0)).toFixed(2)}</span>
              </div>
              {viewingOrder.discountAmount && viewingOrder.discountAmount > 0 ? (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Discount ({viewingOrder.discountType}):</span>
                  <span>-₹{viewingOrder.discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold text-namaha-gold pt-1">
                <span>Final Total Amount:</span>
                <span>₹{viewingOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {viewingOrder.notes && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <strong>Kitchen Notes:</strong> &quot;{viewingOrder.notes}&quot;
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handlePrintKot(viewingOrder)}
                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print KOT
              </button>
              <button
                onClick={() => handlePrintBill(viewingOrder)}
                className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 transition flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Print Bill
              </button>
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: APPLY DISCOUNT                                  */}
      {/* ======================================================== */}
      {discountModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">ORDER MANAGEMENT</span>
                <h3 className="text-xl font-serif font-bold text-white">APPLY DISCOUNT</h3>
              </div>
              <button
                onClick={() => setDiscountModalOrder(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 block">Current Order Subtotal</span>
                <span className="text-xl font-bold text-white">{discountModalOrder.orderNumber} (Table #{discountModalOrder.tableNumber})</span>
              </div>
              <span className="text-2xl font-extrabold text-namaha-gold">₹{discountPreview.subtotal.toFixed(2)}</span>
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1 ${
                  discountType === 'percentage'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Percent className="w-3.5 h-3.5" /> Percentage %
              </button>

              <button
                onClick={() => setDiscountType('fixed')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1 ${
                  discountType === 'fixed'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Fixed Amount ₹
              </button>

              <button
                onClick={() => {
                  setDiscountType('round_off');
                  setDiscountValueInput(`${Math.round(discountPreview.subtotal / 5) * 5}`);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1 ${
                  discountType === 'round_off'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Round Off
              </button>
            </div>

            {/* Input Value */}
            <div>
              <label className="text-xs text-gray-300 font-bold block mb-1.5">
                {discountType === 'percentage'
                  ? 'Discount Percentage (%)'
                  : discountType === 'fixed'
                  ? 'Fixed Discount Amount (₹)'
                  : 'Target Round-Off Final Amount (₹)'}
              </label>
              <input
                type="number"
                value={discountValueInput}
                onChange={(e) => setDiscountValueInput(e.target.value)}
                placeholder="Enter value..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-namaha-gold/40 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Quick Round Off Buttons */}
            {discountType === 'round_off' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold">Quick Targets:</span>
                {[
                  Math.floor(discountPreview.subtotal / 5) * 5,
                  Math.ceil(discountPreview.subtotal / 5) * 5,
                  Math.floor(discountPreview.subtotal / 10) * 10,
                  Math.ceil(discountPreview.subtotal / 10) * 10,
                ].map((targetVal, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDiscountValueInput(`${targetVal}`)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition"
                  >
                    ₹{targetVal}
                  </button>
                ))}
              </div>
            )}

            {/* Validation Error */}
            {discountPreview.error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{discountPreview.error}</span>
              </div>
            )}

            {/* Server Action Error */}
            {discountActionError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-bold">
                {discountActionError}
              </div>
            )}

            {/* Real-time Calculation Summary */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal Order Value:</span>
                <span>₹{discountPreview.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold">
                <span>Discount / Adjustment:</span>
                <span>-₹{discountPreview.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-namaha-gold pt-1 border-t border-white/10">
                <span>Final Payable Amount:</span>
                <span>₹{discountPreview.final.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDiscountModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleApplyDiscountSubmit}
                disabled={!discountPreview.isValid || isSubmittingDiscount}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingDiscount ? 'APPLYING...' : 'APPLY DISCOUNT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: MULTI-ORDER MERGE MODAL                         */}
      {/* ======================================================== */}
      {mergeModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-xl w-full text-white shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold text-[10px] font-extrabold uppercase tracking-wider">
                    PRIMARY ORDER #{mergeModalOrder.orderNumber} (Table #{mergeModalOrder.tableNumber})
                  </span>
                  <span className="text-xs font-bold text-gray-400">₹{mergeModalOrder.totalAmount.toFixed(2)}</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span>MERGE MULTIPLE ORDERS</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setMergeModalOrder(null);
                  setSelectedSecondaryOrders([]);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Selection Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-black/30 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1-Click Select All Same Table */}
                <button
                  type="button"
                  onClick={() => {
                    const sameTableOrders = eligibleMergeOrders.filter(o => o.tableNumber === mergeModalOrder.tableNumber);
                    setSelectedSecondaryOrders(sameTableOrders);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition flex items-center gap-1"
                >
                  ⚡ Select All Table #{mergeModalOrder.tableNumber}
                </button>

                {/* Select All */}
                <button
                  type="button"
                  onClick={() => setSelectedSecondaryOrders(eligibleMergeOrders)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition"
                >
                  Select All ({eligibleMergeOrders.length})
                </button>

                {/* Clear */}
                {selectedSecondaryOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSecondaryOrders([])}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Counter Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${selectedSecondaryOrders.length > 0 ? 'bg-amber-500 text-namaha-green-deep shadow-md' : 'bg-white/10 text-gray-400'}`}>
                {selectedSecondaryOrders.length} {selectedSecondaryOrders.length === 1 ? 'Order' : 'Orders'} Selected
              </span>
            </div>

            {/* Search Input */}
            <div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search orders to merge by Order # or Table #..."
                  value={mergeSearchQuery}
                  onChange={(e) => setMergeSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Order Checkbox Selection List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {eligibleMergeOrders.length > 0 ? (
                eligibleMergeOrders.map((ord) => {
                  const isSelected = selectedSecondaryOrders.some(s => s.id === ord.id);
                  const isDifferentTable = ord.tableNumber !== mergeModalOrder.tableNumber;

                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSecondaryOrders(selectedSecondaryOrders.filter(s => s.id !== ord.id));
                        } else {
                          setSelectedSecondaryOrders([...selectedSecondaryOrders, ord]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg'
                          : 'bg-black/30 border-white/10 hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition ${
                          isSelected ? 'bg-amber-500 border-amber-400 text-namaha-green-deep' : 'border-white/30 bg-black/40'
                        }`}>
                          {isSelected && <CheckCircle className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">Order #{ord.orderNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex-shrink-0 ${isDifferentTable ? 'bg-amber-500/30 text-amber-300' : 'bg-namaha-gold/20 text-namaha-gold'}`}>
                              Table #{ord.tableNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block truncate">
                            {ord.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-extrabold text-white block">₹{ord.totalAmount.toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400">{ord.items.length} items</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-6">No eligible open orders found to merge.</p>
              )}
            </div>

            {/* Cross-Table Notice */}
            {selectedSecondaryOrders.some(o => o.tableNumber !== mergeModalOrder.tableNumber) && (
              <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-xs text-amber-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>
                  Notice: Selected orders belong to different tables ({Array.from(new Set(selectedSecondaryOrders.map(o => `Table #${o.tableNumber}`))).join(', ')}). Merging will combine all items under Primary Order #{mergeModalOrder.orderNumber} on Table #{mergeModalOrder.tableNumber}.
                </span>
              </div>
            )}

            {/* Live Combined Merge Preview */}
            {selectedSecondaryOrders.length > 0 && (
              <div className="bg-black/60 p-4 rounded-2xl border border-purple-500/40 shadow-xl space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-purple-400 block tracking-wider">COMBINED MERGE PREVIEW</span>
                    <span className="text-xs font-bold text-white">
                      Primary #{mergeModalOrder.orderNumber} + {selectedSecondaryOrders.map(o => `#${o.orderNumber}`).join(' + ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-bold">TOTAL COMBINED BILL</span>
                    <span className="text-lg font-extrabold text-amber-400">
                      ₹{(mergeModalOrder.totalAmount + selectedSecondaryOrders.reduce((sum, o) => sum + o.totalAmount, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-300 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  <span className="font-bold text-gray-400 block text-[11px]">
                    All Combined Items ({mergeModalOrder.items.length + selectedSecondaryOrders.reduce((sum, o) => sum + o.items.length, 0)} items):
                  </span>
                  {[...mergeModalOrder.items, ...selectedSecondaryOrders.flatMap(o => o.items)].map((i, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] py-0.5 border-b border-white/5">
                      <span className="text-gray-200">{i.quantity}× {i.name}</span>
                      <span className="font-semibold text-white">₹{(i.price * i.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mergeActionError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-bold">
                {mergeActionError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMergeModalOrder(null);
                  setSelectedSecondaryOrders([]);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleMergeSubmit}
                disabled={selectedSecondaryOrders.length === 0 || isSubmittingMerge}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-40 flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>
                  {isSubmittingMerge
                    ? 'MERGING ORDERS...'
                    : selectedSecondaryOrders.length === 0
                    ? 'SELECT ORDERS TO MERGE'
                    : `MERGE ${selectedSecondaryOrders.length} ${selectedSecondaryOrders.length === 1 ? 'ORDER' : 'ORDERS'} NOW (₹${(mergeModalOrder.totalAmount + selectedSecondaryOrders.reduce((sum, o) => sum + o.totalAmount, 0)).toFixed(2)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CHANGE TABLE                                   */}
      {/* ======================================================== */}
      {changeTableModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">CHANGE TABLE NUMBER</span>
                <h3 className="text-xl font-serif font-bold text-white">{changeTableModalOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setChangeTableModalOrder(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-300">
              Current Table: <strong className="text-amber-400 text-sm">Table #{changeTableModalOrder.tableNumber}</strong>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-bold block mb-1.5">New Table Number:</label>
              <input
                type="number"
                value={newTableInput}
                onChange={(e) => setNewTableInput(e.target.value)}
                placeholder="Enter new table #..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-namaha-gold/40 text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Quick Table Selection Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((tNum) => (
                <button
                  key={tNum}
                  type="button"
                  onClick={() => setNewTableInput(`${tNum}`)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition ${
                    newTableInput === `${tNum}`
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Table #{tNum}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-300">
              Confirm moving Order <strong className="text-white">{changeTableModalOrder.orderNumber}</strong> from Table #{changeTableModalOrder.tableNumber} → Table #{newTableInput || '?'}.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setChangeTableModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleChangeTableSubmit}
                disabled={!newTableInput || isSubmittingTable}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
              >
                {isSubmittingTable ? 'MOVING...' : 'MOVE ORDER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: ADD ITEMS TO ORDER                              */}
      {/* ======================================================== */}
      {addItemsModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-xl w-full text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">ADD ITEMS TO ORDER</span>
                <h3 className="text-xl font-serif font-bold text-white">{addItemsModalOrder.orderNumber} (Table #{addItemsModalOrder.tableNumber})</h3>
              </div>
              <button
                onClick={() => setAddItemsModalOrder(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={addItemsSearch}
                onChange={(e) => setAddItemsSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Available Menu Items List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableMenuItems
                .filter((item) => addItemsSearch.trim() === '' || item.name.toLowerCase().includes(addItemsSearch.toLowerCase()))
                .map((item) => {
                  const currentQty = selectedNewItems[item.id]?.quantity || 0;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{item.name}</span>
                        <span className="text-amber-400 font-semibold">₹{item.price.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentQty > 0 ? (
                          <div className="flex items-center gap-2 bg-amber-500/20 px-2 py-1 rounded-xl border border-amber-500/30">
                            <button
                              type="button"
                              onClick={() => {
                                if (currentQty === 1) {
                                  const copy = { ...selectedNewItems };
                                  delete copy[item.id];
                                  setSelectedNewItems(copy);
                                } else {
                                  setSelectedNewItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], quantity: currentQty - 1 },
                                  }));
                                }
                              }}
                              className="p-1 rounded bg-amber-500/30 text-amber-300 hover:bg-amber-500/50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="font-bold text-amber-300 text-xs">{currentQty}</span>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNewItems((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], quantity: currentQty + 1 },
                                }));
                              }}
                              className="p-1 rounded bg-amber-500/30 text-amber-300 hover:bg-amber-500/50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNewItems((prev) => ({
                                ...prev,
                                [item.id]: { item, quantity: 1, notes: '' },
                              }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Selected Items Preview */}
            {Object.keys(selectedNewItems).length > 0 && (
              <div className="bg-black/50 p-4 rounded-2xl border border-namaha-gold/30 space-y-2">
                <span className="text-[10px] uppercase font-extrabold text-namaha-gold block">ITEMS TO BE ADDED TO KITCHEN</span>
                {Object.values(selectedNewItems).map((i) => (
                  <div key={i.item.id} className="flex justify-between items-center text-xs font-bold text-gray-200">
                    <span>{i.quantity}× {i.item.name}</span>
                    <span className="text-amber-400">₹{(i.item.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddItemsModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleAddItemsSubmit}
                disabled={Object.keys(selectedNewItems).length === 0 || isSubmittingAddItems}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
              >
                {isSubmittingAddItems ? 'ADDING...' : 'ADD ITEMS TO ORDER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: ADD/EDIT NOTE                                   */}
      {/* ======================================================== */}
      {noteModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-namaha-gold/30 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">KITCHEN & CUSTOMER NOTE</span>
                <h3 className="text-xl font-serif font-bold text-white">{noteModalOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setNoteModalOrder(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-bold block mb-1.5">Special Instructions / Kitchen Notes:</label>
              <textarea
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Less spicy, extra chutney, pack separately..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-namaha-gold/40 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoteModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleNoteSubmit}
                disabled={isSubmittingNote}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
              >
                {isSubmittingNote ? 'SAVING...' : 'SAVE NOTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: CANCEL ORDER CONFIRMATION                        */}
      {/* ======================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl space-y-5 text-center">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />

            <div>
              <h3 className="text-xl font-serif font-bold text-white mb-1">Cancel Order {cancelModalOrder.orderNumber}?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to cancel this order for Table #{cancelModalOrder.tableNumber}? This action will mark the order as CANCELLED and remove it from active Live Orders.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                KEEP ORDER
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = cancelModalOrder.id;
                  setCancelModalOrder(null);
                  handleUpdateStatus(targetId, 'cancelled');
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg transition"
              >
                CANCEL ORDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* THERMAL PRINTER MODAL SLIP                               */}
      {/* ======================================================== */}
      {printModalState && (
        <ThermalPrinterModal
          order={printModalState.order}
          type={printModalState.type}
          onClose={() => setPrintModalState(null)}
        />
      )}
    </div>
  );
};
