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
} from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';
import { NamahaStore } from '@/lib/store';
import { OrderStore } from '@/lib/orderStore';
import { Order, RestaurantInfo, OrderStatus } from '@/types';

export const CartBottomSheet: React.FC = () => {
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

  // Secure Table Session Isolation
  const [sessionId, setSessionId] = useState<string>('');
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Dedicated Order Details View Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Initialize Session ID (Persistent in localStorage across browser restarts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem('namahaa_session_id') || sessionStorage.getItem('namahaa_session_id');
      if (!storedId) {
        storedId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      }
      localStorage.setItem('namahaa_session_id', storedId);
      sessionStorage.setItem('namahaa_session_id', storedId);
      setSessionId(storedId);
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
    const fetched = await OrderStore.fetchCustomerOrders(selectedTable, sessionId);
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
          const mappedOrder: Order = {
            id: raw.id,
            orderNumber: raw.order_number || raw.orderNumber || `#ORD-${raw.id.slice(-6)}`,
            tableNumber: Number(raw.table_number || raw.tableNumber || selectedTable || 1),
            items: Array.isArray(raw.items) ? raw.items : [],
            totalAmount: Number(raw.total_amount || raw.totalAmount || 0),
            orderStatus: raw.order_status || 'pending',
            customerName: raw.customer_name || '',
            customerPhone: raw.customer_phone || '',
            notes: raw.notes || '',
            sessionId: raw.session_id || sessionId,
            idempotencyKey: raw.idempotency_key || '',
            createdAt: raw.created_at || new Date().toISOString(),
            updatedAt: raw.updated_at || new Date().toISOString(),
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

  const grandTotal = cart.reduce(
    (sum, { item, quantity }) => sum + quantity * Number(item.price),
    0
  );

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (isSubmittingOrder) return;

    setIsSubmittingOrder(true);

    const idempotencyKey = `idem_${sessionId}_${selectedTable || 1}_${Date.now()}`;

    const orderItems = cart.map(({ item, quantity }) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      image: item.image,
      isVeg: item.isVeg,
    }));

    const result = await OrderStore.createOrder({
      tableNumber: selectedTable || 1,
      items: orderItems,
      totalAmount: grandTotal,
      customerName,
      notes: kitchenNotes,
      sessionId,
      idempotencyKey,
    });

    setIsSubmittingOrder(false);

    if (result.success && result.order) {
      setPlacedOrder(result.order);
      clearCart();
      setIsCheckoutOpen(false);
      setCartViewMode('orders');
    } else {
      alert(result.error || 'Could not place order. Please try again.');
    }
  };

  const getOrderStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Sent to Kitchen', desc: 'Kitchen is confirming your items...', color: 'text-amber-400', step: 1 };
      case 'preparing':
        return { label: 'Preparing', desc: 'Chef is cooking your tiffins fresh!', color: 'text-blue-400', step: 2 };
      case 'served':
        return { label: 'Ready to Serve', desc: 'Dish is hot and coming to your table!', color: 'text-purple-400', step: 3 };
      case 'completed':
        return { label: 'Completed', desc: 'Enjoyed your tiffin? Visit again!', color: 'text-emerald-400', step: 4 };
      case 'cancelled':
        return { label: 'Cancelled', desc: 'This order was cancelled.', color: 'text-rose-400', step: 0 };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
      
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={closeCart} />

      {/* Bottom Sheet Drawer / Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-namaha-green-dark border-t-2 sm:border-2 border-namaha-gold/40 rounded-t-3xl sm:rounded-3xl shadow-2xl text-white max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden z-10 animate-slide-up sm:animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-namaha-green-deep">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-namaha-gold/20 text-namaha-gold">
              {cartViewMode === 'orders' ? <ClipboardList className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-namaha-gold">
                {cartViewMode === 'orders' ? 'Your Table Orders' : 'Your Table Cart'}
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
                Track Orders ({customerOrders.length})
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
          /* 1. CUSTOMER ORDER TRACKER VIEW MODE                      */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
                Active Order Timeline
              </span>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                className="flex items-center gap-1.5 text-[11px] text-namaha-gold font-bold hover:underline active:scale-95 transition disabled:opacity-70"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                <span>{isManualRefreshing ? 'Refreshing...' : 'Refresh Status'}</span>
              </button>
            </div>

            {customerOrders.length > 0 ? (
              <div className="space-y-6 pb-6">
                {/* ACTIVE ORDERS SECTION */}
                {customerOrders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing' || o.orderStatus === 'served').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider text-amber-400">
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Active Kitchen Orders ({customerOrders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing' || o.orderStatus === 'served').length})</span>
                    </div>

                    {customerOrders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing' || o.orderStatus === 'served').map((order) => {
                      const stateInfo = getOrderStatusDisplay(order.orderStatus);

                      return (
                        <div
                          key={order.id}
                          className="p-5 rounded-3xl bg-black/50 border border-namaha-gold/30 space-y-4 shadow-xl animate-fade-in"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-base text-white">
                                  {order.orderNumber}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md bg-namaha-gold/20 text-namaha-gold text-[10px] font-extrabold">
                                  Table #{order.tableNumber}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString()} at{' '}
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Items Preview */}
                          <div className="space-y-1.5 border-t border-b border-white/10 py-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-300">
                                <span>
                                  {item.quantity} × {item.name}
                                </span>
                                <span className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs pt-1.5 font-bold text-namaha-gold">
                              <span>Order Total:</span>
                              <span>₹{order.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Timeline Milestones & Details Button */}
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-300">Status:</span>
                              <span className={`font-bold ${stateInfo.color}`}>{stateInfo.label}</span>
                            </div>
                            
                            {/* Visual Step Bar */}
                            <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-white/15 rounded-full overflow-hidden">
                              {[1, 2, 3, 4].map((stepNum) => (
                                <div
                                  key={stepNum}
                                  className={`rounded-full transition-all duration-300 ${
                                    (stateInfo.step || 0) >= stepNum
                                      ? 'bg-amber-500'
                                      : 'bg-transparent'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[11px] text-gray-400 italic">
                                &quot;{stateInfo.desc}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(order)}
                                className="px-3 py-1.5 rounded-xl bg-namaha-gold/15 hover:bg-namaha-gold/25 text-namaha-gold border border-namaha-gold/30 text-xs font-bold transition"
                              >
                                View Order Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* COMPLETED ORDERS HISTORY SECTION */}
                {customerOrders.filter((o) => o.orderStatus === 'completed' || o.orderStatus === 'cancelled').length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider text-emerald-400 border-t border-white/10 pt-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Completed Order History ({customerOrders.filter((o) => o.orderStatus === 'completed' || o.orderStatus === 'cancelled').length})</span>
                    </div>

                    {customerOrders.filter((o) => o.orderStatus === 'completed' || o.orderStatus === 'cancelled').map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-black/30 border border-emerald-500/20 space-y-3 opacity-90 hover:opacity-100 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm text-white">{order.orderNumber}</h5>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">
                                Table #{order.tableNumber}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString()} at{' '}
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            order.orderStatus === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {order.orderStatus === 'completed' ? '✓ Completed' : 'Cancelled'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-300 border-t border-white/5 pt-2">
                          <span>{order.items.length} item(s) • Total: ₹{order.totalAmount.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold transition"
                          >
                            Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 space-y-3 bg-black/20 rounded-3xl border border-white/5">
                <ChefHat className="w-12 h-12 mx-auto text-gray-600 opacity-50" />
                <p className="text-sm font-semibold text-gray-200">No active orders</p>
                <p className="text-xs text-gray-400">Order items from the cart to watch cooking milestones live!</p>
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
                cart.map(({ item, quantity }) => {
                  const inWishlist = isInWishlist(item.id);
                  const lineTotal = quantity * Number(item.price);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-namaha-gold/30 transition flex items-center justify-between gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 relative border border-white/10">
                        {/* eslint-disable-next-next/no-img-element */}
                        <img
                          src={getFreshImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-white text-sm truncate">{item.name}</h3>
                        <p className="text-xs text-namaha-gold font-sans font-bold mt-0.5">
                          ₹{item.price} × {quantity} = <span className="text-amber-300">₹{lineTotal}</span>
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
                    Placed on {new Date(selectedOrderDetails.createdAt).toLocaleDateString()} at{' '}
                    {new Date(selectedOrderDetails.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    {selectedOrderDetails.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-namaha-gold font-extrabold flex items-center justify-center text-[11px]">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold">{item.name}</span>
                        </div>
                        <span className="font-bold text-white">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center text-sm font-bold text-namaha-gold">
                      <span>Grand Total:</span>
                      <span className="text-base">₹{selectedOrderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Kitchen Notes */}
                {selectedOrderDetails.notes && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 italic">
                    <strong>Kitchen Request:</strong> &quot;{selectedOrderDetails.notes}&quot;
                  </div>
                )}
              </div>

              {/* Close Footer Button */}
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-full py-3 rounded-2xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-md hover:bg-amber-400 transition"
              >
                Close Order Details
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
