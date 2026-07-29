import { GalleryImage, RestaurantInfo } from '@/types';

export const defaultRestaurantInfo: RestaurantInfo = {
  name: 'Namahaa Tiffin Room',
  tagline: 'Pure South Indian Vegetarian Tiffins',
  description: 'Serving traditional South Indian breakfast delicacies prepared with authentic recipes, pure ghee, and fresh daily batters.',
  logoUrl: '/logo-circle.svg',
  bannerUrl: '/logo-banner.svg',
  phone: '+91 98765 43210',
  email: 'namahaatiffinroom@gmail.com',
  address: 'Main Road, Near Temple Street, Jubilee Hills, Hyderabad',
  googleMapsUrl: 'https://maps.google.com',
  instagramUrl: 'https://instagram.com',
  facebookUrl: 'https://facebook.com',
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
