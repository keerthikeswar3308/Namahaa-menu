'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { X, Clock, Award, Star, Flame, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

interface FoodDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-namaha-green-dark border-2 border-amber-500/40 dark:border-namaha-gold/40 rounded-3xl overflow-hidden shadow-2xl text-slate-800 dark:text-white my-auto max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white hover:text-amber-400 transition-all duration-200 border border-white/20 shadow-lg"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Header Image */}
        <div className="relative w-full h-64 sm:h-72 bg-emerald-100 dark:bg-namaha-green-deep flex-shrink-0">
          <Image
            src={getFreshImageUrl(item.image)}
            alt={item.name}
            fill
            unoptimized
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 dark:from-namaha-green-dark via-transparent to-transparent" />

          {/* Badges Floating on Image */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-600 flex items-center gap-1.5 shadow-md">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
              </div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">100% Pure Veg</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 dark:text-namaha-gold uppercase tracking-widest bg-black/60 px-2.5 py-1 rounded-md border border-white/20">
                {item.categoryName}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1.5 drop-shadow-md">
                {item.name}
              </h2>
            </div>
            
            <div className="bg-amber-500 dark:bg-namaha-gold text-white dark:text-namaha-green-deep font-sans font-extrabold text-2xl px-4 py-1.5 rounded-2xl shadow-xl border border-white/40">
              ₹{item.price}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white dark:bg-namaha-green-dark">
          
          {/* Status & Timing Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-white/5 border border-emerald-900/10 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-gray-300 font-medium">
              <Clock className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
              <span>Prep Time: <strong className="text-namaha-green-deep dark:text-white font-bold">{item.preparationTime || '10 mins'}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {item.isAvailable ? (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available Now
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-bold bg-red-100 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-500/30">
                  <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 dark:text-namaha-gold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Description
            </h3>
            <p className="text-sm sm:text-base text-slate-700 dark:text-gray-200 leading-relaxed font-normal">
              {item.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {item.isPopular && (
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-300" /> Customer Favorite
              </span>
            )}
            {item.isChefSpecial && (
              <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-namaha-gold/20 border border-orange-300 dark:border-namaha-gold/40 text-orange-800 dark:text-namaha-gold text-xs font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Chef Recommendation
              </span>
            )}
            {item.isTodaySpecial && (
              <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-orange-500/20 border border-red-300 dark:border-orange-500/40 text-red-800 dark:text-orange-300 text-xs font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Today&apos;s Special
              </span>
            )}
          </div>

          {/* Ingredients if present */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Key Ingredients
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/5 font-medium"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chef Recommendation Note */}
          {item.chefRecommendation && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-namaha-gold/10 border border-amber-300 dark:border-namaha-gold/30 text-xs text-amber-900 dark:text-namaha-gold italic font-medium flex items-start gap-2">
              <Award className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-namaha-gold" />
              <span>&ldquo;{item.chefRecommendation}&rdquo;</span>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="p-4 bg-slate-50 dark:bg-black/40 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-gray-400 flex items-center justify-between font-medium">
          <span>Namahaa Digital Menu System</span>
          <span className="text-amber-700 dark:text-namaha-gold font-bold">Table QR Session Active</span>
        </div>
      </div>
    </div>
  );
};
