'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NamahaLogo } from './NamahaLogo';
import { Utensils, Search, Menu as MenuIcon, X, Sun, Moon, Heart, ShoppingCart, ShoppingBag, ChevronDown, ClipboardList } from 'lucide-react';
import { NamahaStore } from '@/lib/store';
import { OrderStore } from '@/lib/orderStore';
import { getRestaurantBusinessDateStr } from '@/lib/businessDay';
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
  const { wishlist, openWishlist, totalCount, openCart, openOrders, customerOrdersCount } = useCart();

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

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const element = document.getElementById(id);
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    }, 50);
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 dark:bg-[#002624]/98 backdrop-blur-md shadow-md border-b border-[#F9E7C1] dark:border-namaha-gold/20'
          : 'bg-white/98 dark:bg-[#023835]/98 backdrop-blur-md shadow-sm border-b border-[#F9E7C1] dark:border-namaha-gold/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* ======================================================== */}
        {/* MOBILE TOP HEADER (< md) - EXACT REFERENCE DIAGRAM MATCH */}
        {/* ======================================================== */}
        <div className="md:hidden flex flex-col py-1">
          {/* ROW 1: Logo + Large Brand Title (Left) & Hamburger Menu (Right) */}
          <div className="flex items-center justify-between py-1.5">
            <Link href="/" className="flex items-center gap-2.5">
              <NamahaLogo variant="circle" size="sm" />
              <div className="flex flex-col">
                <span className="text-base font-serif font-extrabold text-[#9A3412] dark:text-namaha-gold tracking-wide leading-tight">
                  {restaurantName}
                </span>
                <span className="text-[9px] uppercase text-[#065F46] dark:text-emerald-300 font-sans font-black tracking-wider leading-none">
                  Pure Veg • Authentic Tiffins
                </span>
              </div>
            </Link>

            {/* Hamburger Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-[#FFF4E5] dark:bg-white/10 text-[#D97706] dark:text-namaha-gold border border-[#F9E7C1] dark:border-white/15 shadow-xs active:scale-95 transition"
              aria-label="Toggle Mobile Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* ROW 2: Mobile Action Bar Icons (Cart, Wishlist, Your Orders, Theme) */}
          <div className="flex items-center justify-between pt-1 pb-1.5 border-t border-[#F9E7C1]/60 dark:border-white/10">
            {/* Left: Table Selection Quick Button */}
            <button
              type="button"
              onClick={onOpenTableSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF4E5] dark:bg-namaha-gold/20 border border-[#F9E7C1] dark:border-namaha-gold/40 text-[#B45309] dark:text-namaha-gold font-bold text-xs shadow-xs hover:scale-102 active:scale-95 transition"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{selectedTable ? `Table #${selectedTable}` : NamahaStore.isGeneralMode() ? '🌐 Takeaway' : 'Select Table'}</span>
            </button>

            {/* Right Quick Action Round Icons */}
            <div className="flex items-center gap-2">
              <button
                onClick={openCart}
                className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#FFF4E5] dark:bg-white/10 border border-[#F9E7C1] dark:border-white/15 text-[#D97706] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-white/20 transition active:scale-95 shadow-xs"
                aria-label="View Shopping Cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white font-extrabold text-[9px] flex items-center justify-center shadow-xs leading-none">
                    {totalCount}
                  </span>
                )}
              </button>

              <button
                onClick={openWishlist}
                className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#FFF4E5] dark:bg-white/10 border border-[#F9E7C1] dark:border-white/15 text-[#D97706] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-white/20 transition active:scale-95 shadow-xs"
                aria-label="Saved Wishlist"
              >
                <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              <button
                onClick={openOrders}
                className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#FFF4E5] dark:bg-white/10 border border-[#F9E7C1] dark:border-white/15 text-[#D97706] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-white/20 transition active:scale-95 shadow-xs"
                aria-label="View Placed Orders"
              >
                <ClipboardList className="w-4 h-4" />
                {customerOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-namaha-green-deep font-extrabold text-[9px] flex items-center justify-center shadow-xs leading-none">
                    {customerOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FFF4E5] dark:bg-white/10 border border-[#F9E7C1] dark:border-white/15 text-[#D97706] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-white/20 transition active:scale-95 shadow-xs"
                aria-label="Toggle Bright / Dark Mode"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP TOP NAVBAR (>= md) - PRESERVED UNCHANGED         */}
        {/* ======================================================== */}
        <div className="hidden md:flex items-center justify-between py-3">
          
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
            
            {/* Table Selection Button */}
            <button
              type="button"
              onClick={onOpenTableSelector}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-namaha-gold/15 dark:bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold-amber dark:text-namaha-gold text-xs font-bold shadow-sm hover:scale-102 transition"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{selectedTable ? `Table #${selectedTable}` : NamahaStore.isGeneralMode() ? '🌐 Takeaway / General' : 'Select Table'}</span>
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

            {/* Top Orders Button */}
            <button
              onClick={openOrders}
              className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-white/20 border-emerald-900/10 dark:border-white/10 shadow-sm transition-all"
              aria-label="View Placed Orders"
              title="Your Orders"
            >
              <ClipboardList className="w-4 h-4 text-namaha-gold-warm dark:text-namaha-gold" />
              <span>Your Orders</span>
              {customerOrdersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-namaha-green-deep font-extrabold text-[10px]">
                  {customerOrdersCount}
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
              <button type="button" onClick={() => scrollToSection('menu')} className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Menu
              </button>
              <button type="button" onClick={() => scrollToSection('specials')} className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Specials
              </button>
              <button type="button" onClick={() => scrollToSection('about')} className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                About
              </button>
              <button type="button" onClick={() => scrollToSection('gallery')} className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Gallery
              </button>
              <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-namaha-gold-warm dark:hover:text-namaha-gold transition-colors">
                Location
              </button>
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
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mb-3 p-4 bg-white/98 dark:bg-namaha-green-dark/98 border border-namaha-gold/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-3">
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
                type="button"
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
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openWishlist();
                }}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm flex items-center justify-between text-left"
              >
                <span>❤️ Saved Wishlist</span>
                <span className="font-sans font-bold text-red-400">({wishlist.length})</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('menu')}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm text-left"
              >
                📜 Full Menu
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('specials')}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm text-left"
              >
                ⭐ Chef Specials
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm text-left"
              >
                🏛️ Our Story
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('gallery')}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm text-left"
              >
                🖼️ Gallery
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-namaha-gold-warm text-left"
              >
                📍 Hours & Location
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
