import { GalleryImage, RestaurantInfo } from '@/types';

export const defaultRestaurantInfo: RestaurantInfo = {
  name: 'Namahaa Tiffin Room',
  tagline: 'Experience Authentic South Indian Flavours',
  description: 'Welcome to Namahaa Tiffin Room – a celebration of authentic South Indian heritage. We craft crispy Davanagere Benne Dosas, melt-in-mouth Thatte Idlis, fragrant Ghee Pongal, and nutrient-dense Millet Dosas prepared using pure ghee and traditional iron tawas.',
  logoUrl: '/logo-circle.svg',
  bannerUrl: '/logo-banner.svg',
  phone: '+91 98765 43210',
  email: 'hello@namahaatiffinroom.com',
  address: 'Main Road, Near Heritage Hub, South Indian Culinary District',
  googleMapsUrl: 'https://maps.google.com/?q=Namahaa+Tiffin+Room',
  instagramUrl: 'https://www.instagram.com/namahaa.tiffinroom/',
  facebookUrl: 'https://facebook.com/namahaa.tiffinroom',
  openingHours: [
    { days: 'Monday - Sunday (Morning Session)', hours: '7:00 AM - 12:30 PM' },
    { days: 'Monday - Sunday (Evening Session)', hours: '4:30 PM - 10:30 PM' },
  ],
  heroTitle: 'Authentic South Indian Heritage',
  heroSubtitle: 'Handcrafted Dosa, Ghee Thatte Idly & Traditional Tiffins',
  announcementText: '✨ Pure Vegetarian • Made with 100% Pure Cow Ghee & White Butter • Fresh Daily Batch',
  isRestaurantOpen: true,
  copyrightText: '© 2026 Namahaa Tiffin Room. All Rights Reserved.',
  themePrimaryColor: '#023835',
  themeGoldColor: '#E6A12A',
};

export const defaultGalleryImages: GalleryImage[] = [
  {
    id: 'gal-1',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    title: 'Hot Soft Steamed Idlis',
    category: 'Breakfast',
    isEnabled: true,
  },
  {
    id: 'gal-2',
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
    title: 'Golden Benne Masala Dosa',
    category: 'Special Dosas',
    isEnabled: true,
  },
  {
    id: 'gal-3',
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
    title: 'Ghee Sambar Idly & Vada Combo',
    category: 'Idly & Vada',
    isEnabled: true,
  },
  {
    id: 'gal-4',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    title: 'Aromatic Ghee Pongal',
    category: 'Heritage Tiffin',
    isEnabled: true,
  },
];
