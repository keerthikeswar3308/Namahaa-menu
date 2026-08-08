'use client';

import React, { useState } from 'react';
import { GalleryImage } from '@/types';
import { ItemImagePicker } from './ItemImagePicker';
import { Camera, Plus, Trash2, Edit2, X, Save, Search, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

interface GalleryManagementProps {
  images: GalleryImage[];
  onSaveImage: (img: GalleryImage | Omit<GalleryImage, 'id'>) => Promise<void> | void;
  onDeleteImage: (id: string) => Promise<void> | void;
  onToggleImage: (id: string, enabled: boolean) => Promise<void> | void;
}

export const GalleryManagement: React.FC<GalleryManagementProps> = ({
  images,
  onSaveImage,
  onDeleteImage,
  onToggleImage,
}) => {
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState<Partial<GalleryImage>>({
    title: '',
    category: 'Breakfast',
    url: '',
    isEnabled: true,
  });

  const handleOpenAdd = () => {
    setErrorMsg('');
    setFormData({
      title: '',
      category: 'Breakfast',
      url: '',
      isEnabled: true,
    });
    setEditingImage(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (img: GalleryImage) => {
    setErrorMsg('');
    setEditingImage(img);
    setFormData(img);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url) return;
    setErrorMsg('');
    setIsSaving(true);

    try {
      if (editingImage) {
        await onSaveImage({
          ...editingImage,
          ...formData,
        } as GalleryImage);
        setSuccessMsg(`Updated gallery photo "${formData.title}" in Supabase!`);
      } else {
        await onSaveImage({
          title: formData.title,
          category: formData.category || 'Food',
          url: formData.url,
          isEnabled: formData.isEnabled ?? true,
        });
        setSuccessMsg(`Added gallery photo "${formData.title}" to Supabase!`);
      }

      setTimeout(() => setSuccessMsg(''), 3500);
      setIsAdding(false);
      setEditingImage(null);
    } catch (err: any) {
      console.error('Gallery save error:', err);
      setErrorMsg(err.message || 'Failed to save gallery photo to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique categories for filter
  const categoriesList = Array.from(new Set(images.map((img) => img.category))).filter(Boolean);

  const filteredImages = images.filter((img) => {
    const matchesSearch =
      img.title.toLowerCase().includes(search.toLowerCase()) ||
      img.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || img.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <Camera className="w-6 h-6" /> Restaurant Media Gallery Manager
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Private media library. Upload from device/camera, import via URL, or search food photos into Supabase Storage (<strong>food-images</strong>).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Upload / Add Gallery Photo</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
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
            placeholder="Search gallery photos..."
            className="w-full pl-10 pr-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white placeholder-gray-400 focus:outline-none focus:border-namaha-gold shadow-md"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-60 px-4 py-2.5 bg-emerald-950/90 border-2 border-namaha-gold/40 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-namaha-gold shadow-md"
        >
          <option value="all">All Gallery Categories ({images.length})</option>
          {categoriesList.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Add / Edit Modal */}
      {(isAdding || editingImage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white my-auto max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                {editingImage ? `Edit Photo: ${editingImage.title}` : 'Upload & Add New Gallery Photo'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingImage(null);
                }}
                className="p-1.5 rounded-full bg-white/10 text-gray-300 hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Image Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                  placeholder="e.g. Hot Sambar Vada Dip"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category / Tag</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                  placeholder="Breakfast, Special Dosas, Kitchen..."
                />
              </div>

              {/* Advanced Image Picker Integration */}
              <ItemImagePicker
                label="Gallery Photo Source (Saved to Supabase: food-images)"
                currentUrl={formData.url || ''}
                onChangeUrl={(url) => setFormData({ ...formData, url })}
                galleryImages={images}
              />

              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded text-namaha-gold focus:ring-namaha-gold"
                />
                <span className="text-xs font-medium">Visible on Customer Gallery Section</span>
              </label>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10 sticky bottom-0 bg-namaha-green-dark py-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingImage(null);
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
                  <span>{isSaving ? 'Writing to Supabase...' : 'Save Gallery Image'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredImages.map((img) => (
          <div
            key={img.id}
            className="p-4 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 border border-white/10 bg-black/40">
                {/* eslint-disable-next-next/no-img-element */}
                <img src={getFreshImageUrl(img.url)} alt={img.title} className="w-full h-full object-cover" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-namaha-gold">{img.category}</span>
                <h4 className="font-serif font-bold text-white text-base leading-tight mt-0.5">{img.title}</h4>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={async () => {
                  try {
                    await onToggleImage(img.id, !img.isEnabled);
                  } catch (err: any) {
                    setErrorMsg(err.message || 'Failed to toggle gallery visibility');
                  }
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  img.isEnabled
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-950 text-red-400 border border-red-500/30'
                }`}
              >
                {img.isEnabled ? 'Enabled' : 'Disabled'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(img)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-gray-200 transition"
                  title="Edit Photo Details & Replace Image"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Delete gallery image "${img.title}"?`)) {
                      try {
                        await onDeleteImage(img.id);
                        setSuccessMsg(`Deleted gallery image "${img.title}" from Supabase!`);
                        setTimeout(() => setSuccessMsg(''), 3000);
                      } catch (err: any) {
                        setErrorMsg(err.message || 'Failed to delete gallery image');
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white transition"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
