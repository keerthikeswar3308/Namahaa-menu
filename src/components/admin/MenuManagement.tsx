'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Category, GalleryImage, MenuItem } from '@/types';
import { ItemImagePicker } from './ItemImagePicker';
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle, Star, Award, Flame, Save, X, AlertCircle, RefreshCw, Check } from 'lucide-react';

interface MenuManagementProps {
  items: MenuItem[];
  categories: Category[];
  galleryImages?: GalleryImage[];
  onSaveItem: (item: MenuItem | Omit<MenuItem, 'id'>) => Promise<void> | void;
  onDeleteItem: (id: string) => Promise<void> | void;
  onToggleStatus: (id: string, isAvailable: boolean) => Promise<void> | void;
  onBulkToggleStatus?: (itemIds: string[], isAvailable: boolean) => Promise<void> | void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  items,
  categories,
  galleryImages = [],
  onSaveItem,
  onDeleteItem,
  onToggleStatus,
  onBulkToggleStatus,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 50,
    categoryId: categories[0]?.id || '',
    categoryName: categories[0]?.name || '',
    image: '',
    isVeg: true,
    preparationTime: '10 mins',
    isAvailable: true,
    isPopular: false,
    isChefSpecial: false,
    isTodaySpecial: false,
    chefRecommendation: '',
  });

  useEffect(() => {
    if (isAddingNew || editingItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddingNew, editingItem]);

  const handleOpenAdd = () => {
    setSaveError(null);
    setFormData({
      name: '',
      description: '',
      price: 50,
      categoryId: categories[0]?.id || '',
      categoryName: categories[0]?.name || '',
      image: '',
      isVeg: true,
      preparationTime: '10 mins',
      isAvailable: true,
      isPopular: false,
      isChefSpecial: false,
      isTodaySpecial: false,
      chefRecommendation: '',
    });
    setEditingItem(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setSaveError(null);
    setEditingItem(item);
    setFormData(item);
    setIsAddingNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const cat = categories.find((c) => c.id === formData.categoryId);
      const payload = {
        ...formData,
        categoryName: cat ? cat.name : (formData.categoryName || 'General'),
        displayOrder: editingItem ? editingItem.displayOrder : items.length + 1,
      };

      if (editingItem) {
        await onSaveItem({ ...editingItem, ...payload } as MenuItem);
        setSaveSuccessMsg(`Successfully updated "${formData.name}" in Supabase!`);
      } else {
        await onSaveItem(payload as Omit<MenuItem, 'id'>);
        setSaveSuccessMsg(`Successfully added "${formData.name}" to Supabase!`);
      }

      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setIsAddingNew(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error('Menu save error:', err);
      setSaveError(err.message || 'Failed to save menu item to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStock = async (id: string, nextStatus: boolean, itemName: string) => {
    setUpdatingItemIds((prev) => new Set(prev).add(id));
    try {
      await onToggleStatus(id, nextStatus);
      setToastMessage(`"${itemName}" is now ${nextStatus ? 'In Stock ✓' : 'Out of Stock ✕'}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      console.error('Toggle stock error:', e);
    } finally {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkSetStock = async (isAvailable: boolean) => {
    if (!onBulkToggleStatus) return;
    const targetIds = filteredItems.map((i) => i.id);
    if (targetIds.length === 0) return;

    const actionLabel = isAvailable ? 'In Stock' : 'Out of Stock';
    const confirmMsg = `Mark all ${targetIds.length} currently listed item(s) as ${actionLabel}?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBulkUpdating(true);
    try {
      await onBulkToggleStatus(targetIds, isAvailable);
      setToastMessage(`All ${targetIds.length} item(s) marked as ${actionLabel} ✓`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      console.error('Bulk update error:', e);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const inStockCount = useMemo(() => items.filter((i) => i.isAvailable !== false).length, [items]);
  const outOfStockCount = useMemo(() => items.filter((i) => i.isAvailable === false).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(search.toLowerCase());

      let matchesCat = selectedCategory === 'all';
      if (!matchesCat) {
        const selectedCatObj = categories.find((c) => c.id === selectedCategory);
        const selectedCatName = selectedCatObj?.name?.trim().toLowerCase();

        const matchesId = item.categoryId === selectedCategory;
        const matchesName = Boolean(
          selectedCatName &&
          item.categoryName &&
          item.categoryName.trim().toLowerCase() === selectedCatName
        );

        matchesCat = matchesId || matchesName;
      }

      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = item.isAvailable !== false;
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = item.isAvailable === false;
      }

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [items, search, selectedCategory, categories, stockFilter]);

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold">
            Menu Item Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Add & edit menu items, photos (Laptop/Mobile Upload, Camera, Gallery, Search, URL), pricing, descriptions, and live stock status.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Menu Item</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-namaha-green-deep to-emerald-950 border-2 border-namaha-gold/70 text-white text-sm font-bold flex items-center justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-namaha-gold shrink-0 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-namaha-gold/20 text-namaha-gold border border-namaha-gold/40">
            Live Website Updated
          </span>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-namaha-gold absolute left-3.5 top-3.5 z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white placeholder-gray-300 focus:outline-none focus:border-namaha-gold shadow-md"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-60 px-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-namaha-gold shadow-md"
        >
          <option value="all">All Categories ({items.length})</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Instant Stock Status Filters & Bulk Update Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-namaha-green-dark/80 border border-namaha-gold/30 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold uppercase tracking-wider text-namaha-gold mr-1 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-namaha-gold" /> Filter By Stock:
          </span>
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-namaha-gold text-namaha-green-deep shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-gray-300'
            }`}
          >
            <span>All Items</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
              {items.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>In Stock</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
              {inStockCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stockFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Out of Stock</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
              {outOfStockCount}
            </span>
          </button>
        </div>

        {/* Bulk Stock Controls */}
        {onBulkToggleStatus && filteredItems.length > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkSetStock(true)}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              title="Mark all currently listed items as In Stock"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Filtered In Stock ({filteredItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkSetStock(false)}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              title="Mark all currently listed items as Out of Stock"
            >
              <X className="w-3.5 h-3.5" />
              <span>Mark Filtered Out of Stock ({filteredItems.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit / Add Viewport-Centered Fixed Modal Dialog via React Portal */}
      {mounted && (isAddingNew || editingItem) && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl shadow-2xl text-white max-h-[90vh] flex flex-col overflow-hidden my-auto animate-fade-in">
            
            {/* Fixed Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-namaha-green-dark">
              <h3 className="text-xl font-serif font-bold text-namaha-gold">
                {editingItem ? `Edit: ${editingItem.name}` : 'Add New Food Item'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingItem(null);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {saveError && (
                <div className="p-3.5 rounded-xl bg-red-950 border border-red-500 text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Food Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                    placeholder="e.g. Ghee Sambar Idly"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                    placeholder="90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => {
                    const cat = categories.find((c) => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      categoryId: e.target.value,
                      categoryName: cat ? cat.name : '',
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-namaha-green-deep border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advanced Production Image Section */}
              <ItemImagePicker
                label="Food Dish Photo Selection (Saved to Supabase Storage: food-images)"
                currentUrl={formData.image || ''}
                onChangeUrl={(url) => setFormData({ ...formData, image: url })}
                galleryImages={galleryImages}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                  placeholder="Describe ingredients, cooking style, chutneys..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Preparation Time</label>
                  <input
                    type="text"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                    placeholder="10 mins"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Chef Recommendation Note</label>
                  <input
                    type="text"
                    value={formData.chefRecommendation || ''}
                    onChange={(e) => setFormData({ ...formData, chefRecommendation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                    placeholder="Optional recommendation..."
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="rounded text-namaha-gold focus:ring-namaha-gold"
                  />
                  <span className="text-xs font-medium">In Stock</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="rounded text-namaha-gold focus:ring-namaha-gold"
                  />
                  <span className="text-xs font-medium">Popular</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isChefSpecial}
                    onChange={(e) => setFormData({ ...formData, isChefSpecial: e.target.checked })}
                    className="rounded text-namaha-gold focus:ring-namaha-gold"
                  />
                  <span className="text-xs font-medium">Chef Special</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTodaySpecial}
                    onChange={(e) => setFormData({ ...formData, isTodaySpecial: e.target.checked })}
                    className="rounded text-namaha-gold focus:ring-namaha-gold"
                  />
                  <span className="text-xs font-medium">Today Special</span>
                </label>
              </div>

              {/* Sticky Action Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-white/10 sticky bottom-0 bg-namaha-green-dark py-2 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingItem(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md hover:bg-amber-400 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-namaha-green-deep border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Writing to Supabase...' : 'Save Food Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Food Items - Mobile Cards & Desktop Table */}
      <div className="bg-namaha-green-dark border border-namaha-gold/20 rounded-3xl overflow-hidden shadow-xl">
        
        {/* Mobile View (sm:hidden) */}
        <div className="sm:hidden divide-y divide-white/10">
          {filteredItems.map((item) => (
            <div key={`mob-${item.id}`} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-namaha-green-deep overflow-hidden flex-shrink-0 relative border border-white/10">
                  {/* eslint-disable-next-next/no-img-element */}
                  <img src={item.image || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-base truncate">{item.name}</h4>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-semibold text-namaha-gold">{item.categoryName}</span>
                    <span className="text-sm font-extrabold text-white">₹{item.price}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {item.isPopular && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Popular</span>
                )}
                {item.isChefSpecial && (
                  <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold text-[10px] font-bold">Chef Special</span>
                )}
                {item.isTodaySpecial && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold">Today Special</span>
                )}
              </div>

              {/* Status & Actions Bar */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStock(item.id, !item.isAvailable, item.name);
                  }}
                  disabled={updatingItemIds.has(item.id)}
                  className={`group/toggle relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 shadow-md cursor-pointer select-none ${
                    item.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border-2 border-emerald-500/70 hover:bg-emerald-900 shadow-emerald-950/60'
                      : 'bg-rose-950 text-rose-300 border-2 border-rose-500/70 hover:bg-rose-900 shadow-rose-950/60'
                  } ${updatingItemIds.has(item.id) ? 'opacity-70 cursor-wait' : ''}`}
                  title={item.isAvailable ? 'Click to mark OUT OF STOCK' : 'Click to mark IN STOCK'}
                  aria-label={`Toggle stock status for ${item.name}`}
                >
                  {/* Sliding Knob Track */}
                  <span
                    className={`relative inline-block w-8 h-4 rounded-full transition-colors duration-200 ${
                      item.isAvailable ? 'bg-emerald-500' : 'bg-rose-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 inline-block w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                        item.isAvailable ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>

                  <span className="font-extrabold text-[11px] tracking-wide whitespace-nowrap">
                    {updatingItemIds.has(item.id) ? (
                      <span className="flex items-center gap-1 text-amber-300">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                      </span>
                    ) : item.isAvailable ? (
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> In Stock
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" /> Out of Stock
                      </span>
                    )}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    title="Edit Food Details, Image & Price"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 rounded-xl bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-200">
            <thead className="bg-namaha-green-deep text-xs font-semibold uppercase text-namaha-gold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Badges</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td 
                    onClick={() => handleOpenEdit(item)}
                    className="px-6 py-4 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-namaha-green-deep overflow-hidden flex-shrink-0 relative border border-white/10 group-hover:border-amber-500 transition-colors">
                      {/* eslint-disable-next-next/no-img-element */}
                      <img src={item.image || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-base group-hover:text-amber-400 transition-colors flex items-center gap-2">
                        <span>{item.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-namaha-gold">
                    {item.categoryName}
                  </td>
                  <td className="px-6 py-4 font-bold text-white font-sans text-base">
                    ₹{item.price}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.isPopular && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Popular</span>
                      )}
                      {item.isChefSpecial && (
                        <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold text-[10px] font-bold">Chef Special</span>
                      )}
                      {item.isTodaySpecial && (
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold">Today Special</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStock(item.id, !item.isAvailable, item.name);
                      }}
                      disabled={updatingItemIds.has(item.id)}
                      className={`group/toggle relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 shadow-md cursor-pointer select-none ${
                        item.isAvailable
                          ? 'bg-emerald-950 text-emerald-300 border-2 border-emerald-500/70 hover:bg-emerald-900 shadow-emerald-950/60'
                          : 'bg-rose-950 text-rose-300 border-2 border-rose-500/70 hover:bg-rose-900 shadow-rose-950/60'
                      } ${updatingItemIds.has(item.id) ? 'opacity-70 cursor-wait' : ''}`}
                      title={item.isAvailable ? 'Click to mark OUT OF STOCK' : 'Click to mark IN STOCK'}
                      aria-label={`Toggle stock status for ${item.name}`}
                    >
                      {/* Sliding Knob Track */}
                      <span
                        className={`relative inline-block w-8 h-4 rounded-full transition-colors duration-200 ${
                          item.isAvailable ? 'bg-emerald-500' : 'bg-rose-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 inline-block w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                            item.isAvailable ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </span>

                      <span className="font-extrabold text-[11px] tracking-wide whitespace-nowrap">
                        {updatingItemIds.has(item.id) ? (
                          <span className="flex items-center gap-1 text-amber-300">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                          </span>
                        ) : item.isAvailable ? (
                          <span className="flex items-center gap-1 text-emerald-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> In Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-300">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Out of Stock
                          </span>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                        title="Edit Food Details, Image & Price"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-2 rounded-xl bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
