"use client";

/**
 * MODO EDITOR — Provider de catálogo vivo.
 *
 * Capa NO invasiva sobre `src/data/catalog.ts`:
 * - overrides por producto (nombre, precio, descripción, imágenes, variantes…)
 * - productos creados dinámicamente por colección (sin límite)
 * - productos eliminados (soft-delete sobre el catálogo base)
 *
 * Persistido en localStorage — mismo patrón que carrito y favoritos.
 * Con EDIT_MODE = false queda inerte: cero herramientas, catálogo original.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EDIT_MODE } from "@/config/edit-mode";
import {
  products as baseProducts,
  type Product,
  type ProductStatus,
} from "@/data/catalog";
import { slugify } from "@/lib/utils";

export interface ProductOverride {
  name?: string;
  price?: number;
  description?: string;
  type?: string;
  status?: ProductStatus;
  sizes?: string[];
  /** Galería completa; el índice 0 es SIEMPRE la portada elegida por el admin. */
  images?: string[];
  /** Variantes por mockup (array paralelo a `images`). */
  variants?: string[];
}

type OverridesMap = Record<string, ProductOverride>;

interface EditorContextValue {
  enabled: boolean;
  hydrated: boolean;
  /** Logo elegido localmente para el modo editor. `null` conserva el logo base. */
  logoSrc: string | null;
  overrides: OverridesMap;
  customProducts: Product[];
  deletedIds: string[];
  /** Catálogo vivo: base − eliminados + custom, con overrides aplicados. */
  liveProducts: Product[];
  activeId: string | null;
  openEditor: (productId: string) => void;
  closeEditor: () => void;
  updateLogo: (src: string | null) => void;
  updateOverride: (productId: string, patch: ProductOverride) => void;
  /** Crea un producto vacío en la colección (drop) indicada y abre el editor. */
  createProduct: (dropSlug: string) => Product;
  /** Elimina un producto (base o custom) del catálogo vivo. */
  deleteProduct: (productId: string) => void;
  getLiveProduct: (idOrSlug: string) => Product | undefined;
  productsByDropLive: (dropSlug: string) => Product[];
}

const EditorContext = createContext<EditorContextValue | null>(null);

const STORAGE_KEY = "cymt.editor.state.v2";

interface PersistedState {
  logoSrc?: string | null;
  overrides: OverridesMap;
  customProducts: Product[];
  deletedIds: string[];
}

function applyOverride(product: Product, o?: ProductOverride): Product {
  if (!o) return product;
  return {
    ...product,
    name: o.name ?? product.name,
    price: o.price ?? product.price,
    description: o.description ?? product.description,
    type: o.type ?? product.type,
    status: o.status ?? product.status,
    sizes: o.sizes ?? product.sizes,
    images: o.images ?? product.images,
    variants: o.variants ?? product.variants,
  };
}

