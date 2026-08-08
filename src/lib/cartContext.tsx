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
            const found = allMenuItems.find((i) => i.id === entry.id);
            if (found && entry.quantity > 0) {
              restored.push({ item: found, quantity: entry.quantity });
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
            const found = allMenuItems.find((i) => i.id === id);
            if (found) restoredWish.push(found);
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
      const lightweight = cart.map((c) => ({ id: c.item.id, quantity: c.quantity }));
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(lightweight));
    } catch (err) {
      console.warn('Error saving cart:', err);
    }
  }, [cart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const ids = wishlist.map((w) => w.id);
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(ids));
    } catch (err) {
      console.warn('Error saving wishlist:', err);
    }
  }, [wishlist, mounted]);

  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const index = prev.findIndex((c) => c.item.id === item.id);
      if (index > -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], quantity: updated[index].quantity + 1 };
        return updated;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const index = prev.findIndex((c) => c.item.id === itemId);
      if (index === -1) return prev;
      if (prev[index].quantity > 1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], quantity: updated[index].quantity - 1 };
        return updated;
      }
      return prev.filter((c) => c.item.id !== itemId);
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.item.id !== itemId));
      return;
    }
    setCart((prev) => {
      const index = prev.findIndex((c) => c.item.id === itemId);
      if (index === -1) return prev;
      const updated = [...prev];
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

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * Number(item.item.price), 0);

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
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
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
