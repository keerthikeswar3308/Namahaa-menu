'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/lib/cartContext';
import { X, Plus, Minus, Trash2, ShoppingBag, Heart, Utensils, AlertCircle } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';
import { NamahaStore } from '@/lib/store';

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
  } = useCart();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  useEffect(() => {
    setSelectedTable(NamahaStore.getSelectedTable());
  }, [isCartOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={closeCart} />

      {/* Bottom Sheet Drawer / Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-namaha-green-dark border-t-2 sm:border-2 border-namaha-gold/40 rounded-t-3xl sm:rounded-3xl shadow-2xl text-white max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden z-10 animate-slide-up sm:animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-namaha-green-deep">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-namaha-gold/20 text-namaha-gold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-namaha-gold">
                Your Cart
              </h2>
              {selectedTable && (
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Utensils className="w-3 h-3" />
                  <span>Table #{selectedTable} active</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={closeCart}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List Body */}
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
                  {/* Item Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 relative border border-white/10">
                    {/* eslint-disable-next-next/no-img-element */}
                    <img
                      src={getFreshImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Details: Name and Individual Line Calculation */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-white text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-namaha-gold font-sans font-bold mt-0.5">
                      ₹{item.price} × {quantity} = <span className="text-amber-300">₹{lineTotal}</span>
                    </p>
                    
                    {/* Move to wishlist link */}
                    <button
                      type="button"
                      onClick={() => toggleWishlist(item)}
                      className="mt-1 text-[10px] font-medium text-gray-400 hover:text-amber-400 flex items-center gap-1 transition"
                    >
                      <Heart className={`w-3 h-3 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{inWishlist ? 'Saved in wishlist' : 'Move to wishlist'}</span>
                    </button>
                  </div>

                  {/* Quantity Stepper Controls: [ − ] qty [ + ] */}
                  <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl p-1 shadow-inner flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-900/80 text-white flex items-center justify-center text-xs font-extrabold transition active:scale-90"
                      aria-label={`Decrease ${item.name} quantity`}
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
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Cart Actions: TWO SIDE-BY-SIDE BUTTONS (NO OVERALL TOTAL) */}
        {cart.length > 0 && (
          <div className="px-6 py-4 bg-namaha-green-deep border-t border-white/10 flex-shrink-0">
            <div className="grid grid-cols-2 gap-3 items-center">
              
              {/* PRIMARY ACTION: Add More Items */}
              <button
                type="button"
                onClick={closeCart}
                className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 transition active:scale-98 border border-white/20"
                aria-label="Add More Items"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="truncate">Add More Items</span>
              </button>

              {/* SECONDARY / DESTRUCTIVE ACTION: Clear Cart */}
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-3 px-3 rounded-2xl bg-white/10 hover:bg-red-950/80 text-gray-300 hover:text-red-300 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 active:scale-98 border border-white/15 hover:border-red-500/40"
                aria-label="Clear Cart"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="truncate">Clear Cart</span>
              </button>

            </div>
          </div>
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

      </div>
    </div>
  );
};
