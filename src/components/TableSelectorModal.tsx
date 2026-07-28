'use client';

import React, { useState } from 'react';
import { NamahaLogo } from './NamahaLogo';
import { NamahaStore } from '@/lib/store';
import { Utensils, CheckCircle2, Sparkles, X } from 'lucide-react';

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectTable: (tableNum: number) => void;
  currentTable?: number | null;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTable,
  currentTable = null,
}) => {
  const [selected, setSelected] = useState<number | null>(currentTable);

  if (!isOpen) return null;

  const handleSelect = (num: number) => {
    setSelected(num);
    NamahaStore.setSelectedTable(num);
    setTimeout(() => {
      onSelectTable(num);
      if (onClose) onClose();
    }, 250);
  };

  const tables = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-namaha-green-dark border-2 border-amber-500/40 dark:border-namaha-gold/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-slate-800 dark:text-white overflow-hidden my-auto">
        
        {/* Close Button if table is already selected */}
        {currentTable && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-namaha-gold transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-400/20 dark:bg-namaha-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/20 dark:bg-namaha-green-light/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo & Header */}
        <div className="relative z-10 mb-6 flex flex-col items-center">
          <NamahaLogo variant="circle" size="lg" className="mb-4 shadow-lg rounded-full bg-white p-1" />
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-namaha-green-deep dark:text-namaha-gold tracking-wide">
            Welcome to Namahaa Tiffin Room
          </h1>
          <p className="text-sm sm:text-base text-amber-700 dark:text-gray-300 italic mt-1 font-medium tracking-wide">
            &ldquo;Experience Authentic South Indian Flavours&rdquo;
          </p>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent my-4" />
        </div>

        {/* Action Title */}
        <div className="relative z-10 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-amber-800 dark:text-namaha-gold text-sm font-bold mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Digital QR Menu Access</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            Please Select Your Table Number
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-medium">
            Select your table to personalize your dining session
          </p>
        </div>

        {/* 12 Table Cards Grid */}
        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 max-h-[50vh] overflow-y-auto pr-1">
          {tables.map((tableNum) => {
            const isSelected = selected === tableNum;
            return (
              <button
                key={tableNum}
                onClick={() => handleSelect(tableNum)}
                className={`relative group flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-500 border-white text-white dark:text-namaha-green-deep shadow-lg scale-105 font-bold'
                    : 'bg-emerald-50/70 dark:bg-white/5 border-emerald-950/10 dark:border-white/10 text-slate-800 dark:text-white hover:bg-amber-100 hover:border-amber-500/60 hover:scale-102 font-bold'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <Utensils className={`w-5 h-5 ${isSelected ? 'text-white dark:text-namaha-green-deep' : 'text-amber-600 dark:text-namaha-gold group-hover:scale-110'} transition-transform`} />
                </div>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-300 font-semibold group-hover:text-slate-900 dark:group-hover:text-white">
                  Table
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {tableNum}
                </span>

                {isSelected && (
                  <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-white dark:text-namaha-green-deep animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="relative z-10 mt-6 text-xs text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2 font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>100% Pure Vegetarian South Indian Tiffin Room</span>
        </div>
      </div>
    </div>
  );
};
