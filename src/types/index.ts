export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName: string;
  image: string;
  isVeg: boolean;
  preparationTime: string; // e.g. "10-15 mins"
  isAvailable: boolean;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  isTodaySpecial?: boolean;
  ingredients?: string[];
  chefRecommendation?: string;
  displayOrder: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  displayOrder: number;
  isEnabled: boolean;
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  phone: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  openingHours: {
    days: string;
    hours: string;
  }[];
  heroTitle: string;
  heroSubtitle: string;
  announcementText?: string;
  isRestaurantOpen: boolean;
  copyrightText: string;
  themePrimaryColor: string;
  themeGoldColor: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  isEnabled: boolean;
}

export type FilterType = 'all' | 'veg' | 'popular' | 'chef_special' | 'today_special' | 'available';
