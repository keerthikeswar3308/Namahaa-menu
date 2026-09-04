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

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled' | 'merged';

export interface OrderItem {
  id: string;
  name: string;
  price: number; // Unit price snapshot at order time
  quantity: number;
  image?: string;
  isVeg?: boolean;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: number;
  items: OrderItem[];
  subtotalAmount?: number;
  discountType?: 'percentage' | 'fixed' | 'round_off' | 'none';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  sessionId?: string;
  idempotencyKey?: string;
  mergedIntoOrderId?: string;
  mergedFromOrderNumbers?: string[];
  createdAt: string;
  updatedAt?: string;
}


export interface DailyOrderSummary {
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "30 AUG 2026"
  orderCount: number;
  itemCount: number;
  totalOrderValue: number;
  averageOrderValue: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface TopSellingItem {
  name: string;
  quantitySold: number;
  totalValue: number;
}

export interface CategorySales {
  categoryName: string;
  totalValue: number;
  quantitySold: number;
  percentageOfTotalSales?: number;
  uniqueItemCount?: number;
  topItemName?: string;
  topItemQty?: number;
}

export interface HourlySales {
  hourLabel: string; // e.g. "8-9 AM"
  hour: number; // 0-23
  orderCount: number;
  totalValue: number;
}

export interface DailySalesTrend {
  date: string;
  formattedDate: string;
  orderCount: number;
  totalValue: number;
}

export interface TableSales {
  tableNumber: number;
  orderCount: number;
  totalValue: number;
}

export interface SalesAnalytics {
  dateRangeLabel: string;
  totalOrderValue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItemsSold: number;
  prevPeriodOrderValue?: number;
  prevPeriodOrders?: number;
  prevPeriodAvgValue?: number;
  prevPeriodItemsSold?: number;
  valueChangePercentage?: number;
  ordersChangePercentage?: number;
  topSellingItems: TopSellingItem[];
  categorySales: CategorySales[];
  hourlySales: HourlySales[];
  dailyTrend: DailySalesTrend[];
  tableSales: TableSales[];
  peakHour?: {
    label: string;
    orderCount: number;
    totalValue: number;
  };
  insights: string[];
}




