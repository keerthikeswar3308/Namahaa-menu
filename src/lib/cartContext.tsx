'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem } from '@/types';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
  getItemQuantity: (itemId: string) => number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartViewMode: 'cart' | 'orders';
  setCartViewMode: (mode: 'cart' | 'orders') => void;
  openOrders: () => void;
  wishlist: MenuItem[];
  toggleWishlist: (item: MenuItem) => void;
  isInWishlist: (itemId: string) => boolean;
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CART: 'namahaa_customer_cart_v2',
  WISHLIST: 'namahaa_customer_wishlist_v2',
};

export const CartProvider: React.FC<{ children: React.ReactNode; allMenuItems: MenuItem[] }> = ({
  children,
  allMenuItems,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<MenuItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartViewMode, setCartViewMode] = useState<'cart' | 'orders'>('cart');
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Restore cart & wishlist on client mount and match against Supabase menu items
  useEffect(() => {
    setMounted(true);
    try {
      const storedCart = localStorage.getItem(STORAGE_KEYS.CART);
      if (storedCart) {
        const parsed: Array<{ id: string; quantity: number }> = JSON.parse(storedCart);
        if (Array.isArray(parsed)) {
          const restored: CartItem[] = [];
          parsed.forEach((entry) => {
            if (!entry || !entry.id) return;
            const found = (allMenuItems || []).find((i) => i && i.id === entry.id);
            if (found && found.id && Number(entry.quantity) > 0) {
              restored.push({ item: found, quantity: Number(entry.quantity) });
            }
          });
          setCart(restored);
        }
      }

      const storedWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      if (storedWishlist) {
        const parsedIds: string[] = JSON.parse(storedWishlist);
        if (Array.isArray(parsedIds)) {
          const restoredWish: MenuItem[] = [];
          parsedIds.forEach((id) => {
            if (!id) return;
            const found = (allMenuItems || []).find((i) => i && i.id === id);
            if (found && found.id) restoredWish.push(found);
          });
          setWishlist(restoredWish);
        }
      }
    } catch (err) {
      console.warn('Error restoring cart/wishlist:', err);
    }
  }, [allMenuItems]);

  // Persist lightweight IDs and quantities only
  useEffect(() => {
    if (!mounted) return;
    try {
      const lightweight = (cart || [])
        .filter((c) => c && c.item && c.item.id)
        .map((c) => ({ id: c.item.id, quantity: c.quantity || 1 }));
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(lightweight));
    } catch (err) {
      console.warn('Error saving cart:', err);
    }
  }, [cart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const ids = (wishlist || [])
        .filter((w) => w && w.id)
        .map((w) => w.id);
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(ids));
    } catch (err) {
      console.warn('Error saving wishlist:', err);
    }
  }, [wishlist, mounted]);

  const addToCart = (item: MenuItem) => {
    if (!item || !item.id || !item.isAvailable) return;
    setCart((prev) => {
      const validPrev = (prev || []).filter((c) => c && c.item && c.item.id);
      const index = validPrev.findIndex((c) => c.item.id === item.id);
      if (index > -1) {
        const updated = [...validPrev];
        updated[index] = { ...updated[index], quantity: updated[index].quantity + 1 };
        return updated;
      }
      return [...validPrev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    if (!itemId) return;
    setCart((prev) => {
      const validPrev = (prev || []).filter((c) => c && c.item && c.item.id);
      const index = validPrev.findIndex((c) => c.item.id === itemId);
      if (index === -1) return validPrev;
      if (validPrev[index].quantity > 1) {
        const updated = [...validPrev];
        updated[index] = { ...updated[index], quantity: updated[index].quantity - 1 };
        return updated;
      }
      return validPrev.filter((c) => c.item.id !== itemId);
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (!itemId) return;
    if (quantity <= 0) {
      setCart((prev) => (prev || []).filter((c) => c && c.item && c.item.id !== itemId));
      return;
    }
    setCart((prev) => {
      const validPrev = (prev || []).filter((c) => c && c.item && c.item.id);
      const index = validPrev.findIndex((c) => c.item.id === itemId);
      if (index === -1) return validPrev;
      const updated = [...validPrev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setIsCartOpen(false);
  };

  const getItemQuantity = (itemId: string): number => {
    const entry = cart.find((c) => c.item.id === itemId);
    return entry ? entry.quantity : 0;
  };

  const toggleWishlist = (item: MenuItem) => {
    setWishlist((prev) => {
      const exists = prev.some((w) => w.id === item.id);
      if (exists) {
        return prev.filter((w) => w.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isInWishlist = (itemId: string): boolean => {
    return wishlist.some((w) => w.id === itemId);
  };

  const totalCount = (cart || []).reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const totalPrice = (cart || []).reduce((sum, item) => sum + (item?.quantity || 0) * Number(item?.item?.price || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
        getItemQuantity,
        isCartOpen,
        openCart: () => {
          setCartViewMode('cart');
          setIsCartOpen(true);
        },
        closeCart: () => setIsCartOpen(false),
        cartViewMode,
        setCartViewMode,
        openOrders: () => {
          setCartViewMode('orders');
          setIsCartOpen(true);
        },
        wishlist,
        toggleWishlist,
        isInWishlist,
        isWishlistOpen,
        openWishlist: () => setIsWishlistOpen(true),
        closeWishlist: () => setIsWishlistOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
