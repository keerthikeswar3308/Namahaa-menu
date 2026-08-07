'use client';

import React, { useState, useRef } from 'react';
import { GalleryImage } from '@/types';
import { Upload, Link as LinkIcon, Images, Check, Image as ImageIcon, FileImage, Sparkles, Cloud, CloudUpload, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, uploadImageViaAdminApi } from '@/lib/supabase';
import { compressImageFile } from '@/lib/imageUtils';

interface ImagePickerProps {
  currentUrl: string;
  onChangeUrl: (url: string) => void;
  galleryImages?: GalleryImage[];
  label?: string;
}

const PRESET_FOOD_IMAGES = [
  { label: 'Crispy Medu Vada', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Perugu Vada (Curd Vada)', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
  { label: 'Davangere Benne Dosa', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
  { label: 'Pesarattu (Moong Dosa)', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Ravva Dosa (Semolina)', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
  { label: 'Ghee Pongal (Khara Pongal)', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80' },
  { label: 'Thatte Idli & Podi', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
  { label: 'Sambar Idly Dip', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Filter Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80' },
];

export const ImagePicker: React.FC<ImagePickerProps> = ({
  currentUrl,
  onChangeUrl,
  galleryImages = [],
  label = 'Food Item Image',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'presets' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploading(true);
    setUploadStatusMsg({ type: 'info', text: 'Compressing and uploading image...' });

    try {
      // 1. Client-side canvas compression so photo is lightweight (~40KB JPEG)
      const compressedDataUrl = await compressImageFile(file);
      onChangeUrl(compressedDataUrl);
      setUrlInput(compressedDataUrl);

      // 2. Upload lightweight compressed Blob to Supabase Storage via server API
      const res = await fetch(compressedDataUrl);
      const compressedBlob = await res.blob();
      const { publicUrl, error } = await uploadImageViaAdminApi(compressedBlob, file.name);
      if (publicUrl) {
        onChangeUrl(publicUrl);
        setUrlInput(publicUrl);
        setUploadStatusMsg({
          type: 'success',
          text: 'Image saved in Supabase Storage (food-menu-images)!',
        });
      } else if (error) {
        setUploadStatusMsg({
          type: 'info',
          text: `Compressed copy ready (Notice: ${error.message})`,
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatusMsg({ type: 'error', text: 'Error uploading image file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveUrlToCloud = async () => {
    if (!urlInput.trim()) return;
    setIsUploading(true);
    setUploadStatusMsg({ type: 'info', text: 'Saving URL to Supabase Storage...' });

    try {
      const { publicUrl, error } = await uploadImageViaAdminApi(urlInput.trim());
      if (publicUrl) {
        onChangeUrl(publicUrl);
        setUrlInput(publicUrl);
        setUploadStatusMsg({
          type: 'success',
          text: 'External URL saved into Supabase Storage CDN!',
        });
      } else {
        onChangeUrl(urlInput);
        setUploadStatusMsg({
          type: 'info',
          text: `URL set. (Notice: ${error?.message || 'kept direct link'})`,
        });
      }
    } catch (err) {
      console.error('URL save error:', err);
      onChangeUrl(urlInput);
      setUploadStatusMsg({ type: 'info', text: 'Direct image URL linked to menu item.' });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const isSupabaseUrl = currentUrl && currentUrl.includes('supabase.co');

  return (
    <div className="space-y-3 bg-slate-900/60 dark:bg-black/40 border border-amber-500/30 dark:border-namaha-gold/30 p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-amber-500 dark:text-namaha-gold uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-amber-500 dark:text-namaha-gold" />
          <span>{label}</span>
        </label>
        
        {/* Live Preview Badge */}
        {currentUrl && (
          <div className="flex items-center gap-2">
            {isSupabaseUrl ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30">
                <Cloud className="w-3 h-3 text-emerald-400" />
                Cloud Stored
              </span>
            ) : (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Selected Image
              </span>
            )}
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500 dark:border-namaha-gold shadow-md relative bg-black/60">
              {/* eslint-disable-next-next/no-img-element */}
              <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl text-xs font-semibold border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'upload' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>📁 Local File</span>
        </button>

        {galleryImages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'gallery' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-md' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Images className="w-4 h-4" />
            <span>Gallery ({galleryImages.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'presets' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'url' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Paste URL</span>
        </button>
      </div>

      {/* Tab 1: Upload File from Computer / Mobile device */}
      {activeTab === 'upload' && (
        <div 
          onClick={triggerFileBrowser}
          className="group relative border-2 border-dashed border-amber-500/50 hover:border-amber-400 rounded-2xl p-6 text-center bg-black/40 hover:bg-black/60 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center shadow-inner"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 group-hover:scale-110 transition-transform">
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileImage className="w-7 h-7" />
            )}
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md mb-1.5 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Image File from Local Device</span>
          </button>

          <p className="text-xs text-gray-300 font-medium">
            Upload from PC / Phone (JPEG, PNG, WEBP). Automatically saved to Supabase Cloud Storage.
          </p>

          {uploadedFileName && (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Loaded File: {uploadedFileName}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Choose from Gallery */}
      {activeTab === 'gallery' && galleryImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1.5 bg-black/50 rounded-xl border border-white/10">
          {galleryImages.map((img) => {
            const isSelected = currentUrl === img.url;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  onChangeUrl(img.url);
                  setUrlInput(img.url);
                }}
                className={`relative h-16 rounded-xl overflow-hidden border-2 transition ${
                  isSelected ? 'border-amber-500 scale-95 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-next/no-img-element */}
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white font-extrabold" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 3: Presets */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 gap-2">
          {PRESET_FOOD_IMAGES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChangeUrl(preset.url);
                setUrlInput(preset.url);
              }}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500 text-left transition"
            >
              {/* eslint-disable-next-next/no-img-element */}
              <img src={preset.url} alt={preset.label} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              <span className="text-xs font-semibold text-white truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab 4: URL Input */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                onChangeUrl(e.target.value);
              }}
              placeholder="Paste image URL (https://...)"
              className="flex-1 px-3.5 py-2.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveUrlToCloud}
              disabled={isUploading || !urlInput.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow"
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>Upload URL to Cloud</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            Paste any web image URL. You can also click &quot;Upload URL to Cloud&quot; to permanently store it in Supabase Storage.
          </p>
        </div>
      )}

      {/* Status Feedback Banner */}
      {uploadStatusMsg && (
        <div
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            uploadStatusMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              : uploadStatusMsg.type === 'error'
              ? 'bg-red-950/80 text-red-300 border border-red-500/40'
              : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
          }`}
        >
          {uploadStatusMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : uploadStatusMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <Cloud className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
          )}
          <span>{uploadStatusMsg.text}</span>
        </div>
      )}
    </div>
  );
};
