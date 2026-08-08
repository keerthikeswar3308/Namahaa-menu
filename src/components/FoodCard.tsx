'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { Clock, Star, Award, Flame, Eye, Plus, Minus, Heart } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';
import { useCart } from '@/lib/cartContext';

interface FoodCardProps {
  item: MenuItem;
  onOpenDetails: (item: MenuItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onOpenDetails }) => {
  const [imgSrc, setImgSrc] = useState<string>(getFreshImageUrl(item.image));
  const { addToCart, removeFromCart, getItemQuantity, toggleWishlist, isInWishlist } = useCart();

  useEffect(() => {
    setImgSrc(getFreshImageUrl(item.image));
  }, [item.image]);

  const quantity = getItemQuantity(item.id);
  const inWishlist = isInWishlist(item.id);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(item);
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromCart(item.id);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(item);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(item);
  };

  return (
    <div
      onClick={() => onOpenDetails(item)}
      className="group relative bg-white dark:bg-namaha-green-dark/85 backdrop-blur-md rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 overflow-hidden shadow-md hover:shadow-xl hover:shadow-amber-500/15 hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Image Container */}
      <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-emerald-100 dark:bg-namaha-green-deep">
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          unoptimized
          onError={() => {
            if (!imgSrc.includes('unsplash')) {
              setImgSrc(
                'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'
              );
            }
          }}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 dark:from-namaha-green-deep/90 via-transparent to-black/20" />

        {/* Veg Badge Top Left */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md p-1 rounded-md border border-emerald-600 flex items-center justify-center shadow-md z-10">
          <div className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
        </div>

        {/* Wishlist Heart Top Right */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-red-400 border border-white/20 shadow-md transition active:scale-90"
          aria-label={inWishlist ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
          title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Preparation Time Badge */}
        {item.preparationTime && (
          <div className="absolute top-11 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-gray-100 font-medium flex items-center gap-1 border border-white/15 z-10">
            <Clock className="w-2.5 h-2.5 text-amber-400 dark:text-namaha-gold" />
            <span>{item.preparationTime}</span>
          </div>
        )}

        {/* Special Badges Row */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1 z-10">
          {item.isPopular && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white dark:text-namaha-green-deep font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-md">
              <Star className="w-2.5 h-2.5 fill-white dark:fill-namaha-green-deep" /> Popular
            </span>
          )}
          {item.isChefSpecial && (
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:text-namaha-green-deep font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-md">
              <Award className="w-2.5 h-2.5" /> Special
            </span>
          )}
          {item.isTodaySpecial && (
            <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-md">
              <Flame className="w-2.5 h-2.5" /> Today
            </span>
          )}
        </div>

        {/* Add Button / Stepper Controls at Bottom Right of Food Image */}
        <div className="absolute bottom-3 right-3 z-10">
          {!item.isAvailable ? (
            <span className="px-3 py-1.5 rounded-xl bg-red-950/90 text-red-300 font-bold text-xs uppercase tracking-wider border border-red-500/30 shadow-md">
              Unavailable
            </span>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={handleAddClick}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-extrabold text-xs shadow-lg flex items-center gap-1 transition-all duration-200 active:scale-95 border border-white/20"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-namaha-green-deep/95 dark:bg-namaha-green-dark/95 border-2 border-namaha-gold rounded-xl p-1 shadow-2xl backdrop-blur-md animate-scale-up"
            >
              <button
                type="button"
                onClick={handleMinusClick}
                className="w-6 h-6 rounded-lg bg-white/15 hover:bg-red-900/80 text-white flex items-center justify-center text-xs font-black transition active:scale-90"
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="w-5 text-center font-sans font-extrabold text-xs text-white">
                {quantity}
              </span>

              <button
                type="button"
                onClick={handlePlusClick}
                className="w-6 h-6 rounded-lg bg-namaha-gold hover:bg-amber-400 text-namaha-green-deep flex items-center justify-center text-xs font-black transition active:scale-90 shadow-sm"
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-0">
            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider border border-white/20 shadow-md">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-serif font-bold text-namaha-green-deep dark:text-white group-hover:text-amber-600 dark:group-hover:text-namaha-gold transition-colors leading-tight">
              {item.name}
            </h3>
            <div className="text-right flex-shrink-0">
              <span className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-namaha-gold font-sans">
                ₹{item.price}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-2 font-normal leading-relaxed mb-3">
            {item.description}
          </p>
        </div>

        {/* Quick Detail View Action */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-semibold truncate">
            {item.categoryName}
          </span>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(item);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-namaha-gold group-hover:translate-x-0.5 transition-transform flex-shrink-0"
          >
            <span>View Info</span>
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
