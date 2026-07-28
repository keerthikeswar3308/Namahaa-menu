import { Category, GalleryImage, MenuItem, RestaurantInfo } from '@/types';
import { initialCategories, initialMenuItems } from '@/data/initialMenuData';
import { defaultGalleryImages, defaultRestaurantInfo } from '@/data/restaurantInfo';
import { supabase, isSupabaseConfigured } from './supabase';

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
  // ==========================================
  // 1. MENU ITEMS CRUD (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getMenuItems(): MenuItem[] {
    return getStoredItem<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, initialMenuItems);
  }

  static setMenuItems(items: MenuItem[]): void {
    setStoredItem(STORAGE_KEYS.MENU_ITEMS, items);
  }

  static async syncMenuItemsFromSupabase(): Promise<MenuItem[]> {
    if (!isSupabaseConfigured()) return this.getMenuItems();
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('display_order', { ascending: true });

      if (error || !data) {
        console.warn('Supabase menu items fetch fallback:', error);
        return this.getMenuItems();
      }

      const existingCats = this.getCategories();

      const mappedItems: MenuItem[] = data.map((d) => {
        let catId = d.category_id || '';
        const catName = d.category_name || '';

        // Auto-heal category ID if category_name matches an existing category
        if (catName) {
          const match = existingCats.find((c) => c.name.trim().toLowerCase() === catName.trim().toLowerCase());
          if (match) {
            catId = match.id;
          }
        }

        return {
          id: d.id,
          name: d.name,
          description: d.description || '',
          price: Number(d.price),
          categoryId: catId,
          categoryName: catName,
          image: d.image,
          isVeg: d.is_veg,
          preparationTime: d.preparation_time || '10 mins',
          isAvailable: d.is_available,
          isPopular: d.is_popular,
          isChefSpecial: d.is_chef_special,
          isTodaySpecial: d.is_today_special,
          ingredients: d.ingredients || [],
          chefRecommendation: d.chef_recommendation || '',
          displayOrder: d.display_order || 0,
        };
      });

      if (mappedItems.length > 0) {
        this.setMenuItems(mappedItems);
        return mappedItems;
      }
    } catch (e) {
      console.error('Error syncing menu items from Supabase:', e);
    }
    return this.getMenuItems();
  }

  static addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const items = this.getMenuItems();
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [newItem, ...items];
    this.setMenuItems(updated);

    if (isSupabaseConfigured()) {
      supabase.from('menu_items').insert({
        id: newItem.id,
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category_id: newItem.categoryId,
        category_name: newItem.categoryName,
        image: newItem.image,
        is_veg: newItem.isVeg,
        preparation_time: newItem.preparationTime,
        is_available: newItem.isAvailable,
        is_popular: newItem.isPopular,
        is_chef_special: newItem.isChefSpecial,
        is_today_special: newItem.isTodaySpecial,
        ingredients: newItem.ingredients,
        chef_recommendation: newItem.chefRecommendation,
        display_order: newItem.displayOrder,
      }).then(({ error }) => {
        if (error) console.error('Supabase add item error:', error);
      });
    }

    return newItem;
  }

  static updateMenuItem(id: string, updates: Partial<MenuItem>): MenuItem | null {
    const items = this.getMenuItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const updatedItem = { ...items[index], ...updates };
    items[index] = updatedItem;
    this.setMenuItems(items);

    if (isSupabaseConfigured()) {
      const dbPayload: Record<string, unknown> = {};
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.price !== undefined) dbPayload.price = updates.price;
      if (updates.description !== undefined) dbPayload.description = updates.description;
      if (updates.categoryId !== undefined) dbPayload.category_id = updates.categoryId;
      if (updates.categoryName !== undefined) dbPayload.category_name = updates.categoryName;
      if (updates.isAvailable !== undefined) dbPayload.is_available = updates.isAvailable;
      if (updates.image !== undefined) dbPayload.image = updates.image;
      if (updates.isPopular !== undefined) dbPayload.is_popular = updates.isPopular;
      if (updates.isChefSpecial !== undefined) dbPayload.is_chef_special = updates.isChefSpecial;
      if (updates.isTodaySpecial !== undefined) dbPayload.is_today_special = updates.isTodaySpecial;
      if (updates.preparationTime !== undefined) dbPayload.preparation_time = updates.preparationTime;
      if (updates.chefRecommendation !== undefined) dbPayload.chef_recommendation = updates.chefRecommendation;

      supabase.from('menu_items').update(dbPayload).eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase update item error:', error);
      });
    }

    return updatedItem;
  }

  static deleteMenuItem(id: string): boolean {
    const items = this.getMenuItems();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.setMenuItems(filtered);

    if (isSupabaseConfigured()) {
      supabase.from('menu_items').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase delete item error:', error);
      });
    }

    return true;
  }

  static resetMenuItems(): void {
    this.setMenuItems(initialMenuItems);
  }

  // ==========================================
  // 2. CATEGORIES CRUD (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getCategories(): Category[] {
    return getStoredItem<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  }

  static setCategories(categories: Category[]): void {
    setStoredItem(STORAGE_KEYS.CATEGORIES, categories);
  }

  static async syncCategoriesFromSupabase(): Promise<Category[]> {
    if (!isSupabaseConfigured()) return this.getCategories();
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error || !data) return this.getCategories();

      const mapped: Category[] = data.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        image: c.image || '',
        displayOrder: c.display_order || 0,
        isEnabled: c.is_enabled ?? true,
      }));

      if (mapped.length > 0) {
        this.setCategories(mapped);
        return mapped;
      }
    } catch (e) {
      console.error('Error syncing categories from Supabase:', e);
    }
    return this.getCategories();
  }

  static addCategory(category: Omit<Category, 'id'>): Category {
    const categories = this.getCategories();
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCategory];
    this.setCategories(updated);

    if (isSupabaseConfigured()) {
      supabase.from('categories').insert({
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        image: newCategory.image,
        display_order: newCategory.displayOrder,
        is_enabled: newCategory.isEnabled,
      }).then(({ error }) => {
        if (error) console.error('Supabase add category error:', error);
      });
    }

    return newCategory;
  }

  static updateCategory(id: string, updates: Partial<Category>): Category | null {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated = { ...categories[index], ...updates };
    categories[index] = updated;
    this.setCategories(categories);

    if (isSupabaseConfigured()) {
      const dbPayload: Record<string, unknown> = {};
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.description !== undefined) dbPayload.description = updates.description;
      if (updates.image !== undefined) dbPayload.image = updates.image;
      if (updates.isEnabled !== undefined) dbPayload.is_enabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) dbPayload.display_order = updates.displayOrder;

      supabase.from('categories').update(dbPayload).eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase update category error:', error);
      });
    }

    return updated;
  }

  static deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    this.setCategories(filtered);

    if (isSupabaseConfigured()) {
      supabase.from('categories').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase delete category error:', error);
      });
    }

    return true;
  }

  // ==========================================
  // 3. RESTAURANT INFO (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getRestaurantInfo(): RestaurantInfo {
    return getStoredItem<RestaurantInfo>(STORAGE_KEYS.RESTAURANT_INFO, defaultRestaurantInfo);
  }

  static async syncRestaurantInfoFromSupabase(): Promise<RestaurantInfo> {
    if (!isSupabaseConfigured()) return this.getRestaurantInfo();
    try {
      const { data, error } = await supabase
        .from('restaurant_info')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !data) return this.getRestaurantInfo();

      const mapped: RestaurantInfo = {
        name: data.name,
        tagline: data.tagline || '',
        description: data.description || '',
        logoUrl: data.logo_url || '/logo-circle.svg',
        bannerUrl: data.banner_url || '/logo-banner.svg',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        googleMapsUrl: data.google_maps_url || '',
        instagramUrl: data.instagram_url || '',
        facebookUrl: data.facebook_url || '',
        openingHours: data.opening_hours || [],
        heroTitle: data.hero_title || '',
        heroSubtitle: data.hero_subtitle || '',
        announcementText: data.announcement_text || '',
        isRestaurantOpen: data.is_restaurant_open ?? true,
        copyrightText: data.copyright_text || '',
        themePrimaryColor: '#023835',
        themeGoldColor: '#E6A12A',
      };

      setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, mapped);
      return mapped;
    } catch (e) {
      console.error('Error syncing restaurant info from Supabase:', e);
    }
    return this.getRestaurantInfo();
  }

  static updateRestaurantInfo(info: Partial<RestaurantInfo>): RestaurantInfo {
    const current = this.getRestaurantInfo();
    const updated = { ...current, ...info };
    setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, updated);

    if (isSupabaseConfigured()) {
      supabase.from('restaurant_info').upsert({
        id: 1,
        name: updated.name,
        tagline: updated.tagline,
        description: updated.description,
        logo_url: updated.logoUrl,
        banner_url: updated.bannerUrl,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        google_maps_url: updated.googleMapsUrl,
        instagram_url: updated.instagramUrl,
        facebook_url: updated.facebookUrl,
        opening_hours: updated.openingHours,
        hero_title: updated.heroTitle,
        hero_subtitle: updated.heroSubtitle,
        announcement_text: updated.announcementText,
        is_restaurant_open: updated.isRestaurantOpen,
        copyright_text: updated.copyrightText,
      }).then(({ error }) => {
        if (error) console.error('Supabase update restaurant info error:', error);
      });
    }

    return updated;
  }

  // ==========================================
  // 4. GALLERY (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getGallery(): GalleryImage[] {
    return getStoredItem<GalleryImage[]>(STORAGE_KEYS.GALLERY, defaultGalleryImages);
  }

  static setGallery(images: GalleryImage[]): void {
    setStoredItem(STORAGE_KEYS.GALLERY, images);
  }

  static async syncGalleryFromSupabase(): Promise<GalleryImage[]> {
    if (!isSupabaseConfigured()) return this.getGallery();
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*');

      if (error || !data) return this.getGallery();

      const mapped: GalleryImage[] = data.map((g) => ({
        id: g.id,
        url: g.url,
        title: g.title,
        category: g.category,
        isEnabled: g.is_enabled ?? true,
      }));

      if (mapped.length > 0) {
        this.setGallery(mapped);
        return mapped;
      }
    } catch (e) {
      console.error('Error syncing gallery from Supabase:', e);
    }
    return this.getGallery();
  }

  // ==========================================
  // 5. TABLE SESSION
  // ==========================================
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

  // ==========================================
  // 6. ADMIN AUTH
  // ==========================================
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
