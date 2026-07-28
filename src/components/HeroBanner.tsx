'use client';

import React from 'react';
import { NamahaLogo } from './NamahaLogo';
import { Sparkles, QrCode, ArrowDown } from 'lucide-react';
import { RestaurantInfo } from '@/types';

interface HeroBannerProps {
  info: RestaurantInfo;
  selectedTable: number | null;
  onOpenTableSelector: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  info,
  selectedTable,
  onOpenTableSelector,
}) => {
  return (
    <div className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50 via-teal-50/70 to-namaha-green-cream dark:from-namaha-green-deep dark:via-namaha-green-dark dark:to-namaha-green-deep border-b border-emerald-950/10 dark:border-namaha-gold/20 overflow-hidden">
      
      {/* Vibrant Glow Backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/20 dark:bg-namaha-gold/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-72 h-72 bg-emerald-500/20 dark:bg-emerald-600/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-64 h-64 bg-orange-400/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        
        {/* Banner Announcement Pill */}
        {info.announcementText && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-amber-800 dark:text-namaha-gold text-xs sm:text-sm font-bold mb-6 shadow-md animate-pulse-subtle">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
            <span>{info.announcementText}</span>
          </div>
        )}

        {/* Large Logo Graphic */}
        <div className="mb-6 flex justify-center">
          <NamahaLogo variant="banner" size="lg" className="shadow-xl rounded-2xl border border-namaha-gold/40 p-2 bg-white dark:bg-namaha-green-dark" />
        </div>

        {/* Main Title & Subtitle */}
        <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-namaha-green-deep dark:text-white tracking-tight leading-tight mb-4">
          {info.heroTitle || info.name}
        </h1>
        <p className="text-lg sm:text-2xl text-amber-700 dark:text-namaha-gold font-medium max-w-2xl mx-auto italic mb-8">
          &ldquo;{info.tagline}&rdquo;
        </p>

        {/* Dynamic Table Action Card */}
        <div className="max-w-md mx-auto bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-amber-500/40 dark:border-namaha-gold/30 rounded-3xl p-5 shadow-xl text-slate-800 dark:text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="p-3 rounded-2xl bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold border border-amber-500/30 dark:border-namaha-gold/40">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-gray-300 block uppercase font-bold">Digital QR Table Session</span>
                <span className="text-base sm:text-lg font-bold text-namaha-green-deep dark:text-white">
                  {selectedTable ? `Active on Table #${selectedTable}` : 'No Table Selected Yet'}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenTableSelector}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white dark:text-namaha-green-deep font-extrabold text-xs sm:text-sm hover:scale-105 transition-all shadow-md flex-shrink-0"
            >
              {selectedTable ? 'Change Table' : 'Select Table'}
            </button>
          </div>
        </div>

        {/* Scroll down indicator */}
        <a
          href="#menu"
          className="inline-flex items-center gap-2 text-xs text-amber-700 dark:text-namaha-gold font-bold mt-10 hover:text-amber-800 dark:hover:text-amber-300 transition-colors animate-bounce-slow"
        >
          <span>Explore Digital Menu Below</span>
          <ArrowDown className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
