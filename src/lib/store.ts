import { Category, GalleryImage, MenuItem, RestaurantInfo } from '@/types';
import { initialCategories, initialMenuItems } from '@/data/initialMenuData';
import { defaultGalleryImages, defaultRestaurantInfo } from '@/data/restaurantInfo';

const STORAGE_KEYS = {
  MENU_ITEMS: 'namahaa_menu_items_v1',
  CATEGORIES: 'namahaa_categories_v1',
  RESTAURANT_INFO: 'namahaa_info_v1',
  GALLERY: 'namahaa_gallery_v1',
  TABLE_NUMBER: 'namahaa_table_session',
  ADMIN_AUTH: 'namahaa_admin_auth',
};

// Helper for local storage access in SSR safe manner
function getStoredItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return fallback;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

export class NamahaStore {
  // --- MENU ITEMS ---
  static getMenuItems(): MenuItem[] {
    return getStoredItem<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, initialMenuItems);
  }

  static setMenuItems(items: MenuItem[]): void {
    setStoredItem(STORAGE_KEYS.MENU_ITEMS, items);
  }

  static addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const items = this.getMenuItems();
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [newItem, ...items];
    this.setMenuItems(updated);
    return newItem;
  }

  static updateMenuItem(id: string, updates: Partial<MenuItem>): MenuItem | null {
    const items = this.getMenuItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const updatedItem = { ...items[index], ...updates };
    items[index] = updatedItem;
    this.setMenuItems(items);
    return updatedItem;
  }

  static deleteMenuItem(id: string): boolean {
    const items = this.getMenuItems();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.setMenuItems(filtered);
    return true;
  }

  static resetMenuItems(): void {
    this.setMenuItems(initialMenuItems);
  }

  // --- CATEGORIES ---
  static getCategories(): Category[] {
    return getStoredItem<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  }

  static setCategories(categories: Category[]): void {
    setStoredItem(STORAGE_KEYS.CATEGORIES, categories);
  }

  static addCategory(category: Omit<Category, 'id'>): Category {
    const categories = this.getCategories();
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCategory];
    this.setCategories(updated);
    return newCategory;
  }

  static updateCategory(id: string, updates: Partial<Category>): Category | null {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated = { ...categories[index], ...updates };
    categories[index] = updated;
    this.setCategories(categories);
    return updated;
  }

  static deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    this.setCategories(filtered);
    return true;
  }

  // --- RESTAURANT INFO ---
  static getRestaurantInfo(): RestaurantInfo {
    return getStoredItem<RestaurantInfo>(STORAGE_KEYS.RESTAURANT_INFO, defaultRestaurantInfo);
  }

  static updateRestaurantInfo(info: Partial<RestaurantInfo>): RestaurantInfo {
    const current = this.getRestaurantInfo();
    const updated = { ...current, ...info };
    setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, updated);
    return updated;
  }

  // --- GALLERY ---
  static getGallery(): GalleryImage[] {
    return getStoredItem<GalleryImage[]>(STORAGE_KEYS.GALLERY, defaultGalleryImages);
  }

  static setGallery(images: GalleryImage[]): void {
    setStoredItem(STORAGE_KEYS.GALLERY, images);
  }

  // --- TABLE SESSION ---
  static getSelectedTable(): number | null {
    if (typeof window === 'undefined') return null;
    const val = sessionStorage.getItem(STORAGE_KEYS.TABLE_NUMBER) || localStorage.getItem(STORAGE_KEYS.TABLE_NUMBER);
    return val ? parseInt(val, 10) : null;
  }

  static setSelectedTable(tableNum: number): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEYS.TABLE_NUMBER, tableNum.toString());
    localStorage.setItem(STORAGE_KEYS.TABLE_NUMBER, tableNum.toString());
  }

  static clearSelectedTable(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER);
    localStorage.removeItem(STORAGE_KEYS.TABLE_NUMBER);
  }

  // --- ADMIN AUTH ---
  static isAdminLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  }

  static setAdminLoggedIn(status: boolean): void {
    if (typeof window === 'undefined') return;
    if (status) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    }
  }
}
