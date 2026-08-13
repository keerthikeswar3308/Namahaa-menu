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

// Helper for local storage access in SSR safe manner (used only as temporary read-through cache)
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

function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem('namahaa_admin_username');
    if (username) {
      headers['x-admin-username'] = username;
    }
    const passcode = localStorage.getItem('namahaa_admin_auth_code');
    if (passcode) {
      headers['x-admin-passcode'] = passcode;
      headers['x-admin-auth'] = passcode;
    }
    const token = sessionStorage.getItem('namahaa_admin_token');
    if (token) {
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Sends a mutation payload to the secure Next.js Server API route (/api/admin/sync-menu)
 * and returns success status with detailed error messages if Supabase fails.
 */
async function callAdminSyncApi(
  payload: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/sync-menu', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }

    const errorMsg = data.error || `Server sync failed with HTTP status ${res.status}`;
    console.error('callAdminSyncApi failed:', errorMsg);
    return { success: false, error: errorMsg };
  } catch (err: any) {
    const message = err.message || 'Network error communicating with sync server';
    console.error('callAdminSyncApi exception:', err);
    return { success: false, error: message };
  }
}

export class NamahaStore {
  // =========================================================================
  // 0. UNIVERSAL CROSS-DEVICE SYNC (SUPABASE AUTHORITATIVE SOURCE OF TRUTH)
  // =========================================================================
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
          // 1. Categories from Supabase
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

