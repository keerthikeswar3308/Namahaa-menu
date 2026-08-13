'use client';

import React, { useState } from 'react';
import { RestaurantInfo } from '@/types';
import {
  Settings,
  Save,
  Sparkles,
  CheckCircle2,
  Phone,
  Clock,
  AlertCircle,
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface SettingsManagementProps {
  info: RestaurantInfo;
  onSaveInfo: (info: RestaurantInfo) => Promise<void> | void;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ info, onSaveInfo }) => {
  const [formData, setFormData] = useState<RestaurantInfo>(info);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Credentials State
  const [credCurrentPasscode, setCredCurrentPasscode] = useState('');
  const [credNewUsername, setCredNewUsername] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('namahaa_admin_username') || 'admin' : 'admin'
  );
  const [credNewPasscode, setCredNewPasscode] = useState('');
  const [credConfirmPasscode, setCredConfirmPasscode] = useState('');
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);

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

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    if (credNewPasscode !== credConfirmPasscode) {
      setCredError('New passcodes do not match. Please re-type carefully.');
      return;
    }

    if (credNewPasscode.trim().length < 4) {
      setCredError('New passcode must be at least 4 characters long.');
      return;
    }

    if (credNewUsername.trim().length < 3) {
      setCredError('New username must be at least 3 characters long.');
      return;
    }

    setCredSaving(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('namahaa_admin_token');
        if (token) headers['x-admin-token'] = token;
        const currentPass = localStorage.getItem('namahaa_admin_auth_code') || credCurrentPasscode.trim();
        headers['x-admin-passcode'] = currentPass;
      }

      const res = await fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPasscode: credCurrentPasscode.trim(),
          newUsername: credNewUsername.trim(),
          newPasscode: credNewPasscode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('namahaa_admin_username', data.username);
          localStorage.setItem('namahaa_admin_auth_code', credNewPasscode.trim());
          if (data.token) {
            sessionStorage.setItem('namahaa_admin_token', data.token);
          }
        }
        setCredSuccess(`Credentials updated! Username is now "${data.username}".`);
        setCredCurrentPasscode('');
        setCredNewPasscode('');
        setCredConfirmPasscode('');
        setTimeout(() => setCredSuccess(null), 6000);
      } else {
        setCredError(data.error || 'Failed to update admin credentials');
      }
    } catch (err: any) {
      console.error('Credentials update error:', err);
      setCredError(err.message || 'Network error updating credentials');
    } finally {
      setCredSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-white max-w-4xl">
      
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border border-namaha-gold/20 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
            <Settings className="w-6 h-6" /> Restaurant Settings & Account Security
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Update restaurant branding, hours, contact details, and admin security credentials.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved to Supabase!</span>
          </div>
        )}
      </div>

      {/* --- ADMIN CREDENTIALS & SECURITY SECTION --- */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-namaha-green-dark to-black border-2 border-namaha-gold/40 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-namaha-gold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-namaha-gold" /> Admin Username & Password Management
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Change the login username and security passcode used to access this Admin Portal.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            Security Control
          </span>
        </div>

        {credSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{credSuccess}</span>
          </div>
        )}

        {credError && (
          <div className="p-4 rounded-2xl bg-red-950/90 border border-red-500 text-red-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{credError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Passcode Verification */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-namaha-gold" />
                <span>Current Passcode (for verification) *</span>
              </label>
              <input
                type="password"
                value={credCurrentPasscode}
                onChange={(e) => setCredCurrentPasscode(e.target.value)}
                placeholder="Enter current passcode..."
                required
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold focus:outline-none transition"
              />
            </div>

            {/* New Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-namaha-gold" />
                <span>New Admin Username *</span>
              </label>
              <input
                type="text"
                value={credNewUsername}
                onChange={(e) => setCredNewUsername(e.target.value)}
                placeholder="Enter new username (e.g. admin)..."
                required
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold focus:outline-none transition"
              />
            </div>

            {/* New Passcode */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-namaha-gold" />
                <span>New Security Passcode *</span>
              </label>
              <div className="relative">
                <input
                  type={showCredPassword ? 'text' : 'password'}
                  value={credNewPasscode}
                  onChange={(e) => setCredNewPasscode(e.target.value)}
                  placeholder="Enter new passcode (min 4 chars)..."
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCredPassword(!showCredPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-namaha-gold"
                >
                  {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Passcode */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-namaha-gold" />
                <span>Confirm New Passcode *</span>
              </label>
              <input
                type={showCredPassword ? 'text' : 'password'}
                value={credConfirmPasscode}
                onChange={(e) => setCredConfirmPasscode(e.target.value)}
                placeholder="Re-type new passcode..."
                required
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-namaha-gold focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={credSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-bold text-xs shadow-namaha-gold flex items-center gap-2 disabled:opacity-50 transition"
            >
              {credSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{credSaving ? 'Updating Credentials...' : 'Update Admin Username & Passcode'}</span>
            </button>
          </div>
        </form>
      </div>

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-950 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* --- RESTAURANT INFO FORM --- */}
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
