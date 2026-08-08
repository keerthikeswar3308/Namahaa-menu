'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GalleryImage } from '@/types';
import {
  Upload,
  Camera,
  Link as LinkIcon,
  Search,
  Images,
  Check,
  Image as ImageIcon,
  FileImage,
  Sparkles,
  Cloud,
  CloudUpload,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { isSupabaseConfigured, uploadImageViaAdminApi } from '@/lib/supabase';
import { compressImageToBlob, isValidImageUrl, getFreshImageUrl } from '@/lib/imageUtils';

interface ItemImagePickerProps {
  currentUrl: string;
  onChangeUrl: (url: string) => void;
  galleryImages?: GalleryImage[];
  label?: string;
}

// Preset Curated South Indian Food Photos for Admin Search & Direct Import into Supabase Storage
const CURATED_FOOD_SEARCH_DATABASE: Record<string, Array<{ name: string; url: string }>> = {
  dosa: [
    { name: 'Crispy Davanagere Benne Dosa', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
    { name: 'Paper Masala Dosa', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
    { name: 'Pesarattu Moong Dosa', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
    { name: 'Ravva Dosa', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
    { name: 'Millet Dosa', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
  ],
  idli: [
    { name: 'Steamed Thatte Idli & Podi', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sambar Idly Dip', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
    { name: 'Button Mini Ghee Idli', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
  ],
  vada: [
    { name: 'Crispy Medu Vada', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
    { name: 'Perugu Vada (Curd Vada)', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sambar Vada', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  ],
  coffee: [
    { name: 'Filter Coffee (Degree)', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80' },
    { name: 'South Indian Brass Dabara Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80' },
  ],
  pongal: [
    { name: 'Ghee Khara Pongal', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sweet Sakkarai Pongal', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80' },
  ],
  parota: [
    { name: 'Malabar Parota / Kothu Parota', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  ],
  poori: [
    { name: 'Fluffy Poori Sagu', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  ],
};

export const ItemImagePicker: React.FC<ItemImagePickerProps> = ({
  currentUrl,
  onChangeUrl,
  galleryImages = [],
  label = 'Food Item Image',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'gallery' | 'url' | 'search'>('upload');
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Status & Uploading
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // URL Input State
  const [urlInput, setUrlInput] = useState('');
  const [urlValidating, setUrlValidating] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; url: string }>>([]);

  // Live Camera Web Stream Modal
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Initialize default search results
    handleSearchFoodPhotos('dosa');
  }, []);

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, []);

  const setStatus = (type: 'success' | 'info' | 'error', text: string) => {
    setUploadStatusMsg({ type, text });
    if (type === 'success') {
      setTimeout(() => setUploadStatusMsg(null), 5000);
    }
  };

  // --- 1. DEVICE UPLOAD (LAPTOP / DESKTOP / MOBILE GALLERY) ---
  const processUploadedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('error', 'Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setIsUploading(true);
    setStatus('info', 'Compressing & uploading image to Supabase Storage (food-images)...');

    try {
      // Compress client-side for rapid transmission
      const compressedBlob = await compressImageToBlob(file, 1000, 1000, 0.85);
      
      const { publicUrl, error } = await uploadImageViaAdminApi(compressedBlob, file.name);
      if (publicUrl) {
        const freshUrl = getFreshImageUrl(publicUrl);
        onChangeUrl(freshUrl);
        setStatus('success', 'Image uploaded & saved directly in Supabase Storage (food-images)!');
      } else {
        console.error('Server Upload Error:', error);
        setStatus('error', `Upload Failed: ${error?.message || 'Server storage upload error'}`);
      }
    } catch (err) {
      console.error('File upload error:', err);
      setStatus('error', 'Error compressing/uploading image file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // --- 2. CAMERA CAPTURE HANDLERS ---
  const startWebcamStream = async () => {
    setShowWebcamModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback to mobile input camera if getUserMedia fails
      setShowWebcamModal(false);
      cameraInputRef.current?.click();
    }
  };

  const stopWebcamStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowWebcamModal(false);
  };

  const captureWebcamSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopWebcamStream();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsUploading(true);
      setStatus('info', 'Uploading captured dish photo to Supabase Storage (food-images)...');

      try {
        const { publicUrl, error } = await uploadImageViaAdminApi(blob, `camera-${Date.now()}.jpg`);
        if (publicUrl) {
          const freshUrl = getFreshImageUrl(publicUrl);
          onChangeUrl(freshUrl);
          setStatus('success', 'Captured dish photo uploaded to Supabase Storage (food-images)!');
        } else {
          setStatus('error', `Camera Upload Failed: ${error?.message || 'Could not upload photo'}`);
        }
      } catch (err) {
        setStatus('error', 'Failed to save camera snapshot.');
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.85);
  };

  // --- 3. PASTE IMAGE URL HANDLER ---
  const handleValidateAndImportUrl = async () => {
    if (!urlInput.trim()) return;

    setUrlValidating(true);
    setStatus('info', 'Validating image URL...');

    const valid = await isValidImageUrl(urlInput.trim());
    if (!valid) {
      setStatus('error', 'Invalid image URL or image failed to load.');
      setUrlValidating(false);
      return;
    }

    setIsUploading(true);
    setStatus('info', 'Server downloading external image & saving to Supabase Storage (food-images)...');

    try {
      const { publicUrl, error } = await uploadImageViaAdminApi(urlInput.trim(), `url-${Date.now()}.jpg`);
      if (publicUrl) {
        const freshUrl = getFreshImageUrl(publicUrl);
        onChangeUrl(freshUrl);
        setStatus('success', 'External image URL imported & stored permanently in Supabase Storage!');
        setUrlInput('');
      } else {
        setStatus('error', `URL Import Failed: ${error?.message || 'Could not import image'}`);
      }
    } catch (err: any) {
      setStatus('error', err.message || 'Direct image URL import failed.');
    } finally {
      setIsUploading(false);
      setUrlValidating(false);
    }
  };

  // --- 4. SEARCH FOOD PHOTOS HANDLER ---
  const handleSearchFoodPhotos = (query: string) => {
    const q = query.toLowerCase().trim();
    setSearchQuery(query);

    let matches: Array<{ name: string; url: string }> = [];

    // Check curated dictionary
    Object.keys(CURATED_FOOD_SEARCH_DATABASE).forEach((key) => {
      if (key.includes(q) || q.includes(key)) {
        matches.push(...CURATED_FOOD_SEARCH_DATABASE[key]);
      }
    });

    if (matches.length === 0) {
      // Fallback combined list
      Object.values(CURATED_FOOD_SEARCH_DATABASE).forEach((list) => {
        matches.push(...list);
      });
    }

    setSearchResults(matches);
  };

  const handleSelectSearchResult = async (item: { name: string; url: string }) => {
    setIsUploading(true);
    setStatus('info', `Server downloading & importing "${item.name}" into Supabase Storage (food-images)...`);

    try {
      const { publicUrl, error } = await uploadImageViaAdminApi(item.url, `${item.name.replace(/\s+/g, '-').toLowerCase()}.jpg`);
      if (publicUrl) {
        const freshUrl = getFreshImageUrl(publicUrl);
        onChangeUrl(freshUrl);
        setStatus('success', `Imported "${item.name}" directly to Supabase Storage (food-images)!`);
      } else {
        setStatus('error', `Search Import Failed: ${error?.message || 'Could not import food photo'}`);
      }
    } catch (err: any) {
      setStatus('error', err.message || `Failed to import "${item.name}".`);
    } finally {
      setIsUploading(false);
    }
  };

  const isSupabaseUrl = currentUrl && currentUrl.includes('supabase.co');

  return (
    <div className="space-y-4 bg-slate-950/80 dark:bg-namaha-green-dark border-2 border-namaha-gold/30 p-4 sm:p-5 rounded-3xl text-white shadow-xl">
      
      {/* Label & Active Preview */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <label className="text-xs font-serif font-bold text-namaha-gold uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-namaha-gold" />
            <span>{label}</span>
          </label>
          <p className="text-[11px] text-gray-400">
            Stored in Supabase Cloud Storage (food-images) & synced to live customer site.
          </p>
        </div>

        {currentUrl ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              {isSupabaseUrl ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/30">
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  Supabase Cloud
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/30">
                  CDN Image
                </span>
              )}
            </div>

            <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border-2 border-namaha-gold shadow-lg bg-black/60 flex-shrink-0">
              {/* eslint-disable-next-next/no-img-element */}
              <img src={getFreshImageUrl(currentUrl)} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChangeUrl('')}
                className="absolute inset-0 bg-red-950/80 text-white font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-[10px]"
                title="Remove Image"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30">
            No Image Selected
          </span>
        )}
      </div>

      {/* Tabs Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-black/60 p-1.5 rounded-2xl border border-white/10 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 ${
            activeTab === 'upload' ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 ${
            activeTab === 'camera' ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera</span>
        </button>

        {galleryImages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'gallery' ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold shadow-md' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Gallery ({galleryImages.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 ${
            activeTab === 'url' ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Paste URL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 ${
            activeTab === 'search' ? 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>
      </div>

      {/* --- TAB 1: DEVICE UPLOAD & DRAG/DROP --- */}
      {activeTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center shadow-inner ${
            isDragging
              ? 'border-namaha-gold bg-namaha-gold/20 scale-102'
              : 'border-white/20 hover:border-namaha-gold bg-black/40 hover:bg-black/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-3.5 rounded-2xl bg-namaha-gold/20 text-namaha-gold mb-2">
            {isUploading ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <FileImage className="w-7 h-7" />
            )}
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow-md mb-1 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Image from Laptop / Mobile</span>
          </button>

          <p className="text-[11px] text-gray-300 font-medium mt-1">
            Or drag & drop photo here. Auto-compressed & stored in Supabase Storage (food-images).
          </p>
        </div>
      )}

      {/* --- TAB 2: CAMERA CAPTURE --- */}
      {activeTab === 'camera' && (
        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-center space-y-3">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Mobile Camera / Capture Dish</span>
            </button>

            <button
              type="button"
              onClick={startWebcamStream}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-namaha-gold" />
              <span>Open Laptop / Desktop Camera</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Take a live photo of cooked dish. Automatically compressed & uploaded to Supabase (food-images).
          </p>
        </div>
      )}

      {/* --- TAB 3: GALLERY SELECTION --- */}
      {activeTab === 'gallery' && galleryImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-300">Select any image from your Restaurant Media Library:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-black/50 rounded-2xl border border-white/10">
            {galleryImages.map((img) => {
              const isSelected = currentUrl === img.url;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onChangeUrl(img.url)}
                  className={`relative h-20 rounded-xl overflow-hidden border-2 transition ${
                    isSelected ? 'border-namaha-gold ring-2 ring-namaha-gold/50 scale-95' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-next/no-img-element */}
                  <img src={getFreshImageUrl(img.url)} alt={img.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[9px] font-bold truncate text-white">
                    {img.title}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-namaha-gold/40 flex items-center justify-center">
                      <Check className="w-6 h-6 text-namaha-green-deep font-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 4: PASTE URL --- */}
      {activeTab === 'url' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste public image URL (https://...)"
              className="flex-1 px-3.5 py-2.5 bg-black/60 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:border-namaha-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={handleValidateAndImportUrl}
              disabled={isUploading || urlValidating || !urlInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-bold text-xs shadow disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {isUploading || urlValidating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>Import to Supabase</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Validates image URL & automatically imports a permanent copy into Supabase Storage (food-images).
          </p>
        </div>
      )}

      {/* --- TAB 5: SEARCH FOOD PHOTOS --- */}
      {activeTab === 'search' && (
        <div className="space-y-3">
          {/* Quick Filter Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['Dosa', 'Idli', 'Vada', 'Coffee', 'Pongal', 'Parota', 'Poori'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSearchFoodPhotos(tag)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-namaha-gold hover:text-namaha-green-deep text-[11px] font-bold text-gray-200 transition whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-namaha-gold absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchFoodPhotos(e.target.value)}
              placeholder="Search dish photos (e.g. Masala Dosa, Idli, Coffee...)"
              className="w-full pl-9 pr-4 py-2.5 bg-black/60 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:border-namaha-gold focus:outline-none"
            />
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="group relative h-24 rounded-xl overflow-hidden border border-white/10 hover:border-namaha-gold transition text-left bg-black/40"
              >
                {/* eslint-disable-next-next/no-img-element */}
                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex items-end">
                  <span className="text-[10px] font-bold text-white leading-tight line-clamp-1">{item.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Feedback Banner */}
      {uploadStatusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            uploadStatusMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
              : uploadStatusMsg.type === 'error'
              ? 'bg-red-950/90 text-red-300 border border-red-500/40'
              : 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
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

      {/* WEBCAM CAPTURE MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-namaha-green-dark border-2 border-namaha-gold rounded-3xl p-6 max-w-lg w-full text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
                <Camera className="w-5 h-5" /> Live Dish Camera Stream
              </h4>
              <button onClick={stopWebcamStream} className="p-1 rounded-full bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/20">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={stopWebcamStream}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureWebcamSnapshot}
                className="px-6 py-2.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-lg hover:bg-amber-400 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Dish Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
