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
  CheckCircle2,
  Sparkles,
  GripVertical,
  ArrowUpDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface CategoryManagementProps {
  categories: Category[];
  onSaveCategory: (cat: Category | Omit<Category, 'id'>) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  onReorderCategories?: (reordered: Category[]) => Promise<void> | void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [viewMode, setViewMode] = useState<'orderList' | 'grid'>('orderList');
  const [orderedList, setOrderedList] = useState<Category[]>([]);
  const [orderInputs, setOrderInputs] = useState<Record<string, number>>({});
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    displayOrder: 1,
    isEnabled: true,
  });

  // Keep orderedList in sync with categories props
  useEffect(() => {
    const sorted = [...categories].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );
    setOrderedList(sorted);
    const inputs: Record<string, number> = {};
    sorted.forEach((cat, idx) => {
      inputs[cat.id] = cat.displayOrder || idx + 1;
    });
    setOrderInputs(inputs);
    setHasUnsavedOrder(false);
  }, [categories]);

  const handleOpenAdd = () => {
    setErrorMsg('');
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
    setErrorMsg('');
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description,
      displayOrder: cat.displayOrder || 1,
      isEnabled: cat.isEnabled,
    });
    setIsAddingNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setErrorMsg('');
    setIsSaving(true);

    try {
      if (editingCategory) {
        await onSaveCategory({
          ...editingCategory,
          name: formData.name,
          description: formData.description || '',
          displayOrder: Number(formData.displayOrder) || editingCategory.displayOrder || 1,
          isEnabled: formData.isEnabled ?? true,
        } as Category);
        setSuccessMsg(`Updated category "${formData.name}" in Supabase!`);
      } else {
        await onSaveCategory({
          name: formData.name,
          description: formData.description || '',
          displayOrder: Number(formData.displayOrder) || categories.length + 1,
          isEnabled: formData.isEnabled ?? true,
        });
        setSuccessMsg(`Created new category "${formData.name}" in Supabase!`);
      }

      setTimeout(() => setSuccessMsg(''), 3500);
      setIsAddingNew(false);
      setEditingCategory(null);
    } catch (err: any) {
      console.error('Category save error:', err);
      setErrorMsg(err.message || 'Failed to save category to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 1. Move Step by Step (Up / Down) ---
  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedList.length) return;

    const updated = [...orderedList];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);

    // Re-index display orders
    const finalReordered = updated.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalReordered);
    const newInputs: Record<string, number> = {};
    finalReordered.forEach((c) => {
      newInputs[c.id] = c.displayOrder;
    });
    setOrderInputs(newInputs);

    if (onReorderCategories) {
      try {
        await onReorderCategories(finalReordered);
        setSuccessMsg(`Moved "${item.name}" ${direction === 'up' ? 'Up' : 'Down'} and saved to Supabase!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update category order in Supabase');
      }
    }
  };

  // --- 2. Move to Top or Bottom ---
  const moveToExtreme = async (index: number, position: 'top' | 'bottom') => {
    if (index < 0 || index >= orderedList.length) return;
    const updated = [...orderedList];
    const item = updated.splice(index, 1)[0];

    if (position === 'top') {
      updated.unshift(item);
    } else {
      updated.push(item);
    }

    const finalReordered = updated.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalReordered);
    const newInputs: Record<string, number> = {};
    finalReordered.forEach((c) => {
      newInputs[c.id] = c.displayOrder;
    });
    setOrderInputs(newInputs);

    if (onReorderCategories) {
      try {
        await onReorderCategories(finalReordered);
        setSuccessMsg(`Moved "${item.name}" to the ${position === 'top' ? 'Top (#1)' : 'Bottom'} and saved to Supabase!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update category order in Supabase');
      }
    }
  };

  // --- 3. Manual Number Input with Explicit Save ---
  const handleInputChange = (catId: string, value: string) => {
    const num = parseInt(value, 10);
    setOrderInputs((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : num,
    }));
    setHasUnsavedOrder(true);
  };

  const handleSaveManualOrder = async () => {
    const updated = orderedList.map((cat) => ({
      ...cat,
      displayOrder: orderInputs[cat.id] ?? cat.displayOrder ?? 1,
    }));

    const sorted = [...updated].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    const finalSorted = sorted.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalSorted);
    const newInputs: Record<string, number> = {};
    finalSorted.forEach((c) => {
      newInputs[c.id] = c.displayOrder;
    });
    setOrderInputs(newInputs);
    setHasUnsavedOrder(false);

    if (onReorderCategories) {
      try {
        await onReorderCategories(finalSorted);
        setSuccessMsg('Category order sequence saved & synced to Supabase!');
        setTimeout(() => setSuccessMsg(''), 3500);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save order sequence to Supabase');
      }
    }
  };

  // --- 4. HTML5 Drag and Drop Handlers ---
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...orderedList];
    const draggedItem = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setOrderedList(updated);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    const finalReordered = orderedList.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalReordered);
    const newInputs: Record<string, number> = {};
    finalReordered.forEach((c) => {
      newInputs[c.id] = c.displayOrder;
    });
    setOrderInputs(newInputs);
    setDraggedIndex(null);

    if (onReorderCategories) {
      try {
        await onReorderCategories(finalReordered);
        setSuccessMsg('Category reordered via drag & drop and saved to Supabase!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save drag order to Supabase');
      }
    }
  };

  // --- 5. Quick Sort A-Z ---
  const handleSortAlphabetically = async () => {
    const sorted = [...orderedList].sort((a, b) => a.name.localeCompare(b.name));
    const finalSorted = sorted.map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    setOrderedList(finalSorted);
    const newInputs: Record<string, number> = {};
    finalSorted.forEach((c) => {
      newInputs[c.id] = c.displayOrder;
    });
    setOrderInputs(newInputs);

    if (onReorderCategories) {
      try {
        await onReorderCategories(finalSorted);
        setSuccessMsg('Categories sorted alphabetically (A-Z) and saved to Supabase!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save sorted categories to Supabase');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <FolderTree className="w-6 h-6" /> Category Management & Order Sequence
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Reorder categories using the <strong>Move Up/Down arrows</strong>, <strong>Drag & Drop</strong>, or type custom order numbers. Synced to Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
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
              <span>Order List View</span>
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
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-xs shadow-namaha-gold hover:scale-105 transition-transform flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category</span>
          </button>
        </div>
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

      {/* Quick Action Toolbar for Reordering */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <ArrowUpDown className="w-4 h-4 text-namaha-gold" />
          <span>
            Total: <strong className="text-white">{orderedList.length} Categories</strong>
          </span>
          {hasUnsavedOrder && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] animate-pulse">
              Unsaved Number Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedOrder && (
            <button
              onClick={handleSaveManualOrder}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg hover:scale-105 transition flex items-center gap-1.5 animate-bounce"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Order Sequence to Supabase</span>
            </button>
          )}

          <button
            onClick={handleSortAlphabetically}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white font-semibold text-xs transition"
            title="Sort categories alphabetically A to Z"
          >
            <span>Sort A &rarr; Z</span>
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {(isAddingNew || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
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
                  placeholder="e.g. Benne Dosas"
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
                  Menu Display Order Position (1 = First on customer website)
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
                <span className="text-xs font-medium">Enable Category on Customer Website</span>
              </label>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCategory(null);
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
                  <span>{isSaving ? 'Writing to Supabase...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER LIST VIEW */}
      {viewMode === 'orderList' && (
        <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/30 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                <ListOrdered className="w-5 h-5" /> Live Category Sequence
              </h3>
              <p className="text-xs text-gray-400">
                Click <strong>⬆️ Move Up</strong> or <strong>⬇️ Move Down</strong> to shift order, or drag rows using the grip handle.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                Current Sequence: <strong className="text-white">1 to {orderedList.length}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {orderedList.map((cat, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === orderedList.length - 1;
              const currentVal = orderInputs[cat.id] ?? idx + 1;

              return (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 rounded-2xl bg-black/50 border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    draggedIndex === idx
                      ? 'border-namaha-gold bg-namaha-gold/10 ring-2 ring-namaha-gold scale-102 shadow-2xl'
                      : 'border-white/10 hover:border-namaha-gold/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-namaha-gold transition flex-shrink-0"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-namaha-gold/20 text-namaha-gold font-bold flex items-center justify-center text-sm flex-shrink-0 border border-namaha-gold/40 shadow-inner">
                      #{idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm text-white truncate">{cat.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            cat.isEnabled
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {cat.isEnabled ? 'Active on Menu' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {cat.description || 'Authentic restaurant category'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                    <div className="flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-xl border border-white/20">
                      <span className="text-[10px] text-gray-400 font-bold">Position:</span>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleInputChange(cat.id, e.target.value)}
                        onBlur={() => {
                          if (hasUnsavedOrder) handleSaveManualOrder();
                        }}
                        className="w-10 px-1 py-0.5 bg-white/10 border border-white/20 rounded text-center text-xs font-bold text-namaha-gold focus:border-namaha-gold focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveCategory(idx, 'up')}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-20 disabled:hover:bg-white/10 disabled:hover:text-white"
                      title="Move Up 1 Position"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Up</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveCategory(idx, 'down')}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-20 disabled:hover:bg-white/10 disabled:hover:text-white"
                      title="Move Down 1 Position"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Down</span>
                    </button>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveToExtreme(idx, 'top')}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/20 text-gray-300 hover:text-namaha-gold transition disabled:opacity-20"
                      title="Jump to Top (#1)"
                    >
                      <ChevronsUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveToExtreme(idx, 'bottom')}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/20 text-gray-300 hover:text-namaha-gold transition disabled:opacity-20"
                      title="Jump to Bottom"
                    >
                      <ChevronsDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                      title="Edit Category Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                          try {
                            await onDeleteCategory(cat.id);
                            setSuccessMsg(`Deleted category "${cat.name}" from Supabase!`);
                            setTimeout(() => setSuccessMsg(''), 3000);
                          } catch (err: any) {
                            setErrorMsg(err.message || 'Failed to delete category');
                          }
                        }
                      }}
                      className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARD GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedList.map((cat, idx) => (
            <div
              key={cat.id}
              className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-lg flex flex-col justify-between space-y-4 hover:border-namaha-gold/50 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-namaha-gold/20 text-namaha-gold font-bold text-xs flex items-center justify-center border border-namaha-gold/30">
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
                    onClick={async () => {
                      if (confirm(`Delete category "${cat.name}"?`)) {
                        try {
                          await onDeleteCategory(cat.id);
                          setSuccessMsg(`Deleted category "${cat.name}" from Supabase!`);
                          setTimeout(() => setSuccessMsg(''), 3000);
                        } catch (err: any) {
                          setErrorMsg(err.message || 'Failed to delete category');
                        }
                      }
                    }}
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
