'use client';

import React from 'react';
import { Category, MenuItem, RestaurantInfo } from '@/types';
import { Utensils, CheckCircle, AlertTriangle, Star, FolderTree, Power, Sparkles, Plus, FileUp, RefreshCw, Bot } from 'lucide-react';
import { NamahaStore } from '@/lib/store';

interface AdminDashboardOverviewProps {
  items: MenuItem[];
  categories: Category[];
  info: RestaurantInfo;
  onToggleRestaurantOpen: () => void;
  onNavigateTab: (tab: string) => void;
  onResetMenu: () => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  items,
  categories,
  info,
  onToggleRestaurantOpen,
  onNavigateTab,
  onResetMenu,
}) => {
  const totalItems = items.length;
  const availableItems = items.filter((i) => i.isAvailable).length;
  const outOfStockItems = totalItems - availableItems;
  const popularItems = items.filter((i) => i.isPopular).length;
  const chefSpecials = items.filter((i) => i.isChefSpecial).length;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner Control */}
      <div className="p-6 rounded-3xl bg-namaha-green-deep border border-namaha-gold/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-white">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl border ${info.isRestaurantOpen ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-red-950/80 border-red-500/50 text-red-400'}`}>
            <Power className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              Restaurant Status: <span className={info.isRestaurantOpen ? 'text-emerald-400' : 'text-red-400'}>{info.isRestaurantOpen ? 'OPEN FOR ORDERS' : 'CLOSED NOW'}</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Controls live badge visibility on QR digital menu system.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleRestaurantOpen}
            className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 ${
              info.isRestaurantOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{info.isRestaurantOpen ? 'Switch to Closed' : 'Switch to Open'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Total Dishes</span>
            <Utensils className="w-5 h-5 text-namaha-gold" />
          </div>
          <div className="text-3xl font-bold text-white font-sans">{totalItems}</div>
          <span className="text-[11px] text-namaha-gold mt-1 block">Active on menu</span>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Available</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-sans">{availableItems}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">In stock now</span>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Out of Stock</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400 font-sans">{outOfStockItems}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Temporarily disabled</span>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Categories</span>
            <FolderTree className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 font-sans">{categories.length}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Active categories</span>
        </div>

        {/* Metric 5 */}
        <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg text-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase">Chef Specials</span>
            <Star className="w-5 h-5 text-namaha-gold" />
          </div>
          <div className="text-3xl font-bold text-namaha-gold font-sans">{chefSpecials}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Featured dishes</span>
        </div>

      </div>

      {/* Quick Action Hub */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl text-white">
        <h3 className="text-lg font-serif font-bold text-namaha-gold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Quick Management Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigateTab('assistant')}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-namaha-gold/30 to-amber-600/20 hover:from-amber-500/30 hover:to-namaha-gold/40 border-2 border-namaha-gold/60 text-left transition flex items-center justify-between group shadow-lg"
          >
            <div>
              <span className="text-sm font-bold text-namaha-gold block flex items-center gap-1.5">
                🤖 AI Menu Assistant
              </span>
              <span className="text-xs text-amber-300/90">Chatbot to manage menu, prices & images</span>
            </div>
            <Bot className="w-6 h-6 text-namaha-gold group-hover:scale-125 transition-transform" />
          </button>

          <button
            onClick={() => onNavigateTab('menu')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-namaha-gold/20 border border-white/10 hover:border-namaha-gold/50 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-sm font-bold text-white group-hover:text-namaha-gold block">Add / Edit Menu</span>
              <span className="text-xs text-gray-400">Manage all food dishes</span>
            </div>
            <Plus className="w-5 h-5 text-namaha-gold group-hover:scale-125 transition-transform" />
          </button>

          <button
            onClick={() => onNavigateTab('import')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-namaha-gold/20 border border-white/10 hover:border-namaha-gold/50 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-sm font-bold text-white group-hover:text-namaha-gold block">Import Word Doc</span>
              <span className="text-xs text-gray-400">Auto-parse docx menu</span>
            </div>
            <FileUp className="w-5 h-5 text-namaha-gold group-hover:scale-125 transition-transform" />
          </button>

          <button
            onClick={async () => {
              try {
                const count = await NamahaStore.syncAllMenuItemsToSupabase();
                alert(`Successfully synchronized ${count} menu items directly to Supabase DB!`);
              } catch (err: any) {
                alert(`Sync error: ${err.message}`);
              }
            }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-500/40 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-sm font-bold text-amber-300 block">⚡ Sync All to Supabase</span>
              <span className="text-xs text-amber-400/80">Pesarattu, Dosas, Vada...</span>
            </div>
            <Sparkles className="w-5 h-5 text-amber-300 group-hover:scale-125 transition-transform" />
          </button>

          <button
            onClick={() => onNavigateTab('settings')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-namaha-gold/20 border border-white/10 hover:border-namaha-gold/50 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-sm font-bold text-white group-hover:text-namaha-gold block">Restaurant Settings</span>
              <span className="text-xs text-gray-400">Hours, Phone, Maps, Logo</span>
            </div>
            <Sparkles className="w-5 h-5 text-namaha-gold group-hover:scale-125 transition-transform" />
          </button>

          <button
            onClick={onResetMenu}
            className="p-4 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-sm font-bold text-red-300 block">Restore Default Menu</span>
              <span className="text-xs text-red-400/80">Reload original default items</span>
            </div>
            <RefreshCw className="w-5 h-5 text-red-400 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
