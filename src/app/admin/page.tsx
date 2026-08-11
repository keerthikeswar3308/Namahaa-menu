'use client';

import React, { useState, useEffect } from 'react';
import { Category, GalleryImage, MenuItem, RestaurantInfo } from '@/types';
import { NamahaStore } from '@/lib/store';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview';
import { MenuManagement } from '@/components/admin/MenuManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { SettingsManagement } from '@/components/admin/SettingsManagement';
import { GalleryManagement } from '@/components/admin/GalleryManagement';
import { MenuAssistant } from '@/components/admin/MenuAssistant';
import { DocxImporter } from '@/components/admin/DocxImporter';
import { NamahaLogo } from '@/components/NamahaLogo';
import { ParsedImportResult } from '@/lib/docxParser';
import { LayoutDashboard, Utensils, FolderTree, Settings, Camera, FileUp, LogOut, ExternalLink, ShieldCheck, RefreshCw, Bot } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // App Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(NamahaStore.getRestaurantInfo());
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    setIsAuthenticated(NamahaStore.isAdminLoggedIn());
    loadAllData();
  }, []);

  const loadAllData = async () => {
    // 1. Immediate in-memory render
    setMenuItems(NamahaStore.getMenuItems());
    setCategories(NamahaStore.getCategories());
    setRestaurantInfo(NamahaStore.getRestaurantInfo());
    setGalleryImages(NamahaStore.getGallery());

    // 2. Authoritative Supabase sync
    setIsRefreshing(true);
    try {
      const data = await NamahaStore.syncAllFromSupabase();
      if (data.items && data.items.length > 0) setMenuItems(data.items);
      if (data.categories && data.categories.length > 0) setCategories(data.categories);
      if (data.restaurantInfo) setRestaurantInfo(data.restaurantInfo);
      if (data.gallery && data.gallery.length > 0) setGalleryImages(data.gallery);
    } catch (err) {
      console.warn('Admin load data error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    NamahaStore.setAdminLoggedIn(false);
    setIsAuthenticated(false);
  };

  // --- Handlers ---
  const handleToggleRestaurantOpen = async () => {
    try {
      const updated = await NamahaStore.updateRestaurantInfo({
        isRestaurantOpen: !restaurantInfo.isRestaurantOpen,
      });
      setRestaurantInfo(updated);
    } catch (err: any) {
      alert(`Failed to update restaurant status in Supabase: ${err.message}`);
    }
  };

  const handleSaveMenuItem = async (itemData: MenuItem | Omit<MenuItem, 'id'>) => {
    if ('id' in itemData) {
      await NamahaStore.updateMenuItem(itemData.id, itemData);
    } else {
      await NamahaStore.addMenuItem(itemData);
    }
    await loadAllData();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this food item?')) {
      try {
        await NamahaStore.deleteMenuItem(id);
        await loadAllData();
      } catch (err: any) {
        alert(`Failed to delete menu item from Supabase: ${err.message}`);
      }
    }
  };

  const handleToggleItemStatus = async (id: string, isAvailable: boolean) => {
    try {
      await NamahaStore.updateMenuItem(id, { isAvailable });
      await loadAllData();
    } catch (err: any) {
      alert(`Failed to update availability in Supabase: ${err.message}`);
    }
  };

  const handleSaveCategory = async (catData: Category | Omit<Category, 'id'>) => {
    if ('id' in catData) {
      await NamahaStore.updateCategory(catData.id, catData);
    } else {
      await NamahaStore.addCategory(catData);
    }
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await NamahaStore.deleteCategory(id);
        await loadAllData();
      } catch (err: any) {
        alert(`Failed to delete category from Supabase: ${err.message}`);
      }
    }
  };

  const handleSaveInfo = async (newInfo: RestaurantInfo) => {
    const updated = await NamahaStore.updateRestaurantInfo(newInfo);
    setRestaurantInfo(updated);
    await loadAllData();
  };

  const handleSaveGalleryImage = async (imgData: GalleryImage | Omit<GalleryImage, 'id'>) => {
    if ('id' in imgData) {
      await NamahaStore.updateGalleryImage(imgData.id, imgData);
    } else {
      await NamahaStore.addGalleryImage(imgData);
    }
    await loadAllData();
  };

  const handleDeleteGalleryImage = async (id: string) => {
    try {
      await NamahaStore.deleteGalleryImage(id);
      await loadAllData();
    } catch (err: any) {
      alert(`Failed to delete gallery image from Supabase: ${err.message}`);
    }
  };

  const handleToggleGalleryImage = async (id: string, isEnabled: boolean) => {
    try {
      await NamahaStore.updateGalleryImage(id, { isEnabled });
      await loadAllData();
    } catch (err: any) {
      alert(`Failed to toggle gallery image in Supabase: ${err.message}`);
    }
  };

  const handleDocxImportSuccess = async (result: ParsedImportResult, mode: 'replace' | 'merge' = 'merge') => {
    try {
      if (mode === 'replace') {
        const newCategories: Category[] = result.categories.map((c, idx) => ({
          id: `cat-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || idx + 1}`,
          name: c.name,
          description: c.description || `${c.name} specialties`,
          displayOrder: c.displayOrder || idx + 1,
          isEnabled: true,
        }));

        const newItems: MenuItem[] = result.items.map((i, idx) => {
          const matchCat = newCategories.find(
            (c) => c.name.toLowerCase() === i.categoryName.toLowerCase()
          );
          return {
            id: `item-${Date.now()}-${idx + 1}`,
            name: i.name,
            description: i.description || `Authentic ${i.name.toLowerCase()}`,
            price: i.price,
            categoryId: matchCat ? matchCat.id : newCategories[0]?.id || 'cat-general',
            categoryName: i.categoryName,
            image: i.image || '',
            isVeg: i.isVeg !== false,
            preparationTime: i.preparationTime || '10 mins',
            isAvailable: true,
            displayOrder: i.displayOrder || idx + 1,
          };
        });

        await NamahaStore.replaceAllMenuItems(newItems, newCategories);
        await loadAllData();
        return;
      }

      // Merge mode
      const existingCats = NamahaStore.getCategories();
      let currentCatList = [...existingCats];
      for (const newCat of result.categories) {
        if (!currentCatList.find((c) => c.name.toLowerCase() === newCat.name.toLowerCase())) {
          const addedCat = await NamahaStore.addCategory(newCat);
          currentCatList.push(addedCat);
        }
      }

      for (const item of result.items) {
        const matchCat = currentCatList.find((c) => c.name.toLowerCase() === item.categoryName.toLowerCase());
        if (matchCat) {
          item.categoryId = matchCat.id;
        }
        await NamahaStore.addMenuItem(item);
      }

      await loadAllData();
    } catch (err: any) {
      alert(`Import error syncing to Supabase: ${err.message}`);
    }
  };

  const handleResetMenu = async () => {
    if (confirm('Are you sure you want to reset the menu in Supabase back to default seed?')) {
      try {
        await NamahaStore.resetMenuItems();
        await loadAllData();
      } catch (err: any) {
        alert(`Failed to reset menu in Supabase: ${err.message}`);
      }
    }
  };

  const handleClearAllItems = async () => {
    if (confirm('Are you sure you want to clear all menu items in Supabase?')) {
      try {
        await NamahaStore.clearAllMenuItems();
        await loadAllData();
      } catch (err: any) {
        alert(`Failed to clear menu items in Supabase: ${err.message}`);
      }
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {
      setIsAuthenticated(true);
      loadAllData();
    }} />;
  }

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'menu', label: 'Menu Items', icon: <Utensils className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'import', label: 'Import Word Menu', icon: <FileUp className="w-4 h-4" /> },
    { id: 'gallery', label: 'Gallery', icon: <Camera className="w-4 h-4" /> },
    { id: 'assistant', label: '🤖 Menu Assistant', icon: <Bot className="w-4 h-4 text-namaha-gold" /> },
    { id: 'settings', label: 'Restaurant Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-namaha-green-cream dark:bg-namaha-green-deep text-slate-800 dark:text-white flex flex-col justify-between transition-colors duration-300">
      
      {/* Top Header */}
      <header className="bg-namaha-green-dark border-b border-namaha-gold/20 py-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <NamahaLogo variant="circle" size="sm" />
            <div>
              <h1 className="text-xl font-serif font-bold text-namaha-gold">
                Namahaa Admin Control Center
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supabase Live Sync Active</span>
                {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-namaha-gold ml-1" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAllData()}
              title="Refresh live data from Supabase"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-namaha-gold text-xs font-semibold hover:bg-white/20 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Supabase</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
            >
              <span>View Customer Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-namaha-gold" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-900 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Tabs Navigation Bar */}
      <div className="bg-namaha-green-dark/80 border-b border-white/10 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-namaha-gold text-namaha-green-deep shadow-namaha-gold scale-102'
                    : 'bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white border border-white/5'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'overview' && (
          <AdminDashboardOverview
            items={menuItems}
            categories={categories}
            info={restaurantInfo}
            onToggleRestaurantOpen={handleToggleRestaurantOpen}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onResetMenu={handleResetMenu}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManagement
            items={menuItems}
            categories={categories}
            galleryImages={galleryImages}
            onSaveItem={handleSaveMenuItem}
            onDeleteItem={handleDeleteMenuItem}
            onToggleStatus={handleToggleItemStatus}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManagement
            categories={categories}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onReorderCategories={async (reordered) => {
              await NamahaStore.reorderCategories(reordered);
              await loadAllData();
            }}
          />
        )}

        {activeTab === 'import' && (
          <DocxImporter
            currentItems={menuItems}
            categories={categories}
            galleryImages={galleryImages}
            onImportSuccess={handleDocxImportSuccess}
            onDeleteItem={handleDeleteMenuItem}
            onDeleteCategory={handleDeleteCategory}
            onSaveItem={handleSaveMenuItem}
            onClearAllItems={handleClearAllItems}
            onResetDefaultMenu={handleResetMenu}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryManagement
            images={galleryImages}
            onSaveImage={handleSaveGalleryImage}
            onDeleteImage={handleDeleteGalleryImage}
            onToggleImage={handleToggleGalleryImage}
          />
        )}

        {activeTab === 'assistant' && (
          <MenuAssistant
            items={menuItems}
            categories={categories}
            info={restaurantInfo}
            onRefreshData={loadAllData}
            onSaveItem={handleSaveMenuItem}
            onDeleteItem={handleDeleteMenuItem}
            onToggleStatus={handleToggleItemStatus}
            onSaveCategory={handleSaveCategory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsManagement
            info={restaurantInfo}
            onSaveInfo={handleSaveInfo}
          />
        )}
      </main>

      {/* Admin Footer */}
      <footer className="bg-namaha-green-dark border-t border-white/10 py-5 px-4 text-center space-y-1">
        <p className="text-xs text-gray-400">
          Namahaa Tiffin Room • Secure Admin System & Supabase Live Engine © 2026
        </p>
        <p className="text-[11px] text-gray-400/80 font-normal tracking-wide">
          Developed by Keerthikeswar
        </p>
      </footer>

    </div>
  );
}
