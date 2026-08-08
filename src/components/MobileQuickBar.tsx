'use client';

import React from 'react';
import { Utensils, Search, Star, Sun, Moon, ArrowUp, Heart } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useCart } from '@/lib/cartContext';

interface MobileQuickBarProps {
  selectedTable: number | null;
  onOpenTableSelector: () => void;
  onOpenSearch: () => void;
}

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({
  selectedTable,
  onOpenTableSelector,
  onOpenSearch,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { totalCount, wishlist, openWishlist } = useCart();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSpecials = () => {
    const el = document.getElementById('specials');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If cart bar is active at the bottom, yield cleanly to FloatingCartBar
  if (totalCount > 0) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 animate-fade-in">
      <div className="bg-white/95 dark:bg-namaha-green-dark/95 backdrop-blur-xl border border-emerald-950/15 dark:border-namaha-gold/40 rounded-full shadow-2xl px-4 py-2.5 flex items-center justify-between gap-1 text-slate-800 dark:text-white">
        
        {/* 1. Table Badge Action */}
        <button
          onClick={onOpenTableSelector}
          data-open-table-modal="true"
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-800 dark:text-namaha-gold font-bold text-[11px] active:scale-95 transition"
        >
          <Utensils className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
          <span>{selectedTable ? `T-${selectedTable}` : 'Table?'}</span>
        </button>

        {/* 2. Wishlist */}
        <button
          onClick={openWishlist}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-slate-700 dark:text-gray-200 font-semibold text-[11px] hover:text-amber-600 dark:hover:text-namaha-gold active:scale-95 transition relative"
        >
          <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : 'text-amber-600 dark:text-namaha-gold'}`} />
          <span>Wishlist</span>
          {wishlist.length > 0 && (
            <span className="absolute top-0 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-bold text-[8px] flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
        </button>

        {/* 3. Search Menu Action */}
        <button
          onClick={onOpenSearch}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-slate-700 dark:text-gray-200 font-semibold text-[11px] hover:text-amber-600 dark:hover:text-namaha-gold active:scale-95 transition"
        >
          <Search className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
          <span>Search</span>
        </button>

        {/* 4. Chef Specials */}
        <button
          onClick={scrollToSpecials}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-slate-700 dark:text-gray-200 font-semibold text-[11px] hover:text-amber-600 dark:hover:text-namaha-gold active:scale-95 transition"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Specials</span>
        </button>

        {/* 5. Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-amber-800 dark:text-amber-300 font-semibold text-[11px] active:scale-95 transition"
          aria-label="Toggle Bright/Dark Mode"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-800" /> : <Sun className="w-4 h-4 text-amber-400" />}
          <span>{theme === 'light' ? 'Dark' : 'Bright'}</span>
        </button>

        {/* 6. Scroll Top */}
        <button
          onClick={scrollToTop}
          className="p-2 rounded-full bg-amber-500 text-white dark:text-namaha-green-deep font-bold shadow-md active:scale-95 transition"
          aria-label="Back to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
