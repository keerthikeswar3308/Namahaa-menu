'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Category } from '@/types';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const enabledCategories = categories.filter((c) => c.isEnabled);

  // Check if categories overflow the available single-row width
  const checkOverflow = () => {
    if (categoriesRef.current) {
      const el = categoriesRef.current;
      // When not expanded, check if scrollWidth exceeds clientWidth
      const isOverflown = el.scrollWidth > el.clientWidth + 4 || enabledCategories.length > 5;
      setHasOverflow(isOverflown);
    }
  };

  useEffect(() => {
    checkOverflow();

    const handleResize = () => {
      checkOverflow();
    };

    window.addEventListener('resize', handleResize);
    const timeout = setTimeout(checkOverflow, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [enabledCategories.length]);

  return (
    <div className="sticky top-[78px] md:top-[68px] z-30 bg-white/95 dark:bg-namaha-green-dark/95 backdrop-blur-md border-y border-emerald-950/10 dark:border-namaha-gold/20 py-2.5 shadow-sm transition-all duration-300">
      <div
        ref={containerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-start justify-between gap-2"
      >
        
        {/* Categories Container: Single Row (Collapsed) vs Multi-Row Wrap (Expanded) */}
        <div
          ref={categoriesRef}
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isExpanded
              ? 'flex flex-wrap gap-2 py-0.5 overflow-visible'
              : 'flex items-center gap-2 overflow-hidden flex-nowrap py-0.5'
          }`}
        >
          {/* ALL Category option */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              activeCategoryId === 'all'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white dark:text-namaha-green-deep shadow-md scale-102 font-bold'
                : 'bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 hover:text-namaha-green-deep dark:hover:text-namaha-gold border border-emerald-900/10 dark:border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Items</span>
          </button>

          {/* Dynamic Categories List */}
          {enabledCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white dark:text-namaha-green-deep shadow-md scale-102 font-bold'
                    : 'bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 hover:text-namaha-green-deep dark:hover:text-namaha-gold border border-emerald-900/10 dark:border-white/5'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Small Down Arrow (↓) / Up Arrow (↑) Button on Right Side */}
        {(hasOverflow || isExpanded) && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold hover:bg-amber-500 hover:text-white dark:hover:bg-namaha-gold dark:hover:text-namaha-green-deep border border-amber-500/30 dark:border-namaha-gold/30 flex items-center justify-center transition-all duration-200 shadow-sm flex-shrink-0 self-center ${
              isExpanded ? 'self-start mt-1 bg-amber-500 text-white dark:bg-namaha-gold dark:text-namaha-green-deep' : ''
            }`}
            aria-label={isExpanded ? 'Collapse categories' : 'Show all categories'}
            title={isExpanded ? 'Collapse categories (↑)' : 'Show more categories (↓)'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            )}
          </button>
        )}

      </div>
    </div>
  );
};
