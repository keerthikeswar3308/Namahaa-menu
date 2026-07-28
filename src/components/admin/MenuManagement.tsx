'use client';

import React, { useState } from 'react';
import { Category, GalleryImage, MenuItem } from '@/types';
import { ImagePicker } from './ImagePicker';
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle, Star, Award, Flame, Save, X } from 'lucide-react';

interface MenuManagementProps {
  items: MenuItem[];
  categories: Category[];
  galleryImages?: GalleryImage[];
  onSaveItem: (item: MenuItem | Omit<MenuItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onToggleStatus: (id: string, isAvailable: boolean) => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  items,
  categories,
  galleryImages = [],
  onSaveItem,
  onDeleteItem,
  onToggleStatus,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 50,
    categoryId: categories[0]?.id || '',
    categoryName: categories[0]?.name || '',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    preparationTime: '10 mins',
    isAvailable: true,
    isPopular: false,
    isChefSpecial: false,
    isTodaySpecial: false,
    chefRecommendation: '',
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      price: 50,
      categoryId: categories[0]?.id || '',
      categoryName: categories[0]?.name || '',
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
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
    setEditingItem(item);
    setFormData(item);
    setIsAddingNew(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === formData.categoryId);
    const payload = {
      ...formData,
      categoryName: cat ? cat.name : (formData.categoryName || 'General'),
      displayOrder: editingItem ? editingItem.displayOrder : items.length + 1,
    };

    if (editingItem) {
      onSaveItem({ ...editingItem, ...payload } as MenuItem);
    } else {
      onSaveItem(payload as Omit<MenuItem, 'id'>);
    }

    setIsAddingNew(false);
    setEditingItem(null);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold">
            Menu Item Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Add, edit food images (via local file, gallery or URL), pricing, descriptions, and stock status.
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

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-namaha-gold absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-namaha-gold"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-60 px-4 py-2.5 bg-namaha-green-deep border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-namaha-gold"
        >
          <option value="all">All Categories ({items.length})</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Edit / Add Modal Form */}
      {(isAddingNew || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto text-white">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <h3 className="text-xl font-serif font-bold text-namaha-gold">
                {editingItem ? `Edit: ${editingItem.name}` : 'Add New Food Item'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingItem(null);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              
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

              {/* Image Picker Integration */}
              <ImagePicker
                label="Food Image Selection"
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

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md hover:bg-amber-400 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Food Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                  onClick={() => onToggleStatus(item.id, !item.isAvailable)}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    item.isAvailable
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-950/80 text-red-400 border border-red-500/30'
                  }`}
                >
                  {item.isAvailable ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{item.isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep transition text-gray-200"
                    title="Edit Item & Image"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2.5 rounded-xl bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
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
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-namaha-green-deep overflow-hidden flex-shrink-0 relative border border-white/10">
                      {/* eslint-disable-next-next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">{item.name}</div>
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
                      onClick={() => onToggleStatus(item.id, !item.isAvailable)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        item.isAvailable
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-950/80 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.isAvailable ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{item.isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep transition text-gray-200"
                        title="Edit Item & Image"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-2 rounded-lg bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
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
