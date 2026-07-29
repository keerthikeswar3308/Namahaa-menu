'use client';

import React from 'react';
import Image from 'next/image';
import { GalleryImage } from '@/types';
import { Camera } from 'lucide-react';
import { getFreshImageUrl } from '@/lib/imageUtils';

interface GallerySectionProps {
  images: GalleryImage[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ images }) => {
  const activeImages = images.filter((img) => img.isEnabled);

  return (
    <section id="gallery" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-namaha-green-cream dark:bg-namaha-green-deep relative border-t border-emerald-950/10 dark:border-namaha-gold/20">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-namaha-gold/15 border border-amber-500/30 dark:border-namaha-gold/30 text-amber-800 dark:text-namaha-gold text-xs font-bold mb-3">
          <Camera className="w-4 h-4 text-amber-600 dark:text-namaha-gold" />
          <span>Visual Showcase</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-namaha-green-deep dark:text-white tracking-tight">
          Restaurant Gallery
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mt-2 font-medium">
          Take a peek into our kitchen, food craft, and golden delicacies
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeImages.map((img) => (
          <div
            key={img.id}
            className="group relative rounded-3xl overflow-hidden border border-emerald-950/15 dark:border-namaha-gold/20 bg-white dark:bg-namaha-green-dark shadow-md hover:shadow-xl hover:shadow-amber-500/15 hover:-translate-y-2 transition-all duration-300 h-64"
          >
            <Image
              src={getFreshImageUrl(img.url)}
              alt={img.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 dark:from-namaha-green-dark via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            <div className="absolute bottom-4 left-4 right-4 text-left z-10">
              <span className="text-[10px] uppercase font-extrabold text-amber-300 dark:text-namaha-gold tracking-widest bg-black/60 px-2 py-0.5 rounded border border-white/20">
                {img.category}
              </span>
              <h3 className="text-base font-serif font-bold text-white mt-1 group-hover:text-amber-300 dark:group-hover:text-namaha-gold transition-colors drop-shadow-sm">
                {img.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
