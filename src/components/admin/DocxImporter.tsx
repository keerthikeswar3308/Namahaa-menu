'use client';

import React, { useState, useEffect } from 'react';
import { parseDocxMenu, parseMenuTextContent, ParsedImportResult } from '@/lib/docxParser';
import { Category, GalleryImage, MenuItem } from '@/types';
import { ItemImagePicker } from './ItemImagePicker';
import {
  FileUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  FolderTree,
  Utensils,
  Check,
  RefreshCw,
  Edit3,
  Image as ImageIcon,
  Search,
  Plus,
  X,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface SavedDocxDocument {
  id: string;
  filename: string;
  createdAt: string;
  result: ParsedImportResult;
}

interface DocxImporterProps {
  currentItems: MenuItem[];
  categories: Category[];
  galleryImages: GalleryImage[];
  onImportSuccess: (result: ParsedImportResult, mode: 'replace' | 'merge') => void;
  onDeleteItem: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onSaveItem: (item: MenuItem | Omit<MenuItem, 'id'>) => void;
  onClearAllItems: () => void;
  onResetDefaultMenu: () => void;
}

const STORAGE_KEY_SAVED_DOCS = 'namahaa_saved_word_docs_v1';

export const DocxImporter: React.FC<DocxImporterProps> = ({
  currentItems,
  categories,
  galleryImages,
  onImportSuccess,
  onDeleteItem,
  onDeleteCategory,
  onSaveItem,
  onClearAllItems,
  onResetDefaultMenu,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Side list of saved Word documents
  const [savedDocs, setSavedDocs] = useState<SavedDocxDocument[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [activeImportDoc, setActiveImportDoc] = useState<SavedDocxDocument | null>(null);
  const [showImportChoiceModal, setShowImportChoiceModal] = useState(false);

  // Document Delete Confirmation Modal
  const [docToDelete, setDocToDelete] = useState<SavedDocxDocument | null>(null);
  const [isDeletingAssociated, setIsDeletingAssociated] = useState(false);

  // Live menu search & filter in right column
  const [searchLiveQuery, setSearchLiveQuery] = useState('');
  const [selectedLiveCat, setSelectedLiveCat] = useState('all');

  // Quick edit modal for live dish
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imagePickerItem, setImagePickerItem] = useState<MenuItem | null>(null);

  // Load saved documents from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED_DOCS);
      if (saved) {
        setSavedDocs(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load saved word docs:', e);
    }
  }, []);

  const persistDocs = (docs: SavedDocxDocument[]) => {
    setSavedDocs(docs);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_DOCS, JSON.stringify(docs));
    } catch (e) {
      console.warn('Could not persist word docs:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await parseDocxMenu(selectedFile);
      setParsedData(result);

      const newDoc: SavedDocxDocument = {
        id: `doc-${Date.now()}`,
        filename: selectedFile.name,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        result,
      };

      const updated = [newDoc, ...savedDocs];
      persistDocs(updated);
      setExpandedDocId(newDoc.id);
      setActiveImportDoc(newDoc);
      setShowImportChoiceModal(true);
    } catch (err: any) {
      console.error('Docx parse error:', err);
      setError('Could not parse uploaded document. Please check file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextParse = () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = parseMenuTextContent(rawText);
      setParsedData(result);

      const newDoc: SavedDocxDocument = {
        id: `doc-${Date.now()}`,
        filename: `Pasted_Menu_${new Date().toLocaleTimeString().replace(/\s+/g, '_')}.txt`,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        result,
      };

      const updated = [newDoc, ...savedDocs];
      persistDocs(updated);
      setExpandedDocId(newDoc.id);
      setActiveImportDoc(newDoc);
      setShowImportChoiceModal(true);
    } catch (err: any) {
      setError('Failed to parse text menu content.');
    } finally {
      setLoading(false);
    }
  };

  const executeImport = (mode: 'replace' | 'merge') => {
    const docToImport = activeImportDoc || (parsedData ? { result: parsedData, filename: 'Current Document' } : null);
    if (!docToImport || !docToImport.result || docToImport.result.items.length === 0) return;

    onImportSuccess(docToImport.result, mode);

    if (mode === 'replace') {
      setSuccessMsg(
        `⚡ Completely REPLACED previous menu with ${docToImport.result.items.length} new dishes from "${docToImport.filename}"! Old duplicates cleared.`
      );
    } else {
      setSuccessMsg(
        `➕ MERGED ${docToImport.result.items.length} new dishes into your existing menu!`
      );
    }

    setShowImportChoiceModal(false);
    setActiveImportDoc(null);
  };

  // --- DELETE DOCUMENT WITH ASSOCIATED DISHES & CATEGORIES REMOVAL ---
  const handleConfirmDeleteDocAndDishes = async (doc: SavedDocxDocument) => {
    setIsDeletingAssociated(true);
    try {
      const docItemNames = new Set(doc.result.items.map((i) => i.name.trim().toLowerCase()));
      const docCatNames = new Set(doc.result.categories.map((c) => c.name.trim().toLowerCase()));

      // 1. Delete all matching dishes from live menu
      let deletedDishCount = 0;
      for (const liveItem of currentItems) {
        const matchesName = docItemNames.has(liveItem.name.trim().toLowerCase());
        const matchesCat = docCatNames.has(liveItem.categoryName.trim().toLowerCase());
        if (matchesName || matchesCat) {
          await onDeleteItem(liveItem.id);
          deletedDishCount++;
        }
      }

      // 2. Delete corresponding categories if onDeleteCategory is available
      let deletedCatCount = 0;
      if (onDeleteCategory) {
        for (const cat of categories) {
          if (docCatNames.has(cat.name.trim().toLowerCase())) {
            await onDeleteCategory(cat.id);
            deletedCatCount++;
          }
        }
      }

      // 3. Remove document slide from saved list
      const updated = savedDocs.filter((d) => d.id !== doc.id);
      persistDocs(updated);
      if (expandedDocId === doc.id) setExpandedDocId(null);
      setDocToDelete(null);

      setSuccessMsg(
        `🗑️ Removed "${doc.filename}" and deleted ${deletedDishCount} dishes & ${deletedCatCount} categories from your live menu and Supabase!`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Error deleting doc and associated items:', err);
      setError(`Failed to delete some associated items: ${err.message}`);
    } finally {
      setIsDeletingAssociated(false);
    }
  };

  const handleDeleteDocDraftOnly = (doc: SavedDocxDocument) => {
    const updated = savedDocs.filter((d) => d.id !== doc.id);
    persistDocs(updated);
    if (expandedDocId === doc.id) setExpandedDocId(null);
    setDocToDelete(null);
    setSuccessMsg(`Removed "${doc.filename}" draft. (Live menu items retained).`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleClearAllDocs = () => {
    if (confirm('Are you sure you want to delete all saved Word document drafts?')) {
      persistDocs([]);
      setExpandedDocId(null);
      setParsedData(null);
      setSuccessMsg('All saved Word documents cleared.');
    }
  };

  // Filtered live menu items for the right column
  const filteredLiveItems = currentItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchLiveQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchLiveQuery.toLowerCase());
    const matchesCat = selectedLiveCat === 'all' || item.categoryId === selectedLiveCat || item.categoryName === selectedLiveCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-namaha-gold/20 text-namaha-gold">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-namaha-gold">
              Word Document Menu Importer & Live Editor
            </h2>
            <p className="text-xs text-gray-400">
              Upload menu docs on the left, choose to Replace Full Menu or Add New Items, and manage/delete dishes side by side.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedDocs.length > 0 && (
            <button
              onClick={handleClearAllDocs}
              className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Delete all saved word doc drafts"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Saved Docs</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Are you sure you want to DELETE ALL live menu items? (Clean Slate)')) {
                onClearAllItems();
                setSuccessMsg('Clean slate: All live menu items cleared!');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-red-900/80 hover:bg-red-800 border border-red-500/40 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Wipe current menu items"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Live Menu</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Reset live menu back to original standard dishes?')) {
                onResetDefaultMenu();
                setSuccessMsg('Live menu reset to original default items!');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Reset to default menu"
          >
            <RotateCcw className="w-3.5 h-3.5 text-namaha-gold" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-950 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2-COLUMN SIDE-BY-SIDE INTERFACE */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Upload & Word Document Drafts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Uploader Box */}
          <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
            <h3 className="text-base font-serif font-bold text-namaha-gold flex items-center gap-2">
              <FileUp className="w-4 h-4" /> 1. Upload or Paste Word Menu
            </h3>

            {/* Option 1: File Upload */}
            <div className="border-2 border-dashed border-namaha-gold/40 hover:border-namaha-gold rounded-2xl p-5 text-center bg-white/5 cursor-pointer transition">
              <input
                type="file"
                accept=".docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="side-menu-file-input"
              />
              <label htmlFor="side-menu-file-input" className="cursor-pointer flex flex-col items-center">
                <FileUp className="w-8 h-8 text-namaha-gold mb-1.5" />
                <span className="text-xs font-bold text-white">Click to Select Word (.docx) File</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Auto-parses dishes & categories</span>
                {file && (
                  <span className="mt-2 px-2.5 py-0.5 bg-namaha-gold/20 text-namaha-gold rounded-full text-[10px] font-semibold truncate max-w-full">
                    {file.name}
                  </span>
                )}
              </label>
            </div>

            {/* Option 2: Paste */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-namaha-gold" /> Or Paste Menu Text:
              </span>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:border-namaha-gold"
                placeholder={`IDLY\nIDLY(1)……………20\nSAMBAR IDLY(3)…………70\n\nBENNE DOSAS\nBENNE DOSA…………90`}
              />
              <button
                onClick={handleTextParse}
                disabled={!rawText.trim()}
                className="w-full py-2 px-3 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md disabled:opacity-50 hover:bg-amber-400 transition"
              >
                Parse Menu Text
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-6 text-center text-namaha-gold font-bold animate-pulse bg-namaha-green-dark rounded-3xl border border-namaha-gold/20">
              Parsing menu document...
            </div>
          )}

          {/* Saved Word Documents List */}
          <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-namaha-gold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-namaha-gold" />
                  <span>Word Docs on the Side ({savedDocs.length})</span>
                </h3>
                <span className="text-[10px] text-gray-400">
                  Click to review, apply, or delete at your wish
                </span>
              </div>
            </div>

            {savedDocs.length === 0 ? (
              <div className="p-6 text-center bg-black/30 rounded-2xl border border-white/5 text-gray-400 space-y-1.5">
                <FileUp className="w-7 h-7 mx-auto text-gray-500 opacity-60" />
                <p className="text-xs font-medium text-gray-300">
                  No saved Word documents yet.
                </p>
                <p className="text-[10px] text-gray-400">
                  Upload any .docx file above to save it here on the side.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {savedDocs.map((doc) => {
                  const isExpanded = expandedDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                        isExpanded
                          ? 'bg-black/70 border-namaha-gold ring-1 ring-namaha-gold/40'
                          : 'bg-black/40 border-white/10 hover:border-namaha-gold/30'
                      }`}
                    >
                      {/* Document Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-namaha-gold flex-shrink-0" />
                            <h4 className="font-serif font-bold text-xs text-white truncate" title={doc.filename}>
                              {doc.filename}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2.5 mt-1 text-[10px] text-gray-400">
                            <span><strong className="text-white">{doc.result.items.length}</strong> dishes</span>
                            <span>•</span>
                            <span><strong className="text-white">{doc.result.categories.length}</strong> cats</span>
                            <span>•</span>
                            <span className="text-gray-400">{doc.createdAt}</span>
                          </div>
                        </div>

                        {/* Delete Symbol / Button - Opens Confirmation Modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToDelete(doc);
                          }}
                          className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white transition flex-shrink-0"
                          title="Delete this document and remove associated items"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Action Bar */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                          className="text-[10px] font-semibold text-gray-300 hover:text-namaha-gold flex items-center gap-1 transition"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>View ({doc.result.items.length})</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveImportDoc(doc);
                            setShowImportChoiceModal(true);
                          }}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-extrabold text-[10px] shadow-sm flex items-center gap-1 transition"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Apply / Replace</span>
                        </button>
                      </div>

                      {/* Expandable Preview of Categories and Dishes inside this doc */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-[11px]">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {doc.result.categories.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-namaha-gold/15 text-namaha-gold text-[9px] font-bold">
                                {c.name}
                              </span>
                            ))}
                          </div>

                          <div className="max-h-40 overflow-y-auto divide-y divide-white/5 bg-black/40 p-2 rounded-xl border border-white/5">
                            {doc.result.items.map((item, idx) => (
                              <div key={idx} className="py-1 flex items-center justify-between gap-2">
                                <span className="truncate text-gray-200">{item.name}</span>
                                <span className="font-bold text-namaha-gold flex-shrink-0">₹{item.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Live Menu with Search, Image Linking & Inline Edit (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-namaha-gold" />
                  <span>Current Live Menu ({currentItems.length} Dishes)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Manage, delete, upload images, or replace dishes side-by-side with your Word document.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  {categories.length} Categories
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-namaha-gold absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchLiveQuery}
                  onChange={(e) => setSearchLiveQuery(e.target.value)}
                  placeholder="Search live dishes..."
                  className="w-full pl-9 pr-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:border-namaha-gold focus:outline-none"
                />
              </div>

              <select
                value={selectedLiveCat}
                onChange={(e) => setSelectedLiveCat(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs text-white focus:border-namaha-gold focus:outline-none"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Dishes List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredLiveItems.length === 0 ? (
                <div className="p-8 text-center bg-black/30 rounded-2xl border border-white/5 text-gray-400">
                  No dishes found matching your query.
                </div>
              ) : (
                filteredLiveItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-namaha-gold/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-namaha-green-deep overflow-hidden flex-shrink-0 relative border border-white/10">
                        {/* eslint-disable-next-next/no-img-element */}
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-xs sm:text-sm truncate">{item.name}</h4>
                          <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold text-[9px] font-bold flex-shrink-0">
                            {item.categoryName}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-serif font-bold text-namaha-gold text-xs sm:text-sm">
                        ₹{item.price}
                      </span>

                      {/* Food Photo Button */}
                      <button
                        type="button"
                        onClick={() => setImagePickerItem(item)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-gray-300 transition"
                        title="Upload dish photo to Supabase (food-images)"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Details */}
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-gray-300 transition"
                        title="Edit dish name, price & description"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Item Directly */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${item.name}" from live menu & Supabase?`)) {
                            onDeleteItem(item.id);
                            setSuccessMsg(`Deleted "${item.name}" from live menu!`);
                            setTimeout(() => setSuccessMsg(''), 3000);
                          }
                        }}
                        className="p-2 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white transition"
                        title="Delete this dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: IMPORT CHOICE (REPLACE OR MERGE) */}
      {/* ======================================================== */}
      {showImportChoiceModal && activeImportDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-namaha-gold" />
                <span>Apply Word Menu: {activeImportDoc.filename}</span>
              </h3>
              <button onClick={() => setShowImportChoiceModal(false)} className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1 text-gray-300">
              <div>Parsed Dishes: <strong className="text-white">{activeImportDoc.result.items.length} items</strong></div>
              <div>Detected Categories: <strong className="text-namaha-gold">{activeImportDoc.result.categories.length} categories</strong></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => executeImport('replace')}
                className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-left font-bold text-xs shadow-lg space-y-1 transition"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>Full Replace Menu</span>
                </div>
                <p className="text-[10px] text-white/80 font-normal">
                  Clears all previous dishes and replaces everything with this Word document.
                </p>
              </button>

              <button
                type="button"
                onClick={() => executeImport('merge')}
                className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-left font-bold text-xs shadow-lg space-y-1 transition"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4" />
                  <span>Merge / Add Items</span>
                </div>
                <p className="text-[10px] text-white/80 font-normal">
                  Keeps existing custom items and adds these new dishes on top.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DELETE DOCUMENT SLIDE WITH ASSOCIATED DISHES & CATEGORIES REMOVAL */}
      {/* ======================================================== */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-namaha-green-dark border-2 border-red-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white">
                    Delete Menu Document Slide
                  </h3>
                  <span className="text-[11px] text-gray-400">{docToDelete.filename}</span>
                </div>
              </div>
              
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingAssociated}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-2 text-gray-300">
              <p className="font-semibold text-white">
                How would you like to delete this document slide?
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>Dishes in doc: <strong className="text-white">{docToDelete.result.items.length}</strong></span>
                <span>•</span>
                <span>Categories in doc: <strong className="text-namaha-gold">{docToDelete.result.categories.length}</strong></span>
              </div>
            </div>

            {/* Action Choices */}
            <div className="space-y-3 pt-2">
              {/* Choice 1: Delete Doc AND Remove all associated items from Category & Menu */}
              <button
                type="button"
                disabled={isDeletingAssociated}
                onClick={() => handleConfirmDeleteDocAndDishes(docToDelete)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border border-red-500/50 text-white text-left font-bold text-xs shadow-lg transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-sm font-extrabold text-white block flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-300" />
                    <span>Delete Doc & Remove Associated Dishes from Menu & Categories</span>
                  </span>
                  <span className="text-[10px] text-red-200/80 font-normal mt-0.5 block">
                    Permanently deletes this document draft and all its dishes and categories from your live Supabase menu.
                  </span>
                </div>
                {isDeletingAssociated && (
                  <RefreshCw className="w-5 h-5 animate-spin text-white flex-shrink-0" />
                )}
              </button>

              {/* Choice 2: Delete Document Draft Slide Only */}
              <button
                type="button"
                disabled={isDeletingAssociated}
                onClick={() => handleDeleteDocDraftOnly(docToDelete)}
                className="w-full p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-left font-semibold text-xs transition"
              >
                <span className="text-xs font-bold text-gray-200 block">
                  📄 Delete Document Slide Draft Only
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Removes this slide from the side list without touching your live website menu.
                </span>
              </button>
            </div>

            {/* Cancel */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeletingAssociated}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DISH IMAGE PICKER (SUPABASE FOOD-IMAGES TARGET) */}
      {/* ======================================================== */}
      {imagePickerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-namaha-gold">
                  Upload Photo for &ldquo;{imagePickerItem.name}&rdquo;
                </h3>
                <span className="text-[11px] text-gray-400">Stored in Supabase Storage (food-images)</span>
              </div>
              <button onClick={() => setImagePickerItem(null)} className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ItemImagePicker
              currentUrl={imagePickerItem.image}
              onChangeUrl={(url) => {
                const updated = { ...imagePickerItem, image: url };
                onSaveItem(updated);
                setImagePickerItem(null);
                setSuccessMsg(`Uploaded and linked photo for "${imagePickerItem.name}" to Supabase!`);
                setTimeout(() => setSuccessMsg(''), 4000);
              }}
              galleryImages={galleryImages}
            />

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setImagePickerItem(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: INLINE EDIT DISH DETAILS */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-serif font-bold text-namaha-gold">
                Edit Food Item Details
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Dish Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Price (₹)</label>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-namaha-gold font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Category</label>
                <input
                  type="text"
                  value={editingItem.categoryName}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryName: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveItem(editingItem);
                  setEditingItem(null);
                  setSuccessMsg(`Saved changes to "${editingItem.name}"!`);
                }}
                className="px-5 py-2 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
