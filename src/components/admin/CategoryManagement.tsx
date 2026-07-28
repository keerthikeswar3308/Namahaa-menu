'use client';

import React, { useState } from 'react';
import { Category } from '@/types';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, FolderTree, Save, X } from 'lucide-react';

interface CategoryManagementProps {
  categories: Category[];
  onSaveCategory: (cat: Category | Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    isEnabled: true,
  });

  const handleOpenAdd = () => {
    setFormData({ name: '', description: '', isEnabled: true });
    setEditingCategory(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData(cat);
    setIsAddingNew(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingCategory) {
      onSaveCategory({
        ...editingCategory,
        ...formData,
      } as Category);
    } else {
      onSaveCategory({
        name: formData.name,
        description: formData.description || '',
        displayOrder: categories.length + 1,
        isEnabled: formData.isEnabled ?? true,
      });
    }

    setIsAddingNew(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <FolderTree className="w-6 h-6" /> Category Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Create, rename, reorder, and enable/disable menu categories.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Category</span>
        </button>
      </div>

      {/* Form Modal */}
      {(isAddingNew || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                {editingCategory ? `Rename: ${editingCategory.name}` : 'Create Category'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingCategory(null);
                }}
                className="p-1.5 rounded-full bg-white/10 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                  placeholder="e.g. Special Combos"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
                  placeholder="Short category description..."
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded text-namaha-gold focus:ring-namaha-gold"
                />
                <span className="text-xs font-medium">Enable Category on Live Menu</span>
              </label>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCategory(null);
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
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-serif font-bold text-white">
                  {cat.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    cat.isEnabled
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-950 text-red-400 border border-red-500/30'
                  }`}
                >
                  {cat.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">
                {cat.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-namaha-gold font-medium">Order: #{cat.displayOrder}</span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep transition text-gray-200"
                  title="Edit Category"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-2 rounded-lg bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
                  title="Delete Category"
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