          // 2. Menu Items from Supabase
          if (json.items && json.items.length > 0) {
            const mappedItems: MenuItem[] = json.items.map((d: any, idx: number) => ({
              id: d.id,
              name: d.name,
              description: d.description || '',
              price: Number(d.price),
              categoryId:
                d.category_id ||
                `cat-${d.category_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general'}`,
              categoryName: d.category_name || '',
              image: d.image_url || d.image || '',
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

          // 3. Restaurant Info from Supabase
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

          // 4. Gallery from Supabase
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

  // =========================================================================
  // 1. MENU ITEMS CRUD (SUPABASE PERSISTENCE FIRST)
  // =========================================================================
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
      displayOrder: item.displayOrder || items.length + 1,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    // 1. Send data to secure server API to write to Supabase
    const syncRes = await callAdminSyncApi({
      items: [newItem],
      categories: this.getCategories(),
      mode: 'merge',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to save menu item to Supabase');
    }

    // 2. Supabase confirmed success: update local cache & notify
    const updated = [...items, newItem];
    this.setMenuItems(updated);
    notifyStoreUpdated();

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

    const updatedItem: MenuItem = {
      ...items[index],
      ...updates,
      ...(finalImage ? { image: finalImage } : {}),
      displayOrder:
        updates.displayOrder !== undefined
          ? updates.displayOrder
          : items[index].displayOrder || index + 1,
    };

    // 1. Send data to secure server API to write to Supabase
    const syncRes = await callAdminSyncApi({
      items: [updatedItem],
      categories: this.getCategories(),
      mode: 'merge',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to update menu item "${updatedItem.name}" in Supabase`);
    }

    // 2. Supabase confirmed success: update local state & notify
    items[index] = updatedItem;
    this.setMenuItems(items);
    notifyStoreUpdated();

    // Cross-sync with Gallery if image changed
    if (updatedItem.image) {
      this.crossSyncMenuToGallery(updatedItem.name, updatedItem.image);
    }

    return updatedItem;
  }

  static async deleteMenuItem(id: string): Promise<boolean> {
    const items = this.getMenuItems();
    const itemToDelete = items.find((i) => i.id === id);
    if (!itemToDelete) return false;

    // 1. Persist deletion via Server API Route in Supabase
    const syncRes = await callAdminSyncApi({
      deleteItemId: id,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to delete menu item from Supabase`);
    }

    // 2. Remove image from storage bucket if stored in food-images
    if (itemToDelete.image && itemToDelete.image.includes('food-images')) {
      deleteImageViaAdminApi(itemToDelete.image);
    }

    // 3. Supabase confirmed: filter local state & notify
    const filtered = items.filter((i) => i.id !== id);
    this.setMenuItems(filtered);
    notifyStoreUpdated();

    return true;
  }

  static async resetMenuItems(): Promise<void> {
    const syncRes = await callAdminSyncApi({
      items: initialMenuItems,
      categories: initialCategories,
      mode: 'replace',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to reset menu in Supabase');
    }

    this.setMenuItems(initialMenuItems);
    this.setCategories(initialCategories);
    notifyStoreUpdated();
  }

  static async clearAllMenuItems(): Promise<void> {
    const syncRes = await callAdminSyncApi({
      items: [],
      mode: 'replace',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to clear menu items in Supabase');
    }

    this.setMenuItems([]);
    notifyStoreUpdated();
  }

  static async replaceAllMenuItems(
    newItems: MenuItem[],
    newCategories?: Category[]
  ): Promise<boolean> {
    const syncRes = await callAdminSyncApi({
      items: newItems,
      categories: newCategories || this.getCategories(),
      mode: 'replace',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to replace menu items in Supabase');
    }

    if (newCategories && newCategories.length > 0) {
      this.setCategories(newCategories);
    }
    this.setMenuItems(newItems);
    notifyStoreUpdated();

    return true;
  }

  // =========================================================================
  // 2. CATEGORIES CRUD (SUPABASE PERSISTENCE FIRST)
  // =========================================================================
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

  static async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const categories = this.getCategories();
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCategory];

    const syncRes = await callAdminSyncApi({
      categories: updated,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to add category "${newCategory.name}" to Supabase`);
    }

    this.setCategories(updated);
    notifyStoreUpdated();

    return newCategory;
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const updated: Category = { ...categories[index], ...updates };

    const syncRes = await callAdminSyncApi({
      categories: [updated],
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to update category "${updated.name}" in Supabase`);
    }

    categories[index] = updated;
    this.setCategories(categories);
    notifyStoreUpdated();

    return updated;
  }

  static async deleteCategory(id: string): Promise<boolean> {
    const categories = this.getCategories();
    const exists = categories.some((c) => c.id === id);
    if (!exists) return false;

    const syncRes = await callAdminSyncApi({
      deleteCategoryId: id,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to delete category from Supabase');
    }

    const filtered = categories.filter((c) => c.id !== id);
    this.setCategories(filtered);
    notifyStoreUpdated();

    return true;
  }

  static async reorderCategories(reorderedCategories: Category[]): Promise<void> {
    const updated = reorderedCategories.map((c, index) => ({
      ...c,
      displayOrder: index + 1,
    }));

    const syncRes = await callAdminSyncApi({
      categories: updated,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to save reordered categories to Supabase');
    }

    this.setCategories(updated);
    notifyStoreUpdated();
  }

  // =========================================================================
  // 3. RESTAURANT INFO (SUPABASE PERSISTENCE FIRST)
  // =========================================================================
  static getRestaurantInfo(): RestaurantInfo {
    return getStoredItem<RestaurantInfo>(STORAGE_KEYS.RESTAURANT_INFO, defaultRestaurantInfo);
  }

  static async syncRestaurantInfoFromSupabase(): Promise<RestaurantInfo> {
    const data = await this.syncAllFromSupabase();
    return data.restaurantInfo || this.getRestaurantInfo();
  }

  static async updateRestaurantInfo(info: Partial<RestaurantInfo>): Promise<RestaurantInfo> {
    const current = this.getRestaurantInfo();
    const updated: RestaurantInfo = { ...current, ...info };

    const syncRes = await callAdminSyncApi({
      restaurantInfo: updated,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to update restaurant info in Supabase');
    }

    setStoredItem(STORAGE_KEYS.RESTAURANT_INFO, updated);
    notifyStoreUpdated();

    return updated;
  }

  // =========================================================================
  // 4. GALLERY CRUD (SUPABASE PERSISTENCE FIRST)
  // =========================================================================
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

    const syncRes = await callAdminSyncApi({
      gallery: [newImg],
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to add gallery image "${newImg.title}" to Supabase`);
    }

    const updated = [newImg, ...gallery];
    this.setGallery(updated);
    notifyStoreUpdated();

    this.crossSyncGalleryToMenu(newImg.title, newImg.url);

    return newImg;
  }

  static async updateGalleryImage(
    id: string,
    updates: Partial<GalleryImage>
  ): Promise<GalleryImage | null> {
    const gallery = this.getGallery();
    const index = gallery.findIndex((g) => g.id === id);
    if (index === -1) return null;

    let finalUrl = updates.url;
    if (updates.url) {
      finalUrl = await ensureCloudUrl(updates.url);
    }

    const updated: GalleryImage = {
      ...gallery[index],
      ...updates,
      ...(finalUrl ? { url: finalUrl } : {}),
    };

    const syncRes = await callAdminSyncApi({
      gallery: [updated],
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || `Failed to update gallery image "${updated.title}" in Supabase`);
    }

    gallery[index] = updated;
    this.setGallery(gallery);
    notifyStoreUpdated();

    if (updated.url) {
      this.crossSyncGalleryToMenu(updated.title, updated.url);
    }

    return updated;
  }

  static async resetGalleryToDefault(): Promise<GalleryImage[]> {
    const syncRes = await callAdminSyncApi({
      gallery: defaultGalleryImages,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to reset gallery in Supabase');
    }

    this.setGallery(defaultGalleryImages);
    notifyStoreUpdated();

    return defaultGalleryImages;
  }

  static async deleteGalleryImage(id: string): Promise<boolean> {
    const gallery = this.getGallery();
    const imgToDelete = gallery.find((g) => g.id === id);
    if (!imgToDelete) return false;

    const syncRes = await callAdminSyncApi({
      deleteGalleryId: id,
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to delete gallery image from Supabase');
    }

    if (imgToDelete.url && imgToDelete.url.includes('food-images')) {
      deleteImageViaAdminApi(imgToDelete.url);
    }

    const filtered = gallery.filter((g) => g.id !== id);
    this.setGallery(filtered);
    notifyStoreUpdated();

    return true;
  }

  // =========================================================================
  // 5. CROSS-TABLE SYNCHRONIZATION HELPERS
  // =========================================================================
  private static crossSyncGalleryToMenu(title: string, imageUrl: string): void {
    if (!title || !imageUrl) return;
    const items = this.getMenuItems();
    const match = items.find(
      (i) => i.name.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (match && match.image !== imageUrl) {
      this.updateMenuItem(match.id, { image: imageUrl }).catch((err) =>
        console.warn('crossSyncGalleryToMenu non-blocking error:', err)
      );
    }
  }

  private static crossSyncMenuToGallery(name: string, imageUrl: string): void {
    if (!name || !imageUrl) return;
    const gallery = this.getGallery();
    const match = gallery.find(
      (g) => g.title.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (match && match.url !== imageUrl) {
      this.updateGalleryImage(match.id, { url: imageUrl }).catch((err) =>
        console.warn('crossSyncMenuToGallery non-blocking error:', err)
      );
    }
  }

  static async syncAllMenuItemsToSupabase(): Promise<number> {
    const items = this.getMenuItems();
    const categories = this.getCategories();
    const info = this.getRestaurantInfo();
    const gallery = this.getGallery();

    const syncRes = await callAdminSyncApi({
      items,
      categories,
      restaurantInfo: info,
      gallery,
      mode: 'replace',
    });

    if (!syncRes.success) {
      throw new Error(syncRes.error || 'Failed to sync all menu items to Supabase');
    }

    notifyStoreUpdated();
    return items.length;
  }

  // =========================================================================
  // 6. REALTIME DB & MULTI-TAB SUBSCRIPTIONS
  // =========================================================================
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

  // =========================================================================
  // 7. TABLE SESSION
  // =========================================================================
  static getSelectedTable(): number | null {
    if (typeof window === 'undefined') return null;
    const val =
      sessionStorage.getItem(STORAGE_KEYS.TABLE_NUMBER) ||
      localStorage.getItem(STORAGE_KEYS.TABLE_NUMBER);
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

  // =========================================================================
  // 8. ADMIN AUTH
  // =========================================================================
  static isAdminLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    const hasAuth = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
    const hasToken = Boolean(sessionStorage.getItem('namahaa_admin_token'));
    return hasAuth || hasToken;
  }

  static setAdminLoggedIn(status: boolean, token?: string): void {
    if (typeof window === 'undefined') return;
    if (status) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      if (token) {
        sessionStorage.setItem('namahaa_admin_token', token);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      localStorage.removeItem('namahaa_admin_auth_code');
      localStorage.removeItem('namahaa_admin_username');
      sessionStorage.removeItem('namahaa_admin_token');
      // Call server logout route to clear HttpOnly cookie
      fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
    }
  }
}
