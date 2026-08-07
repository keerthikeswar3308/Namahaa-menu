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
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error || !data) {
        console.warn('Supabase menu items fetch fallback:', error);
        return this.getMenuItems();
      }

      const existingCats = this.getCategories();
      const localItems = this.getMenuItems();

      const mappedItems: MenuItem[] = data.map((d, idx) => {
        let catId = d.category_id || '';
        const catName = d.category_name || '';

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
          displayOrder: d.display_order || (idx + 1),
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

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('menu_items').upsert({
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
      });

      if (error) console.error('Supabase add item error:', error);
      else notifyStoreUpdated();
    }

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

    // Preserve exact index in the array so order NEVER changes
    items[index] = updatedItem;
    this.setMenuItems(items);
    notifyStoreUpdated();

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('menu_items').upsert({
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description,
        price: updatedItem.price,
        category_id: updatedItem.categoryId,
        category_name: updatedItem.categoryName,
        image: updatedItem.image,
        is_veg: updatedItem.isVeg,
        preparation_time: updatedItem.preparationTime,
        is_available: updatedItem.isAvailable,
        is_popular: updatedItem.isPopular,
        is_chef_special: updatedItem.isChefSpecial,
        is_today_special: updatedItem.isTodaySpecial,
        ingredients: updatedItem.ingredients,
        chef_recommendation: updatedItem.chefRecommendation,
        display_order: updatedItem.displayOrder,
      });

      if (error) console.error('Supabase update item error:', error);
      else notifyStoreUpdated();
    }

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

    if (isSupabaseConfigured()) {
      supabase.from('menu_items').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase delete item error:', error);
      });
    }

    return true;
  }

  static resetMenuItems(): void {
    this.setMenuItems(initialMenuItems);
    notifyStoreUpdated();
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
    notifyStoreUpdated();

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
    notifyStoreUpdated();

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
    notifyStoreUpdated();

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
    notifyStoreUpdated();

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
  // 4. GALLERY CRUD (SUPABASE + LOCAL CACHE)
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
        .select('*')
        .order('id', { ascending: true });

      if (error || !data) return this.getGallery();

      const localGallery = this.getGallery();

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

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('gallery').upsert({
        id: newImg.id,
        url: newImg.url,
        title: newImg.title,
        category: newImg.category,
        is_enabled: newImg.isEnabled,
      });

      if (error) console.error('Supabase add gallery image error:', error);
      else notifyStoreUpdated();
    }

    // Cross-sync with Menu Items if matching title exists
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

    if (isSupabaseConfigured()) {
      const dbPayload: Record<string, unknown> = {};
      if (finalUrl !== undefined) dbPayload.url = finalUrl;
      if (updates.title !== undefined) dbPayload.title = updates.title;
      if (updates.category !== undefined) dbPayload.category = updates.category;
      if (updates.isEnabled !== undefined) dbPayload.is_enabled = updates.isEnabled;

      const { error } = await supabase.from('gallery').upsert({ id, ...dbPayload });
      if (error) console.error('Supabase update gallery image error:', error);
      else notifyStoreUpdated();
    }

    // Cross-sync with Menu Items if image URL or title changed
    if (updated.url) {
      this.crossSyncGalleryToMenu(updated.title, updated.url);
    }

    return updated;
  }

  static async resetGalleryToDefault(): Promise<GalleryImage[]> {
    this.setGallery(defaultGalleryImages);
    notifyStoreUpdated();

    if (isSupabaseConfigured()) {
      await supabase.from('gallery').delete().neq('id', 'none');
      for (const gal of defaultGalleryImages) {
        await supabase.from('gallery').upsert({
          id: gal.id,
          url: gal.url,
          title: gal.title,
          category: gal.category,
          is_enabled: gal.isEnabled,
        });
      }
      notifyStoreUpdated();
    }
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

    if (isSupabaseConfigured()) {
      supabase.from('gallery').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase delete gallery image error:', error);
      });
    }

    return true;
  }

  // ==========================================
  // 5. CROSS-TABLE AUTOMATIC SYNCHRONIZATION
  // ==========================================
  /**
   * If a Gallery photo is added/updated and matches a Menu Item name,
   * automatically update the Menu Item's image URL in DB & state.
   */
  private static crossSyncGalleryToMenu(title: string, imageUrl: string): void {
    if (!title || !imageUrl) return;
    const items = this.getMenuItems();
    const match = items.find((i) => i.name.trim().toLowerCase() === title.trim().toLowerCase());
    if (match && match.image !== imageUrl) {
      this.updateMenuItem(match.id, { image: imageUrl });
    }
  }

  /**
   * If a Menu Item image is updated and matches a Gallery photo title,
   * automatically update the Gallery photo's URL in DB & state.
   */
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
    if (!isSupabaseConfigured()) return 0;
    const items = this.getMenuItems();
    const categories = this.getCategories();

    for (const cat of categories) {
      await supabase.from('categories').upsert({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        image: cat.image,
        display_order: cat.displayOrder,
        is_enabled: cat.isEnabled,
      });
    }

    let count = 0;
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const { error } = await supabase.from('menu_items').upsert({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: item.categoryId,
        category_name: item.categoryName,
        image: item.image,
        is_veg: item.isVeg,
        preparation_time: item.preparationTime,
        is_available: item.isAvailable,
        is_popular: item.isPopular,
        is_chef_special: item.isChefSpecial,
        is_today_special: item.isTodaySpecial,
        ingredients: item.ingredients,
        chef_recommendation: item.chefRecommendation,
        display_order: item.displayOrder || (idx + 1),
      });

      if (!error) count++;
    }

    notifyStoreUpdated();
    return count;
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
          onUpdate();
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
