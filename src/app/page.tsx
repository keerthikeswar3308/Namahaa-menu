'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Category, FilterType, GalleryImage, MenuItem, RestaurantInfo } from '@/types';
import { NamahaStore } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { TableSelectorModal } from '@/components/TableSelectorModal';
import { CategoryNav } from '@/components/CategoryNav';
import { SearchAndFilterBar } from '@/components/SearchAndFilterBar';
import { FoodCard } from '@/components/FoodCard';
import { FoodDetailModal } from '@/components/FoodDetailModal';
import { AboutSection } from '@/components/AboutSection';
import { GallerySection } from '@/components/GallerySection';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { MobileQuickBar } from '@/components/MobileQuickBar';
import { Star, UtensilsCrossed } from 'lucide-react';

export default function HomePage() {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(NamahaStore.getRestaurantInfo());
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // Filtering & Search
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedFoodItem, setSelectedFoodItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Check initial table session
    const currentTable = NamahaStore.getSelectedTable();
    if (currentTable) {
      setSelectedTable(currentTable);
    } else {
      // Auto open table selection prompt on first scan
      setIsTableModalOpen(true);
    }

    // Load local initial cache
    setMenuItems(NamahaStore.getMenuItems());
    setCategories(NamahaStore.getCategories());
    setRestaurantInfo(NamahaStore.getRestaurantInfo());
    setGalleryImages(NamahaStore.getGallery());

    // Asynchronously sync all entities from Supabase
    Promise.all([
      NamahaStore.syncMenuItemsFromSupabase(),
      NamahaStore.syncCategoriesFromSupabase(),
      NamahaStore.syncRestaurantInfoFromSupabase(),
      NamahaStore.syncGalleryFromSupabase(),
    ]).then(([syncedItems, syncedCats, syncedInfo, syncedGallery]) => {
      if (syncedItems && syncedItems.length > 0) setMenuItems(syncedItems);
      if (syncedCats && syncedCats.length > 0) setCategories(syncedCats);
      if (syncedInfo) setRestaurantInfo(syncedInfo);
      if (syncedGallery && syncedGallery.length > 0) setGalleryImages(syncedGallery);
    });
  }, []);

  const handleTableSelected = (tableNum: number) => {
    setSelectedTable(tableNum);
    setIsTableModalOpen(false);
  };

  // Filtered Menu Logic
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.categoryName.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesDesc) return false;
      }

      // Quick Filter Pills
      if (activeFilter === 'veg' && !item.isVeg) return false;
      if (activeFilter === 'popular' && !item.isPopular) return false;
      if (activeFilter === 'chef_special' && !item.isChefSpecial) return false;
      if (activeFilter === 'today_special' && !item.isTodaySpecial) return false;
      if (activeFilter === 'available' && !item.isAvailable) return false;

      return true;
    });
  }, [menuItems, activeCategoryId, searchQuery, activeFilter]);

  // Featured Chef Specials
  const chefSpecials = useMemo(() => {
    return menuItems.filter((i) => i.isChefSpecial || i.isPopular).slice(0, 4);
  }, [menuItems]);

  const handleOpenSearch = () => {
    const el = document.getElementById('menu-search-bar');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-namaha-green-cream dark:bg-namaha-green-deep text-slate-800 dark:text-white flex flex-col justify-between transition-colors duration-300 pb-16 md:pb-0">
      
      {/* 1. Fixed Navbar */}
      <Navbar
        selectedTable={selectedTable}
        onOpenTableSelector={() => setIsTableModalOpen(true)}
        onOpenSearch={handleOpenSearch}
      />

      {/* 2. Table Selector Modal */}
      <TableSelectorModal
        isOpen={isTableModalOpen}
        currentTable={selectedTable}
        onClose={() => setIsTableModalOpen(false)}
        onSelectTable={handleTableSelected}
      />

      {/* 3. Hero Banner */}
      <HeroBanner
        info={restaurantInfo}
        selectedTable={selectedTable}
        onOpenTableSelector={() => setIsTableModalOpen(true)}
      />

      {/* 4. Sticky Category Nav */}
      <CategoryNav
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={(id) => setActiveCategoryId(id)}
      />

      {/* 5. Main Digital Menu Container */}
      <main id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        
        {/* Search & Filter Bar */}
        <div id="menu-search-bar">
          <SearchAndFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            totalResults={filteredItems.length}
          />
        </div>

        {/* Menu Section Title */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-amber-700 dark:text-namaha-gold">
              Digital QR Menu
            </span>
            <h2 className="text-xl sm:text-4xl font-serif font-bold text-namaha-green-deep dark:text-white tracking-tight mt-0.5">
              {activeCategoryId === 'all'
                ? 'All South Indian Delicacies'
                : categories.find((c) => c.id === activeCategoryId)?.name || 'Menu Items'}
            </h2>
          </div>
        </div>

        {/* Food Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {filteredItems.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                onOpenDetails={(food) => setSelectedFoodItem(food)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-namaha-green-dark/80 rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl my-8">
            <UtensilsCrossed className="w-12 h-12 text-amber-600 dark:text-namaha-gold mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-serif font-bold text-namaha-green-deep dark:text-white mb-2">No Matching Dishes Found</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 max-w-md mx-auto mb-6 font-medium">
              We couldn&apos;t find any food items matching your search criteria. Try clearing your search query or selecting another category.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryId('all');
                setActiveFilter('all');
              }}
              className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Featured Chef Specials Carousel / Grid */}
        {chefSpecials.length > 0 && (
          <div id="specials" className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-emerald-950/10 dark:border-namaha-gold/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-700 dark:text-namaha-gold">
                Chef Recommendations
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-namaha-green-deep dark:text-white mb-6 sm:mb-8">
              Namahaa Signature Specials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {chefSpecials.map((item) => (
                <FoodCard
                  key={`special-${item.id}`}
                  item={item}
                  onOpenDetails={(food) => setSelectedFoodItem(food)}
                />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 6. Item Details Modal */}
      <FoodDetailModal
        item={selectedFoodItem}
        onClose={() => setSelectedFoodItem(null)}
      />

      {/* 7. Story / About Section */}
      <AboutSection info={restaurantInfo} />

      {/* 8. Photo Gallery */}
      <GallerySection images={galleryImages} />

      {/* 9. Contact & Location */}
      <ContactSection info={restaurantInfo} />

      {/* 10. Footer */}
      <Footer info={restaurantInfo} />

      {/* 11. Mobile Bottom Floating Quick Bar */}
      <MobileQuickBar
        selectedTable={selectedTable}
        onOpenTableSelector={() => setIsTableModalOpen(true)}
        onOpenSearch={handleOpenSearch}
      />

    </div>
  );
}
