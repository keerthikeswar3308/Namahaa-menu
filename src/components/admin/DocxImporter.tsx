'use client';

import React, { useState } from 'react';
import { parseDocxMenu, parseMenuTextContent, ParsedImportResult } from '@/lib/docxParser';
import { FileUp, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

interface DocxImporterProps {
  onImportSuccess: (result: ParsedImportResult) => void;
}

export const DocxImporter: React.FC<DocxImporterProps> = ({ onImportSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    } catch (err: any) {
      setError('Failed to parse text menu content.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.items.length === 0) return;
    onImportSuccess(parsedData);
    setSuccessMsg(`Successfully imported ${parsedData.items.length} food items across ${parsedData.categories.length} categories!`);
    setParsedData(null);
    setRawText('');
    setFile(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-4xl">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-namaha-gold/20 text-namaha-gold">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-namaha-gold">
              Word Document & Text Menu Importer
            </h2>
            <p className="text-xs text-gray-400">
              Upload your Microsoft Word (.docx) menu file or paste menu text to automatically parse categories, dishes, and prices.
            </p>
          </div>
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

      {/* Input Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Method 1: File Upload */}
        <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
            <FileUp className="w-5 h-5" /> Option 1: Upload .docx File
          </h3>
          
          <div className="border-2 border-dashed border-namaha-gold/40 hover:border-namaha-gold rounded-2xl p-6 text-center bg-white/5 cursor-pointer transition">
            <input
              type="file"
              accept=".docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="menu-file-input"
            />
            <label htmlFor="menu-file-input" className="cursor-pointer flex flex-col items-center">
              <FileUp className="w-10 h-10 text-namaha-gold mb-2" />
              <span className="text-sm font-bold text-white">Click to Select Word (.docx) File</span>
              <span className="text-xs text-gray-400 mt-1">Supports Microsoft Word (.docx) & (.txt) files</span>
              {file && (
                <span className="mt-3 px-3 py-1 bg-namaha-gold/20 text-namaha-gold rounded-full text-xs font-semibold">
                  Selected: {file.name}
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Method 2: Direct Paste */}
        <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Option 2: Paste Menu Text
          </h3>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:border-namaha-gold"
            placeholder={`IDLY\nIDLY(1)………………………………….20\nSAMBAR IDLY(3)………………………70\n\nBENNE DOSAS\nBENNE DOSA………………………………90`}
          />

          <button
            onClick={handleTextParse}
            disabled={!rawText.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md disabled:opacity-50"
          >
            Parse Text Menu Content
          </button>
        </div>

      </div>

      {/* Parsed Preview Table */}
      {loading && (
        <div className="p-8 text-center text-namaha-gold font-bold animate-pulse">
          Parsing menu document...
        </div>
      )}

      {parsedData && (
        <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/50 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-namaha-gold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Import Preview ({parsedData.items.length} Items Parsed)
              </h3>
              <p className="text-xs text-gray-300">
                Found {parsedData.categories.length} distinct categories. Review before importing to live store.
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-105 transition flex items-center gap-2"
            >
              <span>Confirm & Import to Live Menu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-2xl p-2 bg-black/40">
            {parsedData.items.map((item, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-namaha-gold/20 text-namaha-gold font-bold">
                    {item.categoryName}
                  </span>
                  <span className="font-bold text-white">{item.name}</span>
                </div>
                <span className="font-bold text-namaha-gold">₹{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
