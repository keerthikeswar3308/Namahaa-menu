'use client';

import React, { useRef } from 'react';
import { Category } from '@/types';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const enabledCategories = categories.filter((c) => c.isEnabled);

  return (
    <div className="sticky top-[64px] sm:top-[72px] z-30 bg-white/95 dark:bg-namaha-green-dark/95 backdrop-blur-md border-y border-emerald-950/10 dark:border-namaha-gold/20 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center">
        
        {/* Scroll Left Button */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold hover:bg-amber-500 hover:text-white dark:hover:bg-namaha-gold dark:hover:text-namaha-green-deep transition mr-2 flex-shrink-0"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Categories Bar */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* ALL Category option */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              activeCategoryId === 'all'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white dark:text-namaha-green-deep shadow-md scale-105 font-bold'
                : 'bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 hover:text-namaha-green-deep dark:hover:text-namaha-gold border border-emerald-900/10 dark:border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Items</span>
          </button>

          {enabledCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white dark:text-namaha-green-deep shadow-md scale-105 font-bold'
                    : 'bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 hover:text-namaha-green-deep dark:hover:text-namaha-gold border border-emerald-900/10 dark:border-white/5'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold hover:bg-amber-500 hover:text-white dark:hover:bg-namaha-gold dark:hover:text-namaha-green-deep transition ml-2 flex-shrink-0"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
