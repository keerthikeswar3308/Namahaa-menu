'use client';

import React, { useState } from 'react';
import { GalleryImage } from '@/types';
import { Upload, Link as LinkIcon, Images, Check, Image as ImageIcon } from 'lucide-react';

interface ImagePickerProps {
  currentUrl: string;
  onChangeUrl: (url: string) => void;
  galleryImages?: GalleryImage[];
  label?: string;
}

const PRESET_FOOD_IMAGES = [
  { label: 'Steamed Idli', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
  { label: 'Sambar Idly / Vada', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Crispy Dosa / Benne', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
  { label: 'Hot Pongal / Snacks', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80' },
];

export const ImagePicker: React.FC<ImagePickerProps> = ({
  currentUrl,
  onChangeUrl,
  galleryImages = [],
  label = 'Food Image Source',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'presets' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(currentUrl);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        onChangeUrl(dataUrl);
        setUrlInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-namaha-gold uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" />
          <span>{label}</span>
        </label>
        
        {/* Live Preview Thumbnail */}
        {currentUrl && (
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-namaha-gold/50 shadow-md relative bg-black/40">
            {/* eslint-disable-next-next/no-img-element */}
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl text-xs font-medium border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
            activeTab === 'upload' ? 'bg-namaha-gold text-namaha-green-deep font-bold shadow' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>

        {galleryImages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === 'gallery' ? 'bg-namaha-gold text-namaha-green-deep font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Gallery ({galleryImages.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
            activeTab === 'presets' ? 'bg-namaha-gold text-namaha-green-deep font-bold shadow' : 'text-gray-300 hover:text-white'
          }`}
        >
          <span>Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
            activeTab === 'url' ? 'bg-namaha-gold text-namaha-green-deep font-bold shadow' : 'text-gray-300 hover:text-white'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>URL</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'upload' && (
        <div className="border-2 border-dashed border-namaha-gold/40 hover:border-namaha-gold rounded-xl p-4 text-center bg-black/20 cursor-pointer transition">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="image-file-upload-input"
          />
          <label htmlFor="image-file-upload-input" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-8 h-8 text-namaha-gold mb-1.5" />
            <span className="text-xs font-bold text-white">Click to Upload Local Image File</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Supports PNG, JPG, WEBP, SVG</span>
          </label>
        </div>
      )}

      {activeTab === 'gallery' && galleryImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-black/40 rounded-xl border border-white/5">
          {galleryImages.map((img) => {
            const isSelected = currentUrl === img.url;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onChangeUrl(img.url)}
                className={`relative h-16 rounded-lg overflow-hidden border-2 transition ${
                  isSelected ? 'border-namaha-gold scale-95 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-next/no-img-element */}
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-namaha-gold/40 flex items-center justify-center">
                    <Check className="w-5 h-5 text-namaha-green-deep font-bold" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 gap-2">
          {PRESET_FOOD_IMAGES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeUrl(preset.url)}
              className="flex items-center gap-2 p-2 rounded-xl bg-black/40 hover:bg-namaha-gold/20 border border-white/10 hover:border-namaha-gold text-left transition"
            >
              {/* eslint-disable-next-next/no-img-element */}
              <img src={preset.url} alt={preset.label} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              <span className="text-xs font-semibold text-white truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'url' && (
        <div>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              onChangeUrl(e.target.value);
            }}
            placeholder="Paste image URL (https://...)"
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-xs text-white placeholder-gray-500 focus:border-namaha-gold"
          />
        </div>
      )}
    </div>
  );
};
