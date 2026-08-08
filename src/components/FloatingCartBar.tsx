'use client';

import React from 'react';
import { useCart } from '@/lib/cartContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

export const FloatingCartBar: React.FC = () => {
  const { totalCount, cart, openCart } = useCart();

  // ONLY render when at least one item has been added
  if (totalCount === 0) {
    return null;
  }

  // Get up to 3 thumbnails for visual preview stack
  const previewItems = cart.slice(0, 3);

  return (
    <aside
      aria-label="Shopping Cart Summary"
      className="fixed bottom-4 inset-x-4 sm:bottom-6 sm:max-w-md sm:mx-auto z-40 animate-fade-in-up"
    >
      <button
        onClick={openCart}
        className="w-full bg-gradient-to-r from-namaha-green-dark via-[#023835] to-namaha-green-deep border-2 border-namaha-gold/60 hover:border-namaha-gold rounded-2xl sm:rounded-full shadow-2xl p-3 sm:px-5 sm:py-3 text-white flex items-center justify-between gap-3 group transition-all duration-300 hover:scale-102 hover:shadow-namaha-gold/25 cursor-pointer backdrop-blur-xl"
        aria-label={`Open cart with ${totalCount} ${totalCount === 1 ? 'item' : 'items'}`}
      >
        {/* Left: Cart Icon & Item Count ONLY (No running price to prevent purchase friction) */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-namaha-gold to-amber-500 text-namaha-green-deep flex-shrink-0 shadow-md">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-namaha-green-deep font-extrabold text-[11px] flex items-center justify-center shadow">
              {totalCount}
            </span>
          </div>

          <div className="text-left min-w-0">
            <span className="text-sm sm:text-base font-serif font-bold text-white tracking-wide block">
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[11px] text-amber-300 font-medium hidden xs:inline-block">
              In your cart
            </span>
          </div>
        </div>

        {/* Right: Thumbnails Stack & View Cart Action */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Thumbnails preview stack */}
          <div className="hidden xs:flex items-center -space-x-2 overflow-hidden py-0.5">
            {previewItems.map((c, idx) => (
              <div
                key={c.item.id}
                className="w-7 h-7 rounded-lg overflow-hidden border-2 border-namaha-green-dark shadow bg-black/40 flex-shrink-0"
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

          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-extrabold text-xs sm:text-sm shadow-md group-hover:from-amber-400 group-hover:to-amber-500 transition-all">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>
    </aside>
  );
};
