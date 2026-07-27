"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cartKey } from "@/lib/utils";

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: string;
  /** First product image path ("" when none). */
  image: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
}

export interface AddToCartInput {
  productId: string;
  slug: string;
  name: string;
  type: string;
  image: string;
  price: number;
  color: string;
  size: string;
  quantity?: number;
}

interface StoreContextValue {
  cart: CartItem[];
  favorites: string[];
  hydrated: boolean;
  cartCount: number;
  cartSubtotal: number;
  addToCart: (item: AddToCartInput) => void;
  removeFromCart: (key: string) => void;
  setQuantity: (key: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  cartOpen: boolean;
  searchOpen: boolean;
  clubOpen: boolean;
  menuOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setClubOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/** SSR-safe state synced to localStorage. */
function usePersistentArray<T>(storageKey: string) {
  const [value, setValue] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(JSON.parse(raw) as T[]);
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage might be full / unavailable */
    }
  }, [storageKey, value, hydrated]);

  return [value, setValue, hydrated] as const;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart, cartHydrated] = usePersistentArray<CartItem>("cymt.cart.v1");
  const [favorites, setFavorites, favHydrated] = usePersistentArray<string>("cymt.favorites.v1");
  const hydrated = cartHydrated && favHydrated;

  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Lock body scroll while any overlay is open */
  useEffect(() => {
  const anyOpen = cartOpen || searchOpen || clubOpen || menuOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, searchOpen, clubOpen, menuOpen]);

  /* Esc closes the top-most overlay */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (menuOpen) return setMenuOpen(false);
      if (cartOpen) return setCartOpen(false);
      if (searchOpen) return setSearchOpen(false);
      if (clubOpen) return setClubOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, searchOpen, clubOpen, menuOpen]);

  const addToCart = useCallback(
    (input: AddToCartInput) => {
      const key = cartKey(input.productId, input.color, input.size);
      const qty = input.quantity ?? 1;
      setCart((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + qty } : i));
        }
        return [...prev, { key, ...input, quantity: qty }];
      });
      setCartOpen(true);
    },
    [setCart],
  );

  const removeFromCart = useCallback(
    (key: string) => setCart((prev) => prev.filter((i) => i.key !== key)),
    [setCart],
  );

  const setQuantity = useCallback(
    (key: string, qty: number) =>
      setCart((prev) =>
        prev
          .map((i) => (i.key === key ? { ...i, quantity: Math.max(0, qty) } : i))
          .filter((i) => i.quantity > 0),
      ),
    [setCart],
  );

  const clearCart = useCallback(() => setCart([]), [setCart]);

  const toggleFavorite = useCallback(
    (id: string) =>
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setFavorites],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const { cartCount, cartSubtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const item of cart) {
      count += item.quantity;
      subtotal += item.quantity * item.price;
    }
    return { cartCount: count, cartSubtotal: subtotal };
  }, [cart]);

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      favorites,
      hydrated,
      cartCount,
      cartSubtotal,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      toggleFavorite,
      isFavorite,
      cartOpen,
      searchOpen,
      clubOpen,
      menuOpen,
      setCartOpen,
      setSearchOpen,
      setClubOpen,
      setMenuOpen,
    }),
    [
      cart,
      favorites,
      hydrated,
      cartCount,
      cartSubtotal,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      toggleFavorite,
      isFavorite,
      cartOpen,
      searchOpen,
      clubOpen,
      menuOpen,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
