'use client';

import React from 'react';
import { useCart } from '@/lib/cartContext';
import { X, Heart, Plus, Trash2 } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

export const WishlistModal: React.FC = () => {
  const {
    wishlist,
    isWishlistOpen,
    closeWishlist,
    toggleWishlist,
    addToCart,
    getItemQuantity,
    openCart,
  } = useCart();

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-500/30">
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Your Saved Favorites</h3>
              <p className="text-[11px] text-gray-400">{wishlist.length} {wishlist.length === 1 ? 'dish' : 'dishes'} in wishlist</p>
            </div>
          </div>

          <button
            onClick={closeWishlist}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {wishlist.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Heart className="w-10 h-10 mx-auto text-gray-600 opacity-40" />
              <p className="text-sm font-semibold text-gray-300">Your wishlist is empty</p>
              <p className="text-xs text-gray-400">Click the heart (♡) on any dish to save your favorite tiffins.</p>
            </div>
          ) : (
            wishlist.map((item) => {
              const qtyInCart = getItemQuantity(item.id);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-namaha-gold/30 transition flex items-center justify-between gap-3"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 relative border border-white/10">
                    {/* eslint-disable-next-next/no-img-element */}
                    <img
                      src={getFreshImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-white text-sm truncate">{item.name}</h4>
                    <p className="text-xs font-sans font-bold text-namaha-gold">₹{item.price}</p>
                    <span className="text-[10px] text-gray-400">{item.categoryName}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(item);
                        openCart();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-namaha-gold hover:bg-amber-400 text-namaha-green-deep font-bold text-xs shadow flex items-center gap-1 transition"
                      aria-label={`Add ${item.name} to cart`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{qtyInCart > 0 ? `In Cart (${qtyInCart})` : 'Add'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(item)}
                      className="p-2 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white transition"
                      title="Remove from wishlist"
                      aria-label={`Remove ${item.name} from wishlist`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={closeWishlist}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
