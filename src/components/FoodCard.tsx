'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { Clock, Star, Award, Flame, Eye } from 'lucide-react';

interface FoodCardProps {
  item: MenuItem;
  onOpenDetails: (item: MenuItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onOpenDetails }) => {
  return (
    <div
      onClick={() => onOpenDetails(item)}
      className="group relative bg-white dark:bg-namaha-green-dark/80 backdrop-blur-md rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 overflow-hidden shadow-md hover:shadow-xl hover:shadow-amber-500/15 hover:border-amber-500/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Image Container */}
      <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-emerald-100 dark:bg-namaha-green-deep">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 dark:from-namaha-green-dark via-transparent to-black/20" />

        {/* Veg Badge Top Left */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md p-1 rounded-md border border-emerald-600 flex items-center justify-center shadow-md">
          <div className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
        </div>

        {/* Preparation Time Badge Top Right */}
        {item.preparationTime && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-gray-100 font-medium flex items-center gap-1 border border-white/20">
            <Clock className="w-3 h-3 text-amber-400 dark:text-namaha-gold" />
            <span>{item.preparationTime}</span>
          </div>
        )}

        {/* Special Badges Row */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
          {item.isPopular && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white dark:text-namaha-green-deep font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Star className="w-3 h-3 fill-white dark:fill-namaha-green-deep" /> Popular
            </span>
          )}
          {item.isChefSpecial && (
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:text-namaha-green-deep font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Award className="w-3 h-3" /> Chef Special
            </span>
          )}
          {item.isTodaySpecial && (
            <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Flame className="w-3 h-3" /> Today&apos;s Special
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="px-4 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-widest border border-white/20 shadow-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-namaha-green-deep dark:text-white group-hover:text-amber-600 dark:group-hover:text-namaha-gold transition-colors leading-tight">
              {item.name}
            </h3>
            <div className="text-right flex-shrink-0">
              <span className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-namaha-gold font-sans">
                ₹{item.price}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 line-clamp-2 font-normal leading-relaxed mb-4">
            {item.description}
          </p>
        </div>

        {/* Quick Detail View Action */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold">
            Category: <span className="text-amber-700 dark:text-namaha-gold">{item.categoryName}</span>
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(item);
            }}
            className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-namaha-gold group-hover:translate-x-0.5 transition-transform"
          >
            <span>View Info</span>
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
