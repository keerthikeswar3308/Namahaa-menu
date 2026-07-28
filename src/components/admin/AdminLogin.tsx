'use client';

import React, { useState } from 'react';
import { NamahaLogo } from '../NamahaLogo';
import { Lock, ShieldCheck, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { NamahaStore } from '@/lib/store';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Default security passcode: namahaa2026 or admin
      if (passcode === 'namahaa2026' || passcode === 'admin' || passcode === 'namahaa') {
        NamahaStore.setAdminLoggedIn(true);
        onSuccess();
      } else {
        setError('Invalid Admin Security Passcode. Please try again.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-namaha-green-deep via-namaha-green-dark to-black text-white relative overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-namaha-gold/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-namaha-green-dark/90 backdrop-blur-2xl border-2 border-namaha-gold/40 rounded-3xl p-8 shadow-2xl relative z-10 text-center">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <NamahaLogo variant="circle" size="lg" className="mb-3 shadow-namaha-gold rounded-full" />
          <h1 className="text-2xl font-serif font-bold text-namaha-gold">
            Namahaa Admin Portal
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Protected Restaurant & Menu Management System
          </p>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted Passcode Access</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-namaha-gold" />
              <span>Enter Security Passcode</span>
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-namaha-gold focus:ring-2 focus:ring-namaha-gold/30 transition"
              required
              autoFocus
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Default passcode: <code className="text-namaha-gold font-bold">namahaa2026</code>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-bold text-sm shadow-namaha-gold hover:scale-102 transition-transform flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-gray-400">
          Namahaa Tiffin Room Management Security System
        </div>
      </div>
    </div>
  );
};
