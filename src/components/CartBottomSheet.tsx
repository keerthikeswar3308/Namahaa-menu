'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/lib/cartContext';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Heart,
  Utensils,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChefHat,
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Loader2,
  Smartphone,
} from 'lucide-react';

import { getFreshImageUrl } from '@/lib/imageUtils';
import { NamahaStore } from '@/lib/store';
import { OrderStore } from '@/lib/orderStore';
import { getRestaurantBusinessDateStr, parseSafeDate } from '@/lib/businessDay';
import { Order, RestaurantInfo, OrderStatus } from '@/types';


const CartBottomSheetInner: React.FC = () => {
  const {
    cart,
    isCartOpen,
    closeCart,
    addToCart,
    removeFromCart,
    clearCart,
    totalCount,
    toggleWishlist,
    isInWishlist,
    cartViewMode,
    setCartViewMode,
  } = useCart();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(NamahaStore.getRestaurantInfo());

  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Secure Table Session Isolation
  const [sessionId, setSessionId] = useState<string>('');
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Dedicated Order Details View & Success Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [orderSuccessConfirmation, setOrderSuccessConfirmation] = useState<Order | null>(null);

  // Initialize Session ID (Persistent in localStorage across browser restarts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const deviceSessId = NamahaStore.getDeviceSessionId();
      localStorage.setItem('namahaa_session_id', deviceSessId);
      sessionStorage.setItem('namahaa_session_id', deviceSessId);
      setSessionId(deviceSessId);
    }
  }, []);


  useEffect(() => {
    setSelectedTable(NamahaStore.getSelectedTable() || 1);
    setRestaurantInfo(NamahaStore.getRestaurantInfo());

    const handleStoreUpdate = () => {
      setRestaurantInfo(NamahaStore.getRestaurantInfo());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('namahaa_store_updated', handleStoreUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('namahaa_store_updated', handleStoreUpdate);
      }
    };
  }, [isCartOpen]);

  // Load Customer Orders & Subscribe to Realtime Status Updates
  const loadCustomerOrders = async () => {
    if (!sessionId) return;
    const fetched = await OrderStore.fetchCustomerOrders(null, sessionId);
    setCustomerOrders(fetched);
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await loadCustomerOrders();
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    if (sessionId) {
      loadCustomerOrders();

      // Realtime WebSocket channel listener for customer's session
      const unsubscribe = OrderStore.subscribeToCustomerSessionOrders(sessionId, (payload) => {
        if (payload && payload.new) {
          const raw = payload.new;
          const rawIdStr = String(raw.id || `ord_${Date.now()}`);
          const mappedOrder: Order = {
            id: rawIdStr,
            orderNumber: String(raw.order_number || raw.orderNumber || `#ORD-${rawIdStr.slice(-6)}`),
            tableNumber: Number(raw.table_number || raw.tableNumber || selectedTable || 1),
            items: Array.isArray(raw.items) ? raw.items : [],
            totalAmount: Number(raw.total_amount || raw.totalAmount || 0),
            orderStatus: String(raw.order_status || 'pending') as OrderStatus,
            customerName: String(raw.customer_name || ''),
            customerPhone: String(raw.customer_phone || ''),
            notes: String(raw.notes || ''),
            sessionId: String(raw.session_id || sessionId),
            idempotencyKey: String(raw.idempotency_key || ''),
            createdAt: String(raw.created_at || new Date().toISOString()),
            updatedAt: String(raw.updated_at || new Date().toISOString()),
          };

          setCustomerOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === mappedOrder.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = mappedOrder;
              return updated;
            }
            return [mappedOrder, ...prev];
          });
        } else {
          loadCustomerOrders();
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [sessionId, selectedTable]);

  // Lock background scroll when bottom sheet is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const grandTotal = (cart || []).reduce((sum, entry) => {
    if (!entry || !entry.item) return sum;
    const price = Number(entry.item.price || 0);
    const qty = Number(entry.quantity || 1);
    return sum + qty * price;
  }, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (isSubmittingOrder) return;

    if (!selectedTable) {
      setSubmissionError('Please select your table number before sending your order to the kitchen.');
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }

    setIsSubmittingOrder(true);
    setSubmissionError(null);
    setOrderSuccessConfirmation(null);

    const idempotencyKey = `idem_${sessionId}_${selectedTable}_${Date.now()}`;

    const orderItems = cart.map(({ item, quantity }) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      image: item.image,
      isVeg: item.isVeg,
    }));

    try {
      const result = await OrderStore.createOrder({
        tableNumber: selectedTable,
        items: orderItems,
        totalAmount: grandTotal,
        customerName,
        notes: kitchenNotes,
        sessionId,
        idempotencyKey,
      });

      if (result.success && result.order) {
        setPlacedOrder(result.order);
        setCustomerOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== result.order!.id);
          return [result.order!, ...filtered];
        });
        clearCart();
        setIsCheckoutOpen(false);
        setOrderSuccessConfirmation(result.order);

        // Auto-close success popup after brief confirmation (1.4 seconds)
        setTimeout(() => {
          setOrderSuccessConfirmation(null);
          closeCart();
          setCartViewMode('orders');
        }, 1400);
      } else {
        setSubmissionError(result.error || 'Unable to send your order. Please try again.');
      }
    } catch (err: any) {
      console.error('Order creation exception:', err);
      setSubmissionError('Network error placing order. Please check your connection and try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getOrderStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Sent to Kitchen', desc: 'Kitchen is confirming your items...', color: 'text-amber-400', step: 1 };
      case 'accepted':
        return { label: 'Order Accepted', desc: 'Kitchen accepted your order!', color: 'text-blue-400', step: 2 };
      case 'preparing':
        return { label: 'Preparing', desc: 'Chef is cooking your tiffins fresh!', color: 'text-purple-400', step: 2 };
      case 'ready':
      case 'served':
        return { label: 'Ready to Serve', desc: 'Dish is hot and coming to your table!', color: 'text-teal-400', step: 3 };
      case 'completed':
        return { label: 'Completed', desc: 'Enjoyed your tiffin? Visit again!', color: 'text-emerald-400', step: 4 };
      case 'cancelled':
        return { label: 'Cancelled', desc: 'This order was cancelled.', color: 'text-rose-400', step: 0 };
      default:
        return { label: 'Order Placed', desc: 'Processing order...', color: 'text-amber-400', step: 1 };
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
      
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={closeCart} />

      {/* Bottom Sheet Drawer / Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-namaha-green-dark border-t-2 sm:border-2 border-namaha-gold/40 rounded-t-3xl sm:rounded-3xl shadow-2xl text-white max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden z-10 animate-slide-up sm:animate-scale-up">
        
        {/* Full Viewport Centered Overlay when Order is Submitting / Transmitting */}
        {isSubmittingOrder && (
          <div className="fixed inset-0 z-[100] bg-namaha-green-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-5 animate-fade-in my-auto">
            {/* Above Loading: Estimated prep timer & status note */}
            <div className="space-y-2 max-w-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
                <Clock className="w-3.5 h-3.5 text-namaha-gold animate-pulse" />
                <span>Est. Kitchen Prep: ~15–20 Mins</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-white pt-1">
                Sending Order to Kitchen...
              </h3>
              <p className="text-xs text-emerald-300 font-semibold leading-relaxed">
                Transmitting table items directly to kitchen display
              </p>
            </div>

            {/* Center Loading Spinner & Utensils Icon */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-20 h-20 rounded-full border-4 border-namaha-gold/20 border-t-namaha-gold animate-spin" />
              <div className="absolute p-3.5 rounded-full bg-namaha-gold/15 text-namaha-gold">
                <Utensils className="w-7 h-7 animate-bounce" />
              </div>
            </div>

            {/* Below Loading: Keep screen active note */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-amber-300 text-xs font-semibold max-w-xs space-y-1 shadow-xl">
              <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 animate-pulse" />
                <span>Please Keep Screen Active</span>
              </div>
              <p className="text-[11px] text-gray-300 font-normal leading-normal">
                Do not turn off your screen or navigate away until order transmission completes.
              </p>
            </div>
          </div>
        )}

        {/* Full Viewport Centered Overlay when Order is Successfully Sent */}
        {orderSuccessConfirmation && !isSubmittingOrder && (
          <div className="fixed inset-0 z-[100] bg-namaha-green-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center shadow-lg flex-shrink-0">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <div className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest">SUCCESS</div>
              <h3 className="text-xl font-serif font-bold text-white">ORDER SENT TO KITCHEN!</h3>
            </div>

            <div className="w-full max-w-xs bg-black/60 p-4 rounded-2xl border border-namaha-gold/30 text-xs space-y-1.5 text-left shadow-lg">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white text-sm">{orderSuccessConfirmation.orderNumber}</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-namaha-gold/20 text-namaha-gold font-extrabold text-[11px]">Table #{orderSuccessConfirmation.tableNumber}</span>
              </div>
              <div className="text-[11px] text-emerald-300 font-semibold">Kitchen received your items for preparation</div>
            </div>

            <div className="w-full max-w-xs bg-black/40 p-3.5 rounded-2xl border border-white/10 text-xs text-left max-h-36 overflow-y-auto space-y-1">
              <span className="text-[10px] font-extrabold text-namaha-gold uppercase block mb-1">Items Sent to Kitchen:</span>
              {orderSuccessConfirmation.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-300">
                  <span>{item.quantity}× {item.name}</span>
                  <span className="font-semibold text-namaha-gold">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setOrderSuccessConfirmation(null);
                  closeCart();
                }}
                className="px-4 py-2.5 rounded-2xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-md hover:bg-amber-400 transition"
              >
                + ADD MORE ITEMS
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderSuccessConfirmation(null);
                  setCartViewMode('orders');
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs border border-white/10 transition"
              >
                TODAY&apos;S ITEMS
              </button>
            </div>
          </div>
        )}

        {/* Header */}

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-namaha-green-deep">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-namaha-gold/20 text-namaha-gold">
              {cartViewMode === 'orders' ? <ClipboardList className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-namaha-gold">
                {cartViewMode === 'orders' ? 'Items Added Today' : 'Your Table Cart'}
              </h2>
              {selectedTable && (
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Utensils className="w-3 h-3" />
                  <span>Table #{selectedTable} active</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggles */}
            {customerOrders.length > 0 && cartViewMode === 'cart' && (
              <button
                onClick={() => setCartViewMode('orders')}
                className="px-3 py-1.5 rounded-xl border border-namaha-gold/30 bg-namaha-gold/10 text-namaha-gold text-[10px] font-extrabold tracking-wider uppercase hover:bg-namaha-gold/20 transition"
              >
                Today&apos;s Items ({customerOrders.length})
              </button>
            )}
            {cartViewMode === 'orders' && cart.length > 0 && (
              <button
                onClick={() => setCartViewMode('cart')}
                className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-extrabold tracking-wider uppercase hover:bg-emerald-500/20 transition"
              >
                View Cart ({cart.length})
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Switching rendering logic */}
        {cartViewMode === 'orders' ? (
          /* ======================================================== */
          /* 1. CUSTOMER ITEMS ADDED TODAY VIEW MODE                  */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-namaha-gold block">
                  Your Today&apos;s Orders & Dishes
                </span>
                <span className="text-[10px] text-gray-400 font-medium block">
                  All active items ordered from this device today
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                className="flex items-center gap-1.5 text-[11px] text-namaha-gold font-bold hover:underline active:scale-95 transition disabled:opacity-70"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                <span>{isManualRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {customerOrders.length > 0 ? (
              (() => {
                const todayBusinessDayStr = getRestaurantBusinessDateStr(new Date());

                // Filter orders belonging to today's business day
                const todayOrders = (customerOrders || []).filter((o) => {
                  if (!o || !o.createdAt) return false;
                  return getRestaurantBusinessDateStr(parseSafeDate(o.createdAt)) === todayBusinessDayStr && o.orderStatus !== 'cancelled';
                });

                // Aggregate items added today
                const itemsAddedTodayMap = new Map<string, { id: string; name: string; price: number; quantity: number; image?: string }>();
                let totalTodayAmount = 0;
                let totalTodayUnits = 0;

                todayOrders.forEach((ord) => {
                  if (!ord) return;
                  totalTodayAmount += Number(ord.totalAmount || 0);
                  (ord.items || []).forEach((item: any) => {
                    if (!item) return;
                    const key = String(item.id || item.name || 'item');
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.price || 0);
                    totalTodayUnits += qty;

                    if (!itemsAddedTodayMap.has(key)) {
                      itemsAddedTodayMap.set(key, {
                        id: key,
                        name: item.name || 'Dish Item',
                        price,
                        quantity: qty,
                        image: item.image,
                      });
                    } else {
                      const existing = itemsAddedTodayMap.get(key);
                      if (existing) {
                        existing.quantity += qty;
                      }
                    }
                  });
                });

                const aggregatedItems = Array.from(itemsAddedTodayMap.values());

                return (
                  <div className="space-y-6 pb-6">
                    {/* SUMMARY KPI CARD FOR TODAY'S ITEMS */}
                    <div className="p-5 rounded-3xl bg-black/50 border border-namaha-gold/30 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <span className="text-[10px] text-namaha-gold font-extrabold uppercase tracking-widest block">TABLE #{selectedTable || 1} SUMMARY</span>
                          <h4 className="font-bold text-base text-white">{totalTodayUnits} Item(s) Added Today</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Bill Value</span>
                          <span className="text-xl font-serif font-extrabold text-namaha-gold">₹{totalTodayAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Itemized List */}
                      {aggregatedItems.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">ALL DISHES ADDED TODAY:</span>
                          {aggregatedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-2xl bg-white/5 border border-white/5">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-namaha-gold/20 text-namaha-gold font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="font-bold text-white">{item.name}</span>
                              </div>
                              <span className="font-semibold text-namaha-gold">₹{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No active items added today.</p>
                      )}
                    </div>

                    {/* SUBMITTED ORDERS RECEIPTS LIST */}
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block">
                        Submitted Orders Receipts ({todayOrders.length})
                      </span>

                      {todayOrders.map((order) => {
                        if (!order) return null;
                        const ordId = order.id || `ord_${Math.random()}`;
                        const ordNum = order.orderNumber || `#ORD-${String(ordId).slice(-6)}`;
                        const tblNum = order.tableNumber || 1;
                        const itemsCnt = Array.isArray(order.items) ? order.items.length : 0;

                        return (
                          <div
                            key={ordId}
                            className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white text-sm">{ordNum}</h5>
                                <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold text-[10px] font-extrabold">
                                  Table #{tblNum}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {parseSafeDate(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-gray-300 pt-1 border-t border-white/5">
                              <span>{itemsCnt} item(s)</span>
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(order)}
                                className="px-2.5 py-1 rounded-xl bg-namaha-gold/15 hover:bg-namaha-gold/25 text-namaha-gold border border-namaha-gold/30 text-xs font-bold transition"
                              >
                                View Receipt
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="py-12 text-center text-gray-400 space-y-3 bg-black/20 rounded-3xl border border-white/5">
                <ChefHat className="w-12 h-12 mx-auto text-gray-600 opacity-50" />
                <p className="text-sm font-semibold text-gray-200">No items added today</p>
                <p className="text-xs text-gray-400">Items added to your table will appear here.</p>
              </div>
            )}
          </div>
        ) : placedOrder ? (
          /* ======================================================== */
          /* 2. ORDER CONFIRMATION VIEW MODE                          */
          /* ======================================================== */
          <div className="p-6 text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-namaha-gold">
                ✓ Order Placed Successfully!
              </span>
              <h3 className="text-2xl font-serif font-bold text-white mt-1">
                {placedOrder.orderNumber}
              </h3>
              <p className="text-xs text-gray-300 mt-1 font-medium">
                Your order is sent to the kitchen at <strong className="text-emerald-400">Table #{placedOrder.tableNumber}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Total Bill:</span>
                <span className="font-bold text-namaha-gold text-sm">₹{placedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Estimated Prep Time:</span>
                <span className="font-bold text-amber-300">10 - 15 mins</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setPlacedOrder(null);
                  setCartViewMode('orders');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-xl hover:bg-amber-400 transition"
              >
                Track Live Status
              </button>
              <button
                onClick={() => {
                  setPlacedOrder(null);
                  closeCart();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/10 text-gray-300 font-bold text-xs sm:text-sm hover:bg-white/20 transition"
              >
                Back to Menu
              </button>
            </div>
          </div>
        ) : isCheckoutOpen ? (
          /* ======================================================== */
          /* 3. CHECKOUT & ORDER DETAILS SCREEN MODE                 */
          /* ======================================================== */
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-namaha-gold flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-400" /> Confirm Kitchen Order
              </h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Back to Cart
              </button>
            </div>

            {/* Table Number & Grand Total Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-namaha-gold/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-300 font-semibold block">Dining Table #{selectedTable}</span>
                <span className="text-xl font-serif font-extrabold text-namaha-gold">
                  Total Bill: ₹{grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-namaha-gold/20 text-namaha-gold font-serif font-bold text-sm">
                Table #{selectedTable}
              </div>
            </div>

            {/* Customer Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Your Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-namaha-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Special Kitchen Request:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, less oil"
                  value={kitchenNotes}
                  onChange={(e) => setKitchenNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-namaha-gold"
                />
              </div>
            </div>

            {/* Error Banner with Retry */}
            {submissionError && (
              <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Unable to send your order</span>
                </div>
                <p className="text-[11px] text-gray-300">{submissionError}</p>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition active:scale-98"
                >
                  TRY AGAIN
                </button>
              </div>
            )}

            {/* Order Total & Submit Button */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Total Bill:</span>
                <span className="text-xl font-serif font-extrabold text-namaha-gold">₹{grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmittingOrder}
                className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-500 to-orange-500 text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Sending to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <span>Send Order to Kitchen</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 4. STANDARD CART ITEMS LIST VIEW MODE                    */
          /* ======================================================== */
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length > 0 && (
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-namaha-gold">
                    Items Selected ({totalCount})
                  </span>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="px-3 py-1 rounded-xl bg-namaha-gold/15 border border-namaha-gold/30 text-namaha-gold text-xs font-bold hover:bg-namaha-gold/25 transition flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add More Items</span>
                  </button>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-600 opacity-50" />
                  <p className="text-sm font-semibold text-gray-200">Your cart is empty</p>
                  <p className="text-xs text-gray-400">Add your favourite dishes to get started.</p>
                  <button
                    onClick={closeCart}
                    className="mt-2 px-5 py-2 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                (cart || []).map((entry) => {
                  if (!entry || !entry.item || !entry.item.id) return null;
                  const { item, quantity } = entry;
                  const inWishlist = isInWishlist(item.id);
                  const lineTotal = (Number(quantity) || 1) * Number(item.price || 0);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-namaha-gold/30 transition flex items-center justify-between gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 relative border border-white/10">
                        {/* eslint-disable-next-next/no-img-element */}
                        <img
                          src={getFreshImageUrl(item.image)}
                          alt={item.name || 'Dish'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-white text-sm truncate">{item.name || 'Dish'}</h3>
                        <p className="text-xs text-namaha-gold font-sans font-bold mt-0.5">
                          ₹{item.price || 0} × {quantity} = <span className="text-amber-300">₹{lineTotal.toFixed(2)}</span>
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => toggleWishlist(item)}
                          className="mt-1 text-[10px] font-medium text-gray-400 hover:text-amber-400 flex items-center gap-1 transition"
                        >
                          <Heart className={`w-3 h-3 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{inWishlist ? 'Saved in wishlist' : 'Move to wishlist'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl p-1 shadow-inner flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-900/80 text-white flex items-center justify-center text-xs font-extrabold transition active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-6 text-center font-sans font-extrabold text-sm text-white">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-namaha-gold hover:bg-amber-400 text-namaha-green-deep flex items-center justify-center text-xs font-extrabold transition active:scale-90 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions Bar */}
            {cart.length > 0 && (
              <div className="px-6 py-4 bg-namaha-green-deep border-t border-white/10 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
                  <span>Grand Total ({totalCount} items):</span>
                  <span className="text-base font-serif font-extrabold text-namaha-gold">₹{grandTotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 transition active:scale-98 border border-white/20"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Send Order to Kitchen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-3 px-3 rounded-2xl bg-white/10 hover:bg-red-950/80 text-gray-300 hover:text-red-300 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 active:scale-98 border border-white/15 hover:border-red-500/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Clear Cart Confirmation Dialog */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-red-500/50 text-center space-y-4 max-w-sm w-full shadow-2xl">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto animate-bounce" />
              <div>
                <h4 className="text-base font-serif font-bold text-white">Clear all items from your cart?</h4>
                <p className="text-xs text-gray-400 mt-1">This will remove all {totalCount} items and reset your cart.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/20 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details View Modal Popup */}
        {selectedOrderDetails && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/50 text-left space-y-4 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-namaha-gold">
                      {selectedOrderDetails.orderNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-namaha-gold/20 text-namaha-gold text-xs font-extrabold">
                      Table #{selectedOrderDetails.tableNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Placed on {parseSafeDate(selectedOrderDetails.createdAt).toLocaleDateString()} at{' '}
                    {parseSafeDate(selectedOrderDetails.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Status Timeline Banner */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Kitchen Status:</span>
                    <span className={`font-bold capitalize ${getOrderStatusDisplay(selectedOrderDetails.orderStatus).color}`}>
                      {getOrderStatusDisplay(selectedOrderDetails.orderStatus).label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map((stepNum) => (
                      <div
                        key={stepNum}
                        className={`rounded-full transition-all duration-300 ${
                          (getOrderStatusDisplay(selectedOrderDetails.orderStatus).step || 0) >= stepNum
                            ? 'bg-amber-500'
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    Ordered Dishes & Quantities
                  </h4>
                  <div className="space-y-2 bg-black/30 p-3 rounded-2xl border border-white/5">
                    {(Array.isArray(selectedOrderDetails.items) ? selectedOrderDetails.items : []).map((item, idx) => {
                      if (!item) return null;
                      const qty = Number(item.quantity || 1);
                      const prc = Number(item.price || 0);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-namaha-gold font-extrabold flex items-center justify-center text-[11px]">
                              {qty}×
                            </span>
                            <span className="font-semibold">{item.name || 'Dish Item'}</span>
                          </div>
                          <span className="font-bold text-white">
                            ₹{(prc * qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bill Breakdown */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-namaha-gold/15 to-transparent border border-namaha-gold/30 flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-200">Total Bill Amount:</span>
                  <span className="text-base font-serif font-extrabold text-namaha-gold">
                    ₹{Number(selectedOrderDetails.totalAmount || 0).toFixed(2)}
                  </span>
                </div>

                {/* Kitchen Notes */}
                {selectedOrderDetails.notes && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 italic">
                    <strong>Kitchen Request:</strong> &quot;{selectedOrderDetails.notes}&quot;
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedOrderDetails) return;
                    const printWindow = window.open('', '_blank', 'width=400,height=600');
                    if (!printWindow) return;

                    const itemsHtml = (Array.isArray(selectedOrderDetails.items) ? selectedOrderDetails.items : [])
                      .map(
                        (i) => {
                          if (!i) return '';
                          const qty = Number(i.quantity || 1);
                          const prc = Number(i.price || 0);
                          return `
                      <tr style="border-bottom: 1px dashed #ccc;">
                        <td style="padding: 6px 0; text-align: left;">${qty}x ${i.name || 'Dish Item'}</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹${(prc * qty).toFixed(2)}</td>
                      </tr>`;
                        }
                      )
                      .join('');

                    const formattedTime = parseSafeDate(selectedOrderDetails.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const formattedDate = parseSafeDate(selectedOrderDetails.createdAt).toLocaleDateString();

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title></title>
                        <style>
                          @page { size: auto; margin: 0mm; }
                          body { font-family: monospace; padding: 15px; width: 280px; margin: 0 auto; color: #000; font-size: 12px; }
                          h2 { text-align: center; margin: 5px 0; font-size: 16px; text-transform: uppercase; }
                          p { text-align: center; margin: 2px 0; font-size: 11px; }
                          .divider { border-top: 1px dashed #000; margin: 8px 0; }
                          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                          .total { font-size: 14px; font-weight: bold; text-align: right; }
                          .footer { text-align: center; margin-top: 12px; font-size: 10px; }
                        </style>
                      </head>
                      <body onload="window.print(); setTimeout(() => window.close(), 500);">
                        <h2>NAMAHAA TIFFIN ROOM</h2>
                        <p>Authentic South Indian Flavors</p>
                        <div class="divider"></div>
                        <p><strong>ORDER ${selectedOrderDetails.orderNumber}</strong> | Table #${selectedOrderDetails.tableNumber}</p>
                        <p>${formattedDate} at ${formattedTime}</p>
                        <div class="divider"></div>
                        <table>
                          <thead>
                            <tr style="border-bottom: 1px solid #000;">
                              <th style="text-align: left; padding-bottom: 4px;">Item</th>
                              <th style="text-align: right; padding-bottom: 4px;">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemsHtml}
                          </tbody>
                        </table>
                        <div class="divider"></div>
                        <p class="total">GRAND TOTAL: ₹${selectedOrderDetails.totalAmount.toFixed(2)}</p>
                        <div class="divider"></div>
                        <p class="footer">Thank you for dining with Namahaa!</p>
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-extrabold text-xs shadow-md hover:bg-white/20 transition flex items-center justify-center gap-1.5"
                >
                  <ClipboardList className="w-4 h-4 text-namaha-gold" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="py-3 rounded-2xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-md hover:bg-amber-400 transition"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

class CartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Cart error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#023835] border border-namaha-gold/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-namaha-gold mx-auto" />
            <h3 className="text-lg font-serif font-bold text-white">Cart Temporarily Refreshed</h3>
            <p className="text-xs text-gray-300">
              We updated your session data. Click below to continue browsing.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem('namahaa_customer_cart_v2');
                  } catch (e) {}
                  window.location.reload();
                }
              }}
              className="w-full py-3 rounded-2xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-lg hover:bg-amber-400 transition"
            >
              Refresh Menu & Cart
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CartBottomSheet: React.FC = () => {
  return (
    <CartErrorBoundary>
      <CartBottomSheetInner />
    </CartErrorBoundary>
  );
};
