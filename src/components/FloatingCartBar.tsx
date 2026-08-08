'use client';

import React from 'react';
import { useCart } from '@/lib/cartContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

export const FloatingCartBar: React.FC = () => {
  const { totalCount, totalPrice, cart, openCart } = useCart();

  // ONLY render when at least one item has been added
  if (totalCount === 0) {
    return null;
  }

  // Get up to 3 thumbnails for visual preview stack
  const previewItems = cart.slice(0, 3);

  return (
    <aside
      aria-label="Shopping Cart Summary"
      className="fixed bottom-4 inset-x-4 sm:bottom-6 sm:max-w-xl sm:mx-auto z-40 animate-fade-in-up"
    >
      <button
        onClick={openCart}
        className="w-full bg-gradient-to-r from-namaha-green-dark via-[#023835] to-namaha-green-deep border-2 border-namaha-gold/50 hover:border-namaha-gold rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 text-white flex items-center justify-between gap-3 group transition-all duration-300 hover:scale-102 hover:shadow-namaha-gold/25 cursor-pointer backdrop-blur-xl"
        aria-label={`Open cart with ${totalCount} ${totalCount === 1 ? 'item' : 'items'} worth ₹${totalPrice}`}
      >
        {/* Left: Cart Icon & Item Count */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-namaha-gold to-amber-500 text-namaha-green-deep flex-shrink-0 shadow-md">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-namaha-green-deep font-extrabold text-[11px] flex items-center justify-center shadow">
              {totalCount}
            </span>
          </div>

          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-serif font-bold text-white tracking-wide">
                {totalCount} {totalCount === 1 ? 'Item' : 'Items'} Added
              </span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-namaha-gold font-sans">
              ₹{totalPrice}
            </p>
          </div>
        </div>

        {/* Right: Image Stack Preview & View Cart Action */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Thumbnails preview stack */}
          <div className="hidden xs:flex items-center -space-x-2 overflow-hidden py-1">
            {previewItems.map((c, idx) => (
              <div
                key={c.item.id}
                className="w-8 h-8 rounded-lg overflow-hidden border-2 border-namaha-green-dark shadow bg-black/40 flex-shrink-0"
                style={{ zIndex: 10 - idx }}
              >
                {/* eslint-disable-next-next/no-img-element */}
                <img
                  src={getFreshImageUrl(c.item.image)}
                  alt={c.item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-md group-hover:bg-amber-400 transition-colors">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>
    </aside>
  );
};
