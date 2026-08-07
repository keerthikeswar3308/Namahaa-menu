'use client';

import React, { useState, useEffect } from 'react';
import { parseDocxMenu, parseMenuTextContent, ParsedImportResult } from '@/lib/docxParser';
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
} from 'lucide-react';

interface SavedDocxDocument {
  id: string;
  filename: string;
  createdAt: string;
  result: ParsedImportResult;
}

interface DocxImporterProps {
  onImportSuccess: (result: ParsedImportResult) => void;
}

const STORAGE_KEY_SAVED_DOCS = 'namahaa_saved_word_docs_v1';

export const DocxImporter: React.FC<DocxImporterProps> = ({ onImportSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Side list of saved Word documents
  const [savedDocs, setSavedDocs] = useState<SavedDocxDocument[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [appliedDocId, setAppliedDocId] = useState<string | null>(null);

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

  // Save to localStorage helper
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

      // Automatically add to the side list of saved documents
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
      setSuccessMsg(`Parsed "${selectedFile.name}" with ${result.items.length} dishes across ${result.categories.length} categories and saved to the side list!`);
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

      // Save to side list
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
      setSuccessMsg(`Parsed text menu with ${result.items.length} items and saved to the side list!`);
    } catch (err: any) {
      setError('Failed to parse text menu content.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDocument = (doc: SavedDocxDocument) => {
    if (!doc.result || doc.result.items.length === 0) return;
    onImportSuccess(doc.result);
    setAppliedDocId(doc.id);
    setSuccessMsg(`Applied all ${doc.result.items.length} dishes from "${doc.filename}" directly to the live customer menu!`);
    setTimeout(() => setAppliedDocId(null), 4000);
  };

  const handleDeleteDocument = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = savedDocs.filter((d) => d.id !== id);
    persistDocs(updated);
    if (expandedDocId === id) setExpandedDocId(null);
    setSuccessMsg('Document removed from your side list.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all saved Word document drafts from the side?')) {
      persistDocs([]);
      setExpandedDocId(null);
      setParsedData(null);
      setSuccessMsg('All saved documents cleared.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-namaha-gold/20 text-namaha-gold">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-namaha-gold">
              Word Document Menu Importer & Drafts
            </h2>
            <p className="text-xs text-gray-400">
              Upload Microsoft Word (.docx) menus or paste text. Documents are saved on the side so you can review, apply, or delete them whenever you wish.
            </p>
          </div>
        </div>

        {savedDocs.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Saved Docs</span>
          </button>
        )}
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

      {/* 2-Column Split: Left Uploader & Right Saved Word Documents on the side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Upload / Paste Section (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Method 1: File Upload */}
            <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-3">
              <h3 className="text-base font-serif font-bold text-namaha-gold flex items-center gap-2">
                <FileUp className="w-4 h-4" /> 1. Upload .docx File
              </h3>
              
              <div className="border-2 border-dashed border-namaha-gold/40 hover:border-namaha-gold rounded-2xl p-5 text-center bg-white/5 cursor-pointer transition">
                <input
                  type="file"
                  accept=".docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="menu-file-input"
                />
                <label htmlFor="menu-file-input" className="cursor-pointer flex flex-col items-center">
                  <FileUp className="w-8 h-8 text-namaha-gold mb-1.5" />
                  <span className="text-xs font-bold text-white">Click to Select Word (.docx) File</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Auto-saves to side list</span>
                  {file && (
                    <span className="mt-2 px-2.5 py-0.5 bg-namaha-gold/20 text-namaha-gold rounded-full text-[10px] font-semibold truncate max-w-full">
                      {file.name}
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Method 2: Direct Paste */}
            <div className="p-5 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-3">
              <h3 className="text-base font-serif font-bold text-namaha-gold flex items-center gap-2">
                <FileText className="w-4 h-4" /> 2. Paste Menu Text
              </h3>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:border-namaha-gold"
                placeholder={`IDLY\nIDLY(1)……………20\nSAMBAR IDLY(3)…………70`}
              />

              <button
                onClick={handleTextParse}
                disabled={!rawText.trim()}
                className="w-full py-2 px-3 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md disabled:opacity-50"
              >
                Parse & Save to Side
              </button>
            </div>

          </div>

          {loading && (
            <div className="p-8 text-center text-namaha-gold font-bold animate-pulse bg-namaha-green-dark rounded-3xl border border-namaha-gold/20">
              Parsing menu document...
            </div>
          )}

          {/* Active Parsed Preview */}
          {parsedData && (
            <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/50 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Current Document Preview ({parsedData.items.length} Items)
                  </h3>
                  <p className="text-xs text-gray-300">
                    Found {parsedData.categories.length} categories. Saved to side list below.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onImportSuccess(parsedData);
                    setSuccessMsg(`Imported ${parsedData.items.length} items to live menu!`);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-xs shadow-namaha-gold hover:scale-105 transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Apply to Live Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-2xl p-2 bg-black/40">
                {parsedData.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold font-bold text-[10px] truncate max-w-[120px]">
                        {item.categoryName}
                      </span>
                      <span className="font-bold text-white truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-namaha-gold ml-2 flex-shrink-0">₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Saved Word Documents on the Side (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/40 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-namaha-gold" />
                  <span>Word Docs on the Side</span>
                </h3>
                <span className="text-[11px] text-gray-400">
                  {savedDocs.length} saved document{savedDocs.length !== 1 ? 's' : ''} in your workspace
                </span>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-namaha-gold/20 text-namaha-gold font-bold text-xs">
                Drafts
              </span>
            </div>

            {savedDocs.length === 0 ? (
              <div className="p-8 text-center bg-black/30 rounded-2xl border border-white/5 text-gray-400 space-y-2">
                <FileUp className="w-8 h-8 mx-auto text-gray-500 opacity-60" />
                <p className="text-xs font-medium text-gray-300">
                  No saved Word documents yet.
                </p>
                <p className="text-[11px] text-gray-400">
                  Upload any .docx file on the left. It will stay saved here on the side for you to review, apply, or delete at your wish.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {savedDocs.map((doc) => {
                  const isExpanded = expandedDocId === doc.id;
                  const isJustApplied = appliedDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isExpanded
                          ? 'bg-black/70 border-namaha-gold ring-1 ring-namaha-gold/40'
                          : 'bg-black/40 border-white/10 hover:border-namaha-gold/30'
                      }`}
                    >
                      {/* Document Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-namaha-gold flex-shrink-0" />
                            <h4 className="font-serif font-bold text-sm text-white truncate" title={doc.filename}>
                              {doc.filename}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Utensils className="w-3 h-3 text-namaha-gold" />
                              <strong className="text-white">{doc.result.items.length}</strong> dishes
                            </span>
                            <span className="flex items-center gap-1">
                              <FolderTree className="w-3 h-3 text-amber-400" />
                              <strong className="text-white">{doc.result.categories.length}</strong> categories
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                              <Clock className="w-2.5 h-2.5" />
                              {doc.createdAt}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button - User's Choice */}
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white transition flex-shrink-0"
                          title="Delete this document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Action Bar */}
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                          className="text-[11px] font-semibold text-gray-300 hover:text-namaha-gold flex items-center gap-1 transition"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide Dishes</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>View Dishes ({doc.result.items.length})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyDocument(doc)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow ${
                            isJustApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-namaha-gold hover:bg-amber-400 text-namaha-green-deep'
                          }`}
                        >
                          {isJustApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Applied!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Apply to Menu</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Expanded Dishes List */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 animate-fade-in max-h-48 overflow-y-auto">
                          {doc.result.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="px-1.5 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold font-bold text-[9px]">
                                  {item.categoryName}
                                </span>
                                <span className="text-white truncate font-medium">{item.name}</span>
                              </div>
                              <span className="font-bold text-namaha-gold ml-2 flex-shrink-0">
                                ₹{item.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
