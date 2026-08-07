import { Category, GalleryImage, MenuItem, RestaurantInfo } from '@/types';
import { initialCategories, initialMenuItems } from '@/data/initialMenuData';
import { defaultGalleryImages, defaultRestaurantInfo } from '@/data/restaurantInfo';
import { supabase, isSupabaseConfigured, ensureCloudUrl, deleteImageViaAdminApi } from './supabase';

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

function notifyStoreUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('namahaa_store_updated'));
}

function getAdminPasscode(): string {
  if (typeof window === 'undefined') return 'namahaa2026';
  return localStorage.getItem('namahaa_admin_auth_code') || 'namahaa2026';
}

async function callAdminSyncApi(payload: Record<string, any>): Promise<boolean> {
  try {
    const passcode = getAdminPasscode();
    const res = await fetch('/api/admin/sync-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('callAdminSyncApi notice:', err);
    return false;
  }
}

export class NamahaStore {
  // ==========================================
  // 0. UNIVERSAL CROSS-DEVICE SYNC
  // ==========================================
  static async syncAllFromSupabase(): Promise<{
    items: MenuItem[];
    categories: Category[];
    restaurantInfo: RestaurantInfo | null;
    gallery: GalleryImage[];
  }> {
    try {
      const res = await fetch(`/api/menu?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // 1. Categories
          if (json.categories && json.categories.length > 0) {
            const mappedCats: Category[] = json.categories.map((c: any, idx: number) => ({
              id: c.id,
              name: c.name,
              description: c.description || '',
              image: c.image || '',
              displayOrder: c.display_order || idx + 1,
              isEnabled: c.is_enabled !== false,
            }));
            this.setCategories(mappedCats);
          }

          // 2. Menu Items
          if (json.items && json.items.length > 0) {
            const mappedItems: MenuItem[] = json.items.map((d: any, idx: number) => ({
              id: d.id,
              name: d.name,
              description: d.description || '',
              price: Number(d.price),
              categoryId: d.category_id || `cat-${d.category_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general'}`,
              categoryName: d.category_name || '',
              image: d.image || d.image_url || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
              isVeg: d.is_veg !== false,
              preparationTime: d.preparation_time || '10 mins',
              isAvailable: d.is_available !== false,
              isPopular: Boolean(d.is_popular),
              isChefSpecial: Boolean(d.is_chef_special),
              isTodaySpecial: Boolean(d.is_today_special),
              ingredients: d.ingredients || [],
              chefRecommendation: d.chef_recommendation || '',
              displayOrder: d.display_order || idx + 1,
            }));
            this.setMenuItems(mappedItems);
          }

          // 3. Restaurant Info
          if (json.restaurantInfo) {
            const d = json.restaurantInfo;
            const mappedInfo: RestaurantInfo = {
              name: d.name || defaultRestaurantInfo.name,
              tagline: d.tagline || defaultRestaurantInfo.tagline,
              description: d.description || defaultRestaurantInfo.description,
              logoUrl: d.logo_url || defaultRestaurantInfo.logoUrl,
              bannerUrl: d.banner_url || defaultRestaurantInfo.bannerUrl,
              phone: d.phone || defaultRestaurantInfo.phone,
              email: d.email || defaultRestaurantInfo.email,
              address: d.address || defaultRestaurantInfo.address,
              googleMapsUrl: d.google_maps_url || defaultRestaurantInfo.googleMapsUrl,
              instagramUrl: d.instagram_url || defaultRestaurantInfo.instagramUrl,
              facebookUrl: d.facebook_url || defaultRestaurantInfo.facebookUrl,
              openingHours: d.opening_hours || defaultRestaurantInfo.openingHours,
              heroTitle: d.hero_title || defaultRestaurantInfo.heroTitle,
              heroSubtitle: d.hero_subtitle || defaultRestaurantInfo.heroSubtitle,
              announcementText: d.announcement_text || defaultRestaurantInfo.announcementText,
              isRestaurantOpen: d.is_restaurant_open ?? true,
              copyrightText: d.copyright_text || defaultRestaurantInfo.copyrightText,
              themePrimaryColor: '#023835',
              themeGoldColor: '#E6A12A',
            };
            setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, mappedInfo);
          }

          // 4. Gallery
          if (json.gallery && json.gallery.length > 0) {
            const mappedGal: GalleryImage[] = json.gallery.map((g: any) => ({
              id: g.id,
              url: g.url,
              title: g.title,
              category: g.category,
              isEnabled: g.is_enabled ?? true,
            }));
            this.setGallery(mappedGal);
          }

          notifyStoreUpdated();
          return {
            items: this.getMenuItems(),
            categories: this.getCategories(),
            restaurantInfo: this.getRestaurantInfo(),
            gallery: this.getGallery(),
          };
        }
      }
    } catch (apiErr) {
      console.warn('syncAllFromSupabase exception:', apiErr);
    }

    return {
      items: this.getMenuItems(),
      categories: this.getCategories(),
      restaurantInfo: this.getRestaurantInfo(),
      gallery: this.getGallery(),
    };
  }

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
    const data = await this.syncAllFromSupabase();
    return data.items;
  }

  static async addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const finalImage = await ensureCloudUrl(item.image);
    const items = this.getMenuItems();
    const newItem: MenuItem = {
      ...item,
      image: finalImage,
      displayOrder: item.displayOrder || (items.length + 1),
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [...items, newItem];
    this.setMenuItems(updated);
    notifyStoreUpdated();

    // Persist via Server API Route
    await callAdminSyncApi({
      items: [newItem],
      categories: this.getCategories(),
      mode: 'merge',
    });

    // Cross-sync with Gallery if matching title exists
    this.crossSyncMenuToGallery(newItem.name, newItem.image);

    return newItem;
  }

  static async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    const items = this.getMenuItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    let finalImage = updates.image;
    if (updates.image) {
      finalImage = await ensureCloudUrl(updates.image);
    }

    const updatedItem = {
      ...items[index],
      ...updates,
      ...(finalImage ? { image: finalImage } : {}),
      displayOrder: updates.displayOrder !== undefined ? updates.displayOrder : (items[index].displayOrder || (index + 1)),
    };

    items[index] = updatedItem;
    this.setMenuItems(items);
    notifyStoreUpdated();

    // Persist via Server API Route
    await callAdminSyncApi({
      items: [updatedItem],
      categories: this.getCategories(),
      mode: 'merge',
    });

    // Cross-sync with Gallery if image changed
    if (updatedItem.image) {
      this.crossSyncMenuToGallery(updatedItem.name, updatedItem.image);
    }

    return updatedItem;
  }

  static deleteMenuItem(id: string): boolean {
    const items = this.getMenuItems();
    const itemToDelete = items.find((i) => i.id === id);
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.setMenuItems(filtered);
    notifyStoreUpdated();

    if (itemToDelete?.image && itemToDelete.image.includes('food-menu-images')) {
      deleteImageViaAdminApi(itemToDelete.image);
    }

    // Persist via Server API Route
    callAdminSyncApi({
      deleteItemId: id,
    });

    if (isSupabaseConfigured()) {
      supabase.from('menu_items').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase delete item error:', error);
      });
    }

    return true;
  }

  static resetMenuItems(): void {
    this.setMenuItems(initialMenuItems);
    this.setCategories(initialCategories);
    notifyStoreUpdated();
    callAdminSyncApi({
      items: initialMenuItems,
      categories: initialCategories,
      mode: 'replace',
    });
  }

  static clearAllMenuItems(): void {
    this.setMenuItems([]);
    notifyStoreUpdated();
    callAdminSyncApi({
      items: [],
      mode: 'replace',
    });
  }

  static async replaceAllMenuItems(newItems: MenuItem[], newCategories?: Category[]): Promise<boolean> {
    if (newCategories && newCategories.length > 0) {
      this.setCategories(newCategories);
    }
    this.setMenuItems(newItems);
    notifyStoreUpdated();

    // Persist via Server API Route
    const success = await callAdminSyncApi({
      items: newItems,
      categories: newCategories || this.getCategories(),
      mode: 'replace',
    });

    return success;
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
    const data = await this.syncAllFromSupabase();
    return data.categories;
  }

  static addCategory(category: Omit<Category, 'id'>): Category {
    const categories = this.getCategories();
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCategory];
    this.setCategories(updated);
    notifyStoreUpdated();

    callAdminSyncApi({
      categories: updated,
    });

    return newCategory;
  }

  static updateCategory(id: string, updates: Partial<Category>): Category | null {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated = { ...categories[index], ...updates };
    categories[index] = updated;
    this.setCategories(categories);
    notifyStoreUpdated();

    callAdminSyncApi({
      categories: [updated],
    });

    return updated;
  }

  static deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    this.setCategories(filtered);
    notifyStoreUpdated();

    callAdminSyncApi({
      deleteCategoryId: id,
    });

    return true;
  }

  static reorderCategories(reorderedCategories: Category[]): void {
    const updated = reorderedCategories.map((c, index) => ({
      ...c,
      displayOrder: index + 1,
    }));
    this.setCategories(updated);
    notifyStoreUpdated();

    callAdminSyncApi({
      categories: updated,
    });
  }

  // ==========================================
  // 3. RESTAURANT INFO (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getRestaurantInfo(): RestaurantInfo {
    return getStoredItem<RestaurantInfo>(STORAGE_KEYS.RESTAURANT_INFO, defaultRestaurantInfo);
  }

  static async syncRestaurantInfoFromSupabase(): Promise<RestaurantInfo> {
    const data = await this.syncAllFromSupabase();
    return data.restaurantInfo || this.getRestaurantInfo();
  }

  static updateRestaurantInfo(info: Partial<RestaurantInfo>): RestaurantInfo {
    const current = this.getRestaurantInfo();
    const updated = { ...current, ...info };
    setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, updated);
    notifyStoreUpdated();

    callAdminSyncApi({
      restaurantInfo: updated,
    });

    return updated;
  }

  // ==========================================
  // 4. GALLERY CRUD (SUPABASE + LOCAL CACHE)
  // ==========================================
  static getGallery(): GalleryImage[] {
    return getStoredItem<GalleryImage[]>(STORAGE_KEYS.GALLERY, defaultGalleryImages);
  }

  static setGallery(images: GalleryImage[]): void {
    setStoredItem(STORAGE_KEYS.GALLERY, images);
  }

  static async syncGalleryFromSupabase(): Promise<GalleryImage[]> {
    const data = await this.syncAllFromSupabase();
    return data.gallery;
  }

  static async addGalleryImage(img: Omit<GalleryImage, 'id'>): Promise<GalleryImage> {
    const finalUrl = await ensureCloudUrl(img.url);
    const gallery = this.getGallery();
    const newImg: GalleryImage = {
      ...img,
      url: finalUrl,
      id: `gal-${Date.now()}`,
    };
    const updated = [newImg, ...gallery];
    this.setGallery(updated);
    notifyStoreUpdated();

    callAdminSyncApi({
      gallery: [newImg],
    });

    this.crossSyncGalleryToMenu(newImg.title, newImg.url);

    return newImg;
  }

  static async updateGalleryImage(id: string, updates: Partial<GalleryImage>): Promise<GalleryImage | null> {
    const gallery = this.getGallery();
    const index = gallery.findIndex((g) => g.id === id);
    if (index === -1) return null;

    let finalUrl = updates.url;
    if (updates.url) {
      finalUrl = await ensureCloudUrl(updates.url);
    }

    const updated = {
      ...gallery[index],
      ...updates,
      ...(finalUrl ? { url: finalUrl } : {}),
    };
    gallery[index] = updated;
    this.setGallery(gallery);
    notifyStoreUpdated();

    callAdminSyncApi({
      gallery: [updated],
    });

    if (updated.url) {
      this.crossSyncGalleryToMenu(updated.title, updated.url);
    }

    return updated;
  }

  static async resetGalleryToDefault(): Promise<GalleryImage[]> {
    this.setGallery(defaultGalleryImages);
    notifyStoreUpdated();

    callAdminSyncApi({
      gallery: defaultGalleryImages,
    });

    return defaultGalleryImages;
  }

  static deleteGalleryImage(id: string): boolean {
    const gallery = this.getGallery();
    const imgToDelete = gallery.find((g) => g.id === id);
    const filtered = gallery.filter((g) => g.id !== id);
    if (filtered.length === gallery.length) return false;
    this.setGallery(filtered);
    notifyStoreUpdated();

    if (imgToDelete?.url && imgToDelete.url.includes('food-menu-images')) {
      deleteImageViaAdminApi(imgToDelete.url);
    }

    callAdminSyncApi({
      deleteGalleryId: id,
    });

    return true;
  }

  // ==========================================
  // 5. CROSS-TABLE AUTOMATIC SYNCHRONIZATION
  // ==========================================
  private static crossSyncGalleryToMenu(title: string, imageUrl: string): void {
    if (!title || !imageUrl) return;
    const items = this.getMenuItems();
    const match = items.find((i) => i.name.trim().toLowerCase() === title.trim().toLowerCase());
    if (match && match.image !== imageUrl) {
      this.updateMenuItem(match.id, { image: imageUrl });
    }
  }

  private static crossSyncMenuToGallery(name: string, imageUrl: string): void {
    if (!name || !imageUrl) return;
    const gallery = this.getGallery();
    const match = gallery.find((g) => g.title.trim().toLowerCase() === name.trim().toLowerCase());
    if (match && match.url !== imageUrl) {
      this.updateGalleryImage(match.id, { url: imageUrl });
    }
  }

  static async seedSouthIndianDishPhotos(): Promise<number> {
    const dishImageMap: Record<string, string> = {
      'vada': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
      'perugu vada': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
      'benne': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
      'pesarattu': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
      'ravva': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
      'pongal': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
      'thatte': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    };

    let count = 0;
    const items = this.getMenuItems();
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const lower = item.name.toLowerCase();
      let selectedUrl = '';
      if (lower.includes('perugu vada')) selectedUrl = dishImageMap['perugu vada'];
      else if (lower.includes('vada')) selectedUrl = dishImageMap['vada'];
      else if (lower.includes('benne')) selectedUrl = dishImageMap['benne'];
      else if (lower.includes('pesarattu')) selectedUrl = dishImageMap['pesarattu'];
      else if (lower.includes('ravva')) selectedUrl = dishImageMap['ravva'];
      else if (lower.includes('pongal')) selectedUrl = dishImageMap['pongal'];
      else if (lower.includes('thatte')) selectedUrl = dishImageMap['thatte'];

      if (selectedUrl && item.image !== selectedUrl) {
        await this.updateMenuItem(item.id, { image: selectedUrl, displayOrder: idx + 1 });
        count++;
      }
    }

    notifyStoreUpdated();
    return count;
  }

  static async syncAllMenuItemsToSupabase(): Promise<number> {
    const items = this.getMenuItems();
    const categories = this.getCategories();
    const info = this.getRestaurantInfo();
    const gallery = this.getGallery();

    await callAdminSyncApi({
      items,
      categories,
      restaurantInfo: info,
      gallery,
      mode: 'replace',
    });

    notifyStoreUpdated();
    return items.length;
  }

  // ==========================================
  // 6. REALTIME DB & MULTI-TAB SUBSCRIPTIONS
  // ==========================================
  static subscribeToRealtimeChanges(onUpdate: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    // 1. Custom Local Window Events
    const handleLocalEvent = () => onUpdate();
    window.addEventListener('namahaa_store_updated', handleLocalEvent);
    window.addEventListener('storage', handleLocalEvent);

    // 2. Supabase Realtime Database Channel
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('namahaa_realtime_db_channel')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          this.syncAllFromSupabase().then(() => onUpdate());
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('namahaa_store_updated', handleLocalEvent);
      window.removeEventListener('storage', handleLocalEvent);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }

  // ==========================================
  // 7. TABLE SESSION
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
  // 8. ADMIN AUTH
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
