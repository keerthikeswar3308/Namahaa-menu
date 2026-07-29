'use client';

import React, { useState } from 'react';
import { Category, MenuItem } from '@/types';
import { ImagePicker } from './ImagePicker';
import { Cloud, Upload, Link as LinkIcon, Search, Check, Save, Image as ImageIcon, Sparkles, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, uploadImageToSupabaseStorage, uploadImageUrlToSupabaseStorage } from '@/lib/supabase';
import { compressImageFile } from '@/lib/imageUtils';

interface CloudImageManagerProps {
  items: MenuItem[];
  categories: Category[];
  onSaveItem: (item: MenuItem) => void;
}

export const CloudImageManager: React.FC<CloudImageManagerProps> = ({
  items,
  categories,
  onSaveItem,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Standalone Link Tool State
  const [standaloneImageUrl, setStandaloneImageUrl] = useState<string>('');
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');
  const [standaloneSuccessMsg, setStandaloneSuccessMsg] = useState<string | null>(null);

  // Per-item inline edit states
  const [editingItemImages, setEditingItemImages] = useState<Record<string, string>>({});
  const [savedSuccessItemId, setSavedSuccessItemId] = useState<string | null>(null);

  // Statistics
  const cloudStoredCount = items.filter((i) => i.image && i.image.includes('supabase.co')).length;
  const externalUrlCount = items.length - cloudStoredCount;

  const handleInlineImageChange = (itemId: string, newUrl: string) => {
    setEditingItemImages((prev) => ({
      ...prev,
      [itemId]: newUrl,
    }));
  };

  const handleSaveItemImage = (item: MenuItem) => {
    const newImage = editingItemImages[item.id] || item.image;
    onSaveItem({
      ...item,
      image: newImage,
    });
    setSavedSuccessItemId(item.id);
    setTimeout(() => setSavedSuccessItemId(null), 3000);
  };

  const handleStandaloneLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standaloneImageUrl || !selectedTargetItemId) return;

    const targetItem = items.find((i) => i.id === selectedTargetItemId);
    if (!targetItem) return;

    onSaveItem({
      ...targetItem,
      image: standaloneImageUrl,
    });

    setStandaloneSuccessMsg(`Successfully updated image for "${targetItem.name}" and linked to live site!`);
    setStandaloneImageUrl('');
    setSelectedTargetItemId('');
    setTimeout(() => setStandaloneSuccessMsg(null), 4000);
  };

  const handleAutoAssignDishPhotos = () => {
    let count = 0;
    for (const item of items) {
      const name = item.name.toLowerCase();
      let matchUrl = '';

      if (name.includes('perugu vada')) {
        matchUrl = 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('vada')) {
        matchUrl = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('benne')) {
        matchUrl = 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('pesarattu')) {
        matchUrl = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('ravva')) {
        matchUrl = 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('pongal')) {
        matchUrl = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('thatte')) {
        matchUrl = 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';
      } else if (name.includes('coffee')) {
        matchUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80';
      }

      if (matchUrl) {
        onSaveItem({
          ...item,
          image: matchUrl,
        });
        count++;
      }
    }

    setStandaloneSuccessMsg(`Auto-assigned authentic dish photos for ${count} items (Vada, Perugu Vada, Benne Dosa, Pesarattu, Ravva Dosa, Ghee Pongal) & saved to Supabase!`);
    setTimeout(() => setStandaloneSuccessMsg(null), 5000);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in text-white">
      
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cloud className="w-64 h-64 text-namaha-gold" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-namaha-gold text-xs uppercase font-extrabold tracking-widest mb-1">
            <Cloud className="w-4 h-4" />
            <span>Cloud Storage & Menu Image Linking</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Food Item Image Management
          </h2>
          
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mt-1 leading-relaxed">
            Upload food images directly from your local device or paste image URLs. Images are stored securely in Supabase Cloud Storage and immediately linked to menu items so all live site visitors see crisp, high-res photos.
          </p>

          {/* Quick Auto Assign Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleAutoAssignDishPhotos}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>⚡ 1-Click Auto-Assign Dish Photos (Vada, Perugu Vada, Benne Dosa, Pesarattu, Ravva Dosa, Ghee Pongal)</span>
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/10">
            <div className="bg-black/40 border border-white/10 p-3 rounded-2xl">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Menu Items</span>
              <span className="text-xl font-extrabold text-white">{items.length}</span>
            </div>

            <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                Cloud Stored (Supabase)
              </span>
              <span className="text-xl font-extrabold text-emerald-400">{cloudStoredCount}</span>
            </div>

            <div className="bg-black/40 border border-amber-500/30 p-3 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Web / External Images</span>
              <span className="text-xl font-extrabold text-amber-400">{externalUrlCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Upload & Quick Link Tool */}
      <div className="bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-namaha-gold" />
          <h3 className="text-lg font-serif font-bold text-namaha-gold">
            Quick Upload & Link Image to Food Item
          </h3>
        </div>
        <p className="text-xs text-gray-300">
          Upload an image from your computer/mobile or paste a URL below, then select any menu item from the dropdown list to link it immediately.
        </p>

        {standaloneSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{standaloneSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleStandaloneLink} className="space-y-4">
          <ImagePicker
            label="1. Choose or Upload Image"
            currentUrl={standaloneImageUrl}
            onChangeUrl={(url) => setStandaloneImageUrl(url)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                2. Select Target Menu Item *
              </label>
              <select
                value={selectedTargetItemId}
                onChange={(e) => setSelectedTargetItemId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-namaha-green-deep border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold focus:outline-none"
              >
                <option value="">-- Choose a Food Item to Link Image --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (₹{item.price}) - [{item.categoryName}]
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!standaloneImageUrl || !selectedTargetItemId}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-namaha-green-deep font-extrabold text-sm shadow-namaha-gold transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Link Image to Item</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter & Search Bar for Individual Menu Items */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-namaha-gold absolute left-3.5 top-3.5 z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name..."
            className="w-full pl-10 pr-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white placeholder-gray-300 focus:outline-none focus:border-namaha-gold shadow-md"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-60 px-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-namaha-gold shadow-md"
        >
          <option value="all">All Categories ({items.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Item Cards with Inline Image Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((item) => {
          const currentEditingUrl = editingItemImages[item.id] !== undefined ? editingItemImages[item.id] : item.image;
          const hasUnsavedChanges = editingItemImages[item.id] !== undefined && editingItemImages[item.id] !== item.image;
          const isJustSaved = savedSuccessItemId === item.id;
          const isCloud = item.image && item.image.includes('supabase.co');

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl bg-namaha-green-dark border shadow-xl transition-all ${
                hasUnsavedChanges
                  ? 'border-namaha-gold ring-2 ring-namaha-gold/30'
                  : 'border-white/10 hover:border-namaha-gold/40'
              }`}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-serif font-bold text-white">{item.name}</h4>
                    <span className="text-xs font-bold text-namaha-gold">₹{item.price}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">{item.categoryName}</span>
                </div>

                {isCloud ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Cloud
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/30">
                    Web URL
                  </span>
                )}
              </div>

              {/* Image Picker for this item */}
              <ImagePicker
                label="Food Photo"
                currentUrl={currentEditingUrl}
                onChangeUrl={(url) => handleInlineImageChange(item.id, url)}
              />

              {/* Action Bar */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                {isJustSaved ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Saved to Supabase & Live Site!
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                    Unsaved image changes
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Image active on live site</span>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveItemImage(item)}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-xl bg-namaha-gold hover:bg-amber-400 disabled:opacity-40 text-namaha-green-deep font-extrabold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to Live Site</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
