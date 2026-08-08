'use client';

import React from 'react';
import Link from 'next/link';
import { NamahaLogo } from './NamahaLogo';
import { RestaurantInfo } from '@/types';
import { Instagram, MapPin, Phone, Heart } from 'lucide-react';

interface FooterProps {
  info: RestaurantInfo;
}

export const Footer: React.FC<FooterProps> = ({ info }) => {
  return (
    <footer className="bg-namaha-green-deep border-t border-namaha-gold/30 pt-16 pb-24 sm:pb-12 px-4 sm:px-6 lg:px-8 text-white relative shadow-2xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        
        {/* Col 1: Brand Logo & Tagline */}
        <div className="md:col-span-1 space-y-4">
          <NamahaLogo variant="circle" size="md" className="shadow-lg bg-white p-1 rounded-full" />
          <h3 className="text-xl font-serif font-bold text-namaha-gold">
            {info.name}
          </h3>
          <p className="text-xs text-gray-300 italic font-medium">
            &ldquo;{info.tagline}&rdquo;
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-500/40 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>100% Pure Vegetarian</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-sm font-bold text-namaha-gold uppercase tracking-wider mb-4">
            Quick Navigation
          </h4>
          <ul className="space-y-2.5 text-sm text-gray-200 font-medium">
            <li>
              <Link href="#menu" className="hover:text-namaha-gold transition">
                📜 Digital Menu
              </Link>
            </li>
            <li>
              <Link href="#specials" className="hover:text-namaha-gold transition">
                ⭐ Chef Specials
              </Link>
            </li>
            <li>
              <Link href="#about" className="hover:text-namaha-gold transition">
                🏛️ Our Story & Heritage
              </Link>
            </li>
            <li>
              <Link href="#gallery" className="hover:text-namaha-gold transition">
                🖼️ Restaurant Gallery
              </Link>
            </li>
            <li>
              <Link href="#contact" className="hover:text-namaha-gold transition">
                📍 Location & Hours
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact & Social */}
        <div>
          <h4 className="text-sm font-bold text-namaha-gold uppercase tracking-wider mb-4">
            Contact & Connect
          </h4>
          <ul className="space-y-3 text-sm text-gray-200 font-medium">
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-namaha-gold flex-shrink-0" />
              <span>{info.phone}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-namaha-gold flex-shrink-0 mt-1" />
              <span className="text-xs leading-relaxed">{info.address}</span>
            </li>
            <li className="pt-2">
              <a
                href={info.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:scale-105 transition"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram Profile</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Timings */}
        <div>
          <h4 className="text-sm font-bold text-namaha-gold uppercase tracking-wider mb-4">
            Restaurant Timings
          </h4>
          <div className="space-y-2 text-xs text-gray-200 font-medium">
            {info.openingHours.map((oh, idx) => (
              <div key={idx} className="pb-2 border-b border-white/10">
                <span className="text-namaha-gold font-bold block">{oh.days}</span>
                <span>{oh.hours}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-medium">
        <div>
          {info.copyrightText || '© 2026 Namahaa Tiffin Room. All Rights Reserved.'}
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <span>Crafted with</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span>for Authentic South Indian Food Lovers</span>
        </div>
      </div>

      {/* Subtle Developer Credit */}
      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-white/5 text-center">
        <p className="text-[11px] text-gray-400/80 font-normal tracking-wide">
          Developed by Keerthikeswar
        </p>
      </div>
    </footer>
  );
};
