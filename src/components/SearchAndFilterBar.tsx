'use client';

import React from 'react';
import { FilterType } from '@/types';
import { Search, X, Star, Award, Flame, CheckCircle, Leaf } from 'lucide-react';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  totalResults: number;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  totalResults,
}) => {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Items', icon: <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-namaha-accent-veg" /> },
    { id: 'popular', label: 'Popular', icon: <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> },
    { id: 'chef_special', label: 'Chef Special', icon: <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" /> },
    { id: 'today_special', label: "Today's Special", icon: <Flame className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> },
    { id: 'available', label: 'In Stock', icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> },
  ];

  return (
    <div className="bg-white dark:bg-namaha-green-dark/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 shadow-lg mb-8">
      
      {/* Search Input Box */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-amber-600 dark:text-namaha-gold" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Food Name (e.g., Ghee Dosa, Benne, Thatte Idly)..."
          className="w-full pl-11 pr-10 py-3.5 bg-emerald-50/60 dark:bg-white/10 border border-emerald-950/15 dark:border-white/15 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 text-sm sm:text-base focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Badges Row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-white dark:text-namaha-green-deep font-bold shadow-md'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10'
                }`}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Counter indicator */}
        <div className="text-xs text-amber-700 dark:text-namaha-gold font-bold">
          Showing <span className="text-namaha-green-deep dark:text-white font-extrabold">{totalResults}</span> delicious items
        </div>
      </div>
    </div>
  );
};
