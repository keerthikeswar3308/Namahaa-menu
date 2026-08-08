'use client';

import React, { useState } from 'react';
import { RestaurantInfo } from '@/types';
import { Settings, Save, Sparkles, CheckCircle2, Phone, MapPin, Instagram, Clock, Globe, AlertCircle } from 'lucide-react';

interface SettingsManagementProps {
  info: RestaurantInfo;
  onSaveInfo: (info: RestaurantInfo) => Promise<void> | void;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ info, onSaveInfo }) => {
  const [formData, setFormData] = useState<RestaurantInfo>(info);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      await onSaveInfo(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Settings save error:', err);
      setSaveError(err.message || 'Failed to save settings to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-4xl">
      
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <Settings className="w-6 h-6" /> Restaurant Settings & Live Content
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Update restaurant name, branding, phone, address, hours, and announcements stored in Supabase.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved to Supabase!</span>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-950 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Basic Identity */}
        <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles className="w-5 h-5" /> Brand Identity & Hero Text
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Hero Title</label>
            <input
              type="text"
              value={formData.heroTitle}
              onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Announcement Banner Text</label>
            <input
              type="text"
              value={formData.announcementText || ''}
              onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">About Namahaa Story</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
            />
          </div>
        </div>

        {/* Section 2: Contact & Social */}
        <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2 border-b border-white/10 pb-3">
            <Phone className="w-5 h-5" /> Contact Details & Social Links
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Physical Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Google Maps URL</label>
              <input
                type="url"
                value={formData.googleMapsUrl}
                onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Instagram URL</label>
              <input
                type="url"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Operating Status */}
        <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl space-y-4">
          <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2 border-b border-white/10 pb-3">
            <Clock className="w-5 h-5" /> Restaurant Status
          </h3>

          <label className="flex items-center gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRestaurantOpen}
              onChange={(e) => setFormData({ ...formData, isRestaurantOpen: e.target.checked })}
              className="w-5 h-5 rounded text-namaha-gold focus:ring-namaha-gold"
            />
            <div>
              <span className="font-bold text-sm text-white block">Restaurant is Open & Accepting Orders</span>
              <span className="text-xs text-gray-400">Controls the open/closed indicator on the customer website header.</span>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-extrabold text-sm shadow-namaha-gold flex items-center gap-2 disabled:opacity-50 transition"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-namaha-green-deep border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving to Supabase...' : 'Save Settings to Supabase'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
