'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NamahaLogo } from './NamahaLogo';
import { Utensils, Search, Menu as MenuIcon, X, Sun, Moon, Heart, ShoppingBag } from 'lucide-react';
import { NamahaStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { useCart } from '@/lib/cartContext';

interface NavbarProps {
  selectedTable: number | null;
  onOpenTableSelector: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedTable,
  onOpenTableSelector,
  onOpenSearch,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState('Namahaa Tiffin Room');
  const { theme, toggleTheme } = useTheme();
  const { wishlist, openWishlist, totalCount, openCart } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    
    // Load store info
    const info = NamahaStore.getRestaurantInfo();
    if (info.name) setRestaurantName(info.name);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-namaha-green-dark/95 backdrop-blur-md shadow-md py-2.5 border-b border-namaha-green-DEFAULT/10 dark:border-namaha-gold/20'
          : 'bg-gradient-to-b from-white/90 dark:from-namaha-green-deep/90 via-white/50 dark:via-namaha-green-deep/50 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <NamahaLogo variant="circle" size="sm" className="shadow-md" />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-serif font-bold text-namaha-gold-warm dark:text-namaha-gold tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                {restaurantName}
              </span>
              <span className="text-[10px] uppercase text-namaha-green-bright dark:text-emerald-300 tracking-widest font-sans font-extrabold">
                Pure Veg • Digital QR Menu
              </span>
            </div>
          </Link>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3.5">
            
            {/* Table Badge */}
            <button
              onClick={onOpenTableSelector}
              data-open-table-modal="true"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-namaha-gold/15 dark:bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold-amber dark:text-namaha-gold text-xs font-bold hover:bg-namaha-gold hover:text-namaha-green-deep transition-all duration-300 shadow-sm"
              title="Click to change your table"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{selectedTable ? `Table #${selectedTable}` : 'Select Table'}</span>
              <span className="text-[10px] bg-namaha-gold/30 px-1.5 py-0.5 rounded text-namaha-green-deep dark:text-white font-bold">Change</span>
            </button>

            {/* Top Cart Button */}
            <button
              onClick={openCart}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
                totalCount > 0
                  ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep border-amber-400 font-extrabold scale-102'
                  : 'bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 border-emerald-900/10 dark:border-white/10'
              }`}
              aria-label="Open Shopping Cart"
              title="Your Food Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {totalCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-namaha-green-deep text-namaha-gold font-extrabold text-[10px]">
                  {totalCount}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={openWishlist}
              className="relative p-2 rounded-full bg-amber-50 dark:bg-white/10 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-white/20 transition-all shadow-sm border border-amber-300/40 dark:border-white/10"
              aria-label="View Saved Wishlist"
              title="Saved Wishlist"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center shadow">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Quick Search */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-namaha-green-deep/5 dark:bg-white/10 text-namaha-green-deep dark:text-white text-xs font-semibold hover:bg-namaha-green-deep/10 dark:hover:bg-white/20 border border-namaha-green-deep/10 dark:border-white/15 transition-all"
              >
                <Search className="w-3.5 h-3.5 text-namaha-gold-warm dark:text-namaha-gold" />
                <span>Search Menu...</span>
              </button>
            )}

            {/* Nav Links */}
            <nav className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-gray-200">
              <Link href="#menu" className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Menu
              </Link>
              <Link href="#specials" className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Specials
              </Link>
              <Link href="#about" className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                About
              </Link>
              <Link href="#gallery" className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Gallery
              </Link>
              <Link href="#contact" className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Location
              </Link>
            </nav>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-amber-100 dark:bg-white/10 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-white/20 transition-all shadow-sm border border-amber-300/40 dark:border-white/10"
              aria-label="Toggle Bright / Dark Mode"
              title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Bright Theme'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            
            {/* Mobile Cart Button */}
            <button
              onClick={openCart}
              className={`relative p-1.5 rounded-full border transition-all ${
                totalCount > 0
                  ? 'bg-namaha-gold text-namaha-green-deep border-amber-400 font-bold'
                  : 'bg-amber-50 dark:bg-white/10 text-amber-800 dark:text-amber-300 border-amber-300/40 dark:border-white/10'
              }`}
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white font-bold text-[8px] flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </button>

            {/* Wishlist Mobile */}
            <button
              onClick={openWishlist}
              className="relative p-1.5 rounded-full bg-amber-50 dark:bg-white/10 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-white/10"
              aria-label="Saved Wishlist"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-bold text-[8px] flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Theme Switcher Mobile */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-amber-100 dark:bg-white/10 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-white/10"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Table Badge Mobile */}
            <button
              onClick={onOpenTableSelector}
              data-open-table-modal="true"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold-amber dark:text-namaha-gold text-xs font-bold"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{selectedTable ? `T-${selectedTable}` : 'Table?'}</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-namaha-green-deep/5 dark:bg-white/10 text-namaha-green-deep dark:text-white hover:bg-namaha-green-deep/10 dark:hover:bg-white/20 transition"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-white/98 dark:bg-namaha-green-dark/98 border border-namaha-gold/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-3">
            {onOpenSearch && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold-amber dark:text-namaha-gold font-bold text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Search Foods & Categories</span>
              </button>
            )}

            <nav className="flex flex-col gap-2.5 text-sm font-bold text-slate-800 dark:text-gray-200 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCart();
                }}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm flex items-center justify-between text-left"
              >
                <span>🛒 View Cart</span>
                <span className="font-sans font-bold text-namaha-gold">({totalCount} items)</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openWishlist();
                }}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm flex items-center justify-between text-left"
              >
                <span>❤️ Saved Wishlist</span>
                <span className="font-sans font-bold text-red-400">({wishlist.length})</span>
              </button>

              <Link
                href="#menu"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm"
              >
                📜 Full Menu
              </Link>
              <Link
                href="#specials"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm"
              >
                ⭐ Chef Specials
              </Link>
              <Link
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm"
              >
                🏛️ Our Story
              </Link>
              <Link
                href="#gallery"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm"
              >
                🖼️ Gallery
              </Link>
              <Link
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm"
              >
                📍 Hours & Location
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
