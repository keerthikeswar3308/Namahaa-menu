'use client';

import React from 'react';
import Image from 'next/image';
import { RestaurantInfo } from '@/types';
import { Sparkles, HeartHandshake, ShieldCheck, Flame } from 'lucide-react';

interface AboutSectionProps {
  info: RestaurantInfo;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ info }) => {
  return (
    <section id="about" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-emerald-50/70 dark:bg-namaha-green-dark relative overflow-hidden border-t border-emerald-950/10 dark:border-namaha-gold/20">
      <div className="max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Visual Story Card */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/40 dark:border-namaha-gold/40 shadow-2xl bg-white dark:bg-namaha-green-deep h-80 sm:h-[420px]">
              <Image
                src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1000&auto=format&fit=crop&q=80"
                alt="Namahaa Tiffin Room Authentic Preparation"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 dark:from-namaha-green-dark via-transparent to-black/20" />
              
              {/* Floating Badge */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 dark:bg-black/75 backdrop-blur-md border border-amber-500/40 text-slate-800 dark:text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white dark:text-namaha-green-deep font-extrabold text-xl shadow-md">
                    100%
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-amber-700 dark:text-namaha-gold text-base">Pure Cow Ghee & White Butter</h4>
                    <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">Crafted with authentic traditional recipes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Story Text */}
          <div className="text-slate-800 dark:text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-amber-800 dark:text-namaha-gold text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
              <span>Our Culinary Heritage</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-namaha-green-deep dark:text-white leading-tight">
              Crafting South Indian Flavours with <span className="text-amber-600 dark:text-namaha-gold italic">Love & Tradition</span>
            </h2>

            <p className="text-slate-700 dark:text-gray-300 text-sm sm:text-base font-normal leading-relaxed">
              {info.description}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-emerald-950/10 dark:border-white/10 flex items-start gap-3 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-namaha-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-namaha-green-deep dark:text-white">Pure & Hygienic</h4>
                  <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 font-medium">Top grade ingredients & 100% vegetarian standard.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-emerald-950/10 dark:border-white/10 flex items-start gap-3 shadow-sm">
                <Flame className="w-6 h-6 text-amber-600 dark:text-namaha-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-namaha-green-deep dark:text-white">Traditional Tawa Cooking</h4>
                  <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 font-medium">Cooked on heavy cast iron tawas for perfect crispiness.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-emerald-950/10 dark:border-white/10 flex items-start gap-3 sm:col-span-2 shadow-sm">
                <HeartHandshake className="w-6 h-6 text-amber-600 dark:text-namaha-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-namaha-green-deep dark:text-white">Warm South Indian Hospitality</h4>
                  <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 font-medium">Namahaa symbolizes respect and culinary devotion served fresh to your table.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
