'use client';

import React, { useState, useEffect } from 'react';
import { Category } from '@/types';
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  LayoutGrid,
  Check,
  CheckCircle2,
  Sparkles,
  GripVertical,
} from 'lucide-react';

interface CategoryManagementProps {
  categories: Category[];
  onSaveCategory: (cat: Category | Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories?: (reordered: Category[]) => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'orderList'>('orderList');
  const [orderedList, setOrderedList] = useState<Category[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    displayOrder: 1,
    isEnabled: true,
  });

  // Sync sorted categories by displayOrder
  useEffect(() => {
    const sorted = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setOrderedList(sorted);
  }, [categories]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
      isEnabled: true,
    });
    setEditingCategory(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description,
      displayOrder: cat.displayOrder || 1,
      isEnabled: cat.isEnabled,
    });
    setIsAddingNew(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingCategory) {
      onSaveCategory({
        ...editingCategory,
        name: formData.name,
        description: formData.description || '',
        displayOrder: Number(formData.displayOrder) || editingCategory.displayOrder || 1,
        isEnabled: formData.isEnabled ?? true,
      } as Category);
      setSuccessMsg(`Updated category "${formData.name}"!`);
    } else {
      onSaveCategory({
        name: formData.name,
        description: formData.description || '',
        displayOrder: Number(formData.displayOrder) || categories.length + 1,
        isEnabled: formData.isEnabled ?? true,
      });
      setSuccessMsg(`Created new category "${formData.name}"!`);
    }

    setTimeout(() => setSuccessMsg(''), 3500);
    setIsAddingNew(false);
    setEditingCategory(null);
  };

  // Reordering functions
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedList.length) return;

    const updated = [...orderedList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Update display orders
    const finalReordered = updated.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalReordered);
    if (onReorderCategories) {
      onReorderCategories(finalReordered);
    }
    setSuccessMsg('Category order updated & synced to live customer menu!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDirectOrderChange = (catId: string, newOrder: number) => {
    const updated = orderedList.map((c) =>
      c.id === catId ? { ...c, displayOrder: Math.max(1, newOrder) } : c
    );
    // Sort and re-index
    const finalSorted = [...updated].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalSorted);
    if (onReorderCategories) {
      onReorderCategories(finalSorted);
    }
    setSuccessMsg('Order number saved!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <FolderTree className="w-6 h-6" /> Category Management & Order List
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Customize the exact display order of categories as they appear on the customer website navigation bar.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode('orderList')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'orderList'
                  ? 'bg-namaha-gold text-namaha-green-deep shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Edit Order List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-namaha-gold text-namaha-green-deep shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Card Grid</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-xs shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Modal */}
      {(isAddingNew || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                {editingCategory ? `Edit: ${editingCategory.name}` : 'Create Category'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingCategory(null);
                }}
                className="p-1.5 rounded-full bg-white/10 text-gray-300 hover:text-white"
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

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Display Order Position (1 = First on menu)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-namaha-gold font-bold focus:border-namaha-gold"
                  placeholder="1"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded text-namaha-gold focus:ring-namaha-gold w-4 h-4"
                />
                <span className="text-xs font-medium">Enable Category on Customer Menu</span>
              </label>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCategory(null);
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
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. EDIT ORDER LIST VIEW (Recommended) */}
      {/* ======================================================== */}
      {viewMode === 'orderList' && (
        <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                <ListOrdered className="w-5 h-5" /> Live Category Sequence
              </h3>
              <p className="text-xs text-gray-400">
                Use the <strong className="text-white">Up ⬆️</strong> and <strong className="text-white">Down ⬇️</strong> arrows or change the number to reorder categories.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-namaha-gold/20 text-namaha-gold font-bold text-xs">
              {orderedList.length} Categories Total
            </span>
          </div>

          <div className="space-y-2.5">
            {orderedList.map((cat, idx) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-namaha-gold/40 flex items-center justify-between gap-4 transition group"
              >
                {/* Left: Position & Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-namaha-gold/20 text-namaha-gold font-bold flex items-center justify-center text-xs flex-shrink-0 border border-namaha-gold/40">
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate">{cat.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          cat.isEnabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-950 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {cat.isEnabled ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {cat.description || 'Category specialty'}
                    </p>
                  </div>
                </div>

                {/* Right: Order Input, Arrows, Edit & Delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Quick Order Number Input */}
                  <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                    <span className="text-[10px] text-gray-400 font-bold">Order:</span>
                    <input
                      type="number"
                      min="1"
                      value={cat.displayOrder || idx + 1}
                      onChange={(e) => handleDirectOrderChange(cat.id, Number(e.target.value))}
                      className="w-12 px-1.5 py-0.5 bg-black/60 border border-white/20 rounded-lg text-center text-xs font-bold text-namaha-gold focus:border-namaha-gold"
                    />
                  </div>

                  {/* Move Up ⬆️ Button */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveCategory(idx, 'up')}
                    className="p-2 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white transition disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                    title="Move Category Up in Menu"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  {/* Move Down ⬇️ Button */}
                  <button
                    type="button"
                    disabled={idx === orderedList.length - 1}
                    onClick={() => moveCategory(idx, 'down')}
                    className="p-2 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white transition disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                    title="Move Category Down in Menu"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-2 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CARD GRID VIEW */}
      {/* ======================================================== */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedList.map((cat, idx) => (
            <div
              key={cat.id}
              className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-namaha-gold/20 text-namaha-gold font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <h3 className="text-base font-serif font-bold text-white truncate">{cat.name}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveCategory(idx, 'up')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white transition disabled:opacity-20"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === orderedList.length - 1}
                    onClick={() => moveCategory(idx, 'down')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white transition disabled:opacity-20"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep transition text-gray-200"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-2 rounded-lg bg-red-950/50 hover:bg-red-600 transition text-red-300 hover:text-white"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