function buildLiveCatalog(
  overrides: OverridesMap,
  customProducts: Product[],
  deletedIds: string[],
): Product[] {
  const deleted = new Set(deletedIds);
  const fromBase = baseProducts
    .filter((p) => !deleted.has(p.id))
    .map((p) => applyOverride(p, overrides[p.id]));
  const fromCustom = customProducts
    .filter((p) => !deleted.has(p.id))
    .map((p) => applyOverride(p, overrides[p.id]));
  return [...fromBase, ...fromCustom];
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /* Cargar estado guardado (solo en modo editor) */
  useEffect(() => {
    if (!EDIT_MODE) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (typeof parsed.logoSrc === "string") setLogoSrc(parsed.logoSrc);
        if (parsed.overrides) setOverrides(parsed.overrides);
        if (Array.isArray(parsed.customProducts)) setCustomProducts(parsed.customProducts);
        if (Array.isArray(parsed.deletedIds)) setDeletedIds(parsed.deletedIds);
      } else {
        // Migrar overrides del storage v1 si existían
        const legacy = localStorage.getItem("cymt.editor.overrides.v1");
        if (legacy) {
          setOverrides(JSON.parse(legacy) as OverridesMap);
        }
      }
    } catch {
      /* storage corrupto → ignorar */
    }
    setHydrated(true);
  }, []);

  /* Persistir cambios */
  useEffect(() => {
    if (!EDIT_MODE || !hydrated) return;
    try {
      const payload: PersistedState = { logoSrc, overrides, customProducts, deletedIds };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* cuota llena → los cambios siguen vivos en memoria */
    }
  }, [logoSrc, overrides, customProducts, deletedIds, hydrated]);

  /* Bloquear scroll mientras el panel está abierto */
  useEffect(() => {
    if (!EDIT_MODE) return;
    if (activeId) document.body.style.overflow = "hidden";
    return () => {
      if (activeId) document.body.style.overflow = "";
    };
  }, [activeId]);

  /* Esc cierra el panel */
  useEffect(() => {
    if (!EDIT_MODE || !activeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const liveProducts = useMemo(
    () => buildLiveCatalog(overrides, customProducts, deletedIds),
    [overrides, customProducts, deletedIds],
  );

  const openEditor = useCallback((productId: string) => {
    if (EDIT_MODE) setActiveId(productId);
  }, []);

  const closeEditor = useCallback(() => setActiveId(null), []);

  const updateLogo = useCallback((src: string | null) => {
    if (EDIT_MODE) setLogoSrc(src);
  }, []);

  const updateOverride = useCallback((productId: string, patch: ProductOverride) => {
    setOverrides((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], ...patch },
    }));
    // Si es un producto custom, sincronizar también el objeto base
    // (nombre/slug se mantienen coherentes para la URL).
    setCustomProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const next = { ...p, ...patch };
        if (typeof patch.name === "string" && patch.name.trim()) {
          next.slug = `${slugify(patch.name)}-${productId.slice(-6)}`;
        }
        return next;
      }),
    );
  }, []);

  const createProduct = useCallback(
    (dropSlug: string): Product => {
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const createdAt = new Date().toISOString().slice(0, 10);
      const product: Product = {
        id,
        slug: `nuevo-producto-${id.slice(-6)}`,
        name: "Nuevo producto",
        type: "Camiseta",
        price: 0,
        description: "Descripción del producto. Edítala desde el panel.",
        dropSlug,
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: [],
        stock: 0,
        images: [],
        variants: [],
        status: "nuevo",
        featured: false,
        bestSeller: false,
        tags: [],
        createdAt,
      };
      setCustomProducts((prev) => [...prev, product]);
      setActiveId(id);
      return product;
    },
    [],
  );

  const deleteProduct = useCallback((productId: string) => {
    setDeletedIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setCustomProducts((prev) => prev.filter((p) => p.id !== productId));
    setOverrides((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setActiveId((current) => (current === productId ? null : current));
  }, []);

  const getLiveProduct = useCallback(
    (idOrSlug: string) =>
      liveProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug),
    [liveProducts],
  );

  const productsByDropLive = useCallback(
    (dropSlug: string) => liveProducts.filter((p) => p.dropSlug === dropSlug),
    [liveProducts],
  );

  const value = useMemo<EditorContextValue>(
    () => ({
      enabled: EDIT_MODE,
      hydrated,
      logoSrc,
      overrides,
      customProducts,
      deletedIds,
      liveProducts,
      activeId,
      openEditor,
      closeEditor,
      updateLogo,
      updateOverride,
      createProduct,
      deleteProduct,
      getLiveProduct,
      productsByDropLive,
    }),
    [
      hydrated,
      logoSrc,
      overrides,
      customProducts,
      deletedIds,
      liveProducts,
      activeId,
      openEditor,
      closeEditor,
      updateLogo,
      updateOverride,
      createProduct,
      deleteProduct,
      getLiveProduct,
      productsByDropLive,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
}

/**
 * Fusiona un producto del catálogo con su override del editor.
 * Con EDIT_MODE = false devuelve el producto original intacto.
 */
export function useEditedProduct(product: Product): Product {
  const { overrides, liveProducts } = useEditor();
  return useMemo(() => {
    // Preferir la versión del catálogo vivo (incluye custom + overrides)
    const live = liveProducts.find((p) => p.id === product.id);
    if (live) return live;
    if (!EDIT_MODE) return product;
    return applyOverride(product, overrides[product.id]);
  }, [product, overrides, liveProducts]);
}

/**
 * Catálogo vivo completo. Sin EDIT_MODE devuelve el catálogo base.
 */
export function useLiveProducts(): Product[] {
  const { liveProducts } = useEditor();
  return liveProducts;
}
