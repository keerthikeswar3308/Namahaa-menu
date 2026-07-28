'use client';

import React from 'react';
import { RestaurantInfo } from '@/types';
import { Phone, MapPin, Clock, Instagram, ExternalLink, Mail, ShieldCheck } from 'lucide-react';

interface ContactSectionProps {
  info: RestaurantInfo;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ info }) => {
  return (
    <section id="contact" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-emerald-50/60 dark:bg-namaha-green-dark relative border-t border-emerald-950/10 dark:border-namaha-gold/20">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-amber-800 dark:text-namaha-gold text-xs font-bold mb-3">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
            <span>Visit Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-namaha-green-deep dark:text-white tracking-tight">
            Location & Opening Hours
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mt-2 font-medium max-w-xl mx-auto">
            Experience warm hospitality and fresh tiffins at Namahaa Tiffin Room
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Contact & Social Info */}
          <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl text-slate-800 dark:text-white space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif font-bold text-amber-700 dark:text-namaha-gold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-amber-600 dark:text-namaha-gold" /> Phone & Contact
              </h3>
              <p className="text-sm text-slate-600 dark:text-gray-300 mb-4 font-medium">
                Call us for inquiries, group orders, or table directions:
              </p>
              
              <a
                href={`tel:${info.phone}`}
                className="inline-flex items-center gap-3 text-lg font-bold text-namaha-green-deep dark:text-white hover:text-amber-600 dark:hover:text-namaha-gold transition"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/15 dark:bg-namaha-gold/20 text-amber-700 dark:text-namaha-gold border border-amber-500/30 dark:border-namaha-gold/40">
                  <Phone className="w-5 h-5" />
                </div>
                <span>{info.phone}</span>
              </a>

              {info.email && (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300 font-medium">
                  <Mail className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
                  <span>{info.email}</span>
                </div>
              )}
            </div>

            {/* Instagram Link Button */}
            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <h4 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Follow Us on Social Media
              </h4>
              <a
                href={info.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-sm shadow-lg hover:scale-102 transition-transform"
              >
                <Instagram className="w-5 h-5" />
                <span>Follow @namahaa.tiffinroom</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Card 2: Opening Hours */}
          <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl text-slate-800 dark:text-white flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif font-bold text-amber-700 dark:text-namaha-gold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-namaha-gold" /> Opening Hours
              </h3>

              <div className="space-y-4">
                {info.openingHours.map((oh, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-white/5 border border-emerald-950/10 dark:border-white/10">
                    <span className="text-xs text-amber-700 dark:text-namaha-gold font-bold uppercase tracking-wider block mb-1">
                      {oh.days}
                    </span>
                    <span className="text-lg font-extrabold text-namaha-green-deep dark:text-white">
                      {oh.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-xs text-amber-900 dark:text-namaha-gold flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-namaha-gold" />
              <span>Fresh batter prepared daily. Served hot & fresh!</span>
            </div>
          </div>

          {/* Card 3: Address & Google Maps */}
          <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl text-slate-800 dark:text-white flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif font-bold text-amber-700 dark:text-namaha-gold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600 dark:text-namaha-gold" /> Address & Directions
              </h3>

              <p className="text-sm sm:text-base text-slate-700 dark:text-gray-200 leading-relaxed mb-6 font-medium">
                {info.address}
              </p>
            </div>

            <div>
              <a
                href={info.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-namaha-gold dark:hover:bg-amber-400 text-white dark:text-namaha-green-deep font-extrabold text-sm shadow-md transition-colors"
              >
                <MapPin className="w-5 h-5" />
                <span>Open in Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
