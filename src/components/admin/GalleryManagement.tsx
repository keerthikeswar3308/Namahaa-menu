'use client';

import React, { useState } from 'react';
import { GalleryImage } from '@/types';
import { ImagePicker } from './ImagePicker';
import { Camera, Plus, Trash2, Edit2, CheckCircle, XCircle, X, Save, RefreshCw } from 'lucide-react';
import { NamahaStore } from '@/lib/store';

interface GalleryManagementProps {
  images: GalleryImage[];
  onSaveImage: (img: GalleryImage | Omit<GalleryImage, 'id'>) => void;
  onDeleteImage: (id: string) => void;
  onToggleImage: (id: string, enabled: boolean) => void;
}

export const GalleryManagement: React.FC<GalleryManagementProps> = ({
  images,
  onSaveImage,
  onDeleteImage,
  onToggleImage,
}) => {
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<GalleryImage>>({
    title: '',
    category: 'Breakfast',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    isEnabled: true,
  });

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'Breakfast',
      url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
      isEnabled: true,
    });
    setEditingImage(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (img: GalleryImage) => {
    setEditingImage(img);
    setFormData(img);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url) return;

    if (editingImage) {
      onSaveImage({
        ...editingImage,
        ...formData,
      } as GalleryImage);
    } else {
      onSaveImage({
        title: formData.title,
        category: formData.category || 'Food',
        url: formData.url,
        isEnabled: formData.isEnabled ?? true,
      });
    }

    setIsAdding(false);
    setEditingImage(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <Camera className="w-6 h-6" /> Gallery Image Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Upload local image files, select preset food images, edit existing titles/URLs, or delete gallery photos.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Upload / Add Gallery Image</span>
        </button>
      </div>

      {/* Add / Edit Modal */}
      {(isAdding || editingImage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white my-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                {editingImage ? `Edit Gallery Photo: ${editingImage.title}` : 'Add Gallery Photo'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingImage(null);
                }}
                className="p-1.5 rounded-full bg-white/10 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

              {/* Image Picker Integration */}
              <ImagePicker
                label="Gallery Photo Source"
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

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingImage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md hover:bg-amber-400 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Gallery Image</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="p-4 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 border border-white/10 bg-black/40">
                {/* eslint-disable-next-next/no-img-element */}
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-namaha-gold">{img.category}</span>
                <h4 className="font-serif font-bold text-white text-base leading-tight mt-0.5">{img.title}</h4>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => onToggleImage(img.id, !img.isEnabled)}
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
                  title="Edit Image Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteImage(img.id)}
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
