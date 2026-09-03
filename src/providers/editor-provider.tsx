"use client";

/**
 * MODO EDITOR — Provider de catálogo vivo.
 *
 * Capa NO invasiva sobre el catálogo de PostgreSQL:
 * - overrides por producto (nombre, precio, descripción, imágenes, variantes…)
 * - productos creados dinámicamente por colección (sin límite)
 * - productos eliminados (soft-delete sobre el catálogo base)
 *
 * Persistido en localStorage — mismo patrón que carrito y favoritos.
 * Los controles solo se habilitan bajo /admin; el catálogo vivo sigue global.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { EDIT_MODE } from "@/config/edit-mode";
import {
  type Product,
  type ProductColor,
  type ProductStatus,
  type ProductVariant,
  type ProductVariantImage,
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
const EMPTY_OVERRIDES: OverridesMap = {};

type ProductVariantImageReplacement = Omit<
  ProductVariantImage,
  "id" | "productVariantId" | "createdAt"
> & {
  id?: number;
  productVariantId?: number;
  createdAt?: string;
};

type ProductVariantReplacement = Omit<
  ProductVariant,
  "id" | "productId" | "createdAt" | "images"
> & {
  id?: number;
  productId?: number;
  createdAt?: string;
  images: ProductVariantImageReplacement[];
};

interface EditorContextValue {
  enabled: boolean;
  hydrated: boolean;
  /** Logo elegido localmente para el modo editor. `null` conserva el logo base. */
  logoSrc: string | null;
  overrides: OverridesMap;
  /** Catálogo vivo: base − eliminados + custom, con overrides aplicados. */
  liveProducts: Product[];
  activeId: string | null;
  openEditor: (productId: string) => void;
  closeEditor: () => void;
  updateLogo: (src: string | null) => void;
  updateOverride: (productId: string, patch: ProductOverride) => void;
  /** Reemplaza el estado completo autoritativo; las variantes omitidas se eliminan. */
  replaceProductVariants: (
    productId: string,
    nextProductVariants: ProductVariantReplacement[],
  ) => Promise<void>;
  /** Asigna o quita un Drop en lote y luego recarga el estado confirmado. */
  assignProductsToDrop: (productIds: string[], dropSlug: string | null) => Promise<void>;
  /** Crea un producto vacío en la colección (drop) indicada y abre el editor. */
  createProduct: (
    dropSlug: string,
    productVariants?: ProductVariantReplacement[],
  ) => Promise<void>;
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
}

type ProductVariantColorStatus = "confirmed" | "requires_user_input";

interface ProductVariantImageWritePayload {
  storageKey: string | null;
  legacyUrl: string | null;
  originalFilename: string;
  originalSourcePath: string | null;
  position: number;
  isCover: boolean;
}

interface ProductVariantWritePayload {
  colorName: string | null;
  colorHex: string | null;
  colorStatus: ProductVariantColorStatus;
  position: number;
  isDefault: boolean;
}

interface ProductVariantImageUpsertPayload extends ProductVariantImageWritePayload {
  id?: number;
}

interface ProductVariantImageOperationsPayload {
  upsert: ProductVariantImageUpsertPayload[];
  deleteIds: number[];
}

interface ProductVariantUpsertPayload extends ProductVariantWritePayload {
  id?: number;
  clientKey?: string;
  images: ProductVariantImageOperationsPayload;
}

interface ProductVariantImageMovePayload {
  imageId: number;
  fromVariantId: number;
  toVariantId?: number;
  toVariantClientKey?: string;
  position: number;
  isCover: boolean;
}

interface ProductVariantOperationsPayload {
  upsert: ProductVariantUpsertPayload[];
  deleteIds: number[];
  moveImages: ProductVariantImageMovePayload[];
}

type ProductListUpdater = (products: Product[]) => Product[];

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toProductColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      "hex" in item &&
      typeof item.name === "string" &&
      typeof item.hex === "string"
    ) {
      return [{ name: item.name, hex: item.hex }];
    }

    return [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toProductVariantImage(value: unknown): ProductVariantImage | null {
  if (!isRecord(value)) return null;

  const id = toInteger(value.id);
  const productVariantId = toInteger(value.productVariantId);
  const position = toInteger(value.position);

  if (
    id === null ||
    productVariantId === null ||
    position === null ||
    typeof value.originalFilename !== "string" ||
    typeof value.isCover !== "boolean" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    productVariantId,
    storageKey: toNullableString(value.storageKey),
    legacyUrl: toNullableString(value.legacyUrl),
    originalFilename: value.originalFilename,
    originalSourcePath: toNullableString(value.originalSourcePath),
    position,
    isCover: value.isCover,
    createdAt: value.createdAt,
  };
}

function toProductVariantImages(value: unknown): ProductVariantImage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const image = toProductVariantImage(item);
    return image === null ? [] : [image];
  });
}

function toProductVariants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = toInteger(item.id);
    const productId = toInteger(item.productId);
    const position = toInteger(item.position);

    if (
      id === null ||
      productId === null ||
      position === null ||
      typeof item.colorStatus !== "string" ||
      typeof item.isDefault !== "boolean" ||
      typeof item.createdAt !== "string"
    ) {
      return [];
    }

    return [{
      id,
      productId,
      colorName: toNullableString(item.colorName),
      colorHex: toNullableString(item.colorHex),
      colorStatus: item.colorStatus,
      position,
      isDefault: item.isDefault,
      createdAt: item.createdAt,
      images: toProductVariantImages(item.images),
    }];
  });
}

function cloneProductVariantReplacements(
  variants: ProductVariantReplacement[],
): ProductVariantReplacement[] {
  return variants.map((variant) => ({
    ...variant,
    images: variant.images.map((image) => ({ ...image })),
  }));
}

function toEntityId(value: unknown, entityName: string): number | null {
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${entityName} id must be an integer`);
  }

  return value > 0 ? value : null;
}

function confirmedItemsById<T extends { id: number }>(
  items: readonly T[],
  entityName: string,
): Map<number, T> {
  const itemsById = new Map<number, T>();

  for (const item of items) {
    const id = toEntityId(item.id, entityName);
    if (id === null) {
      throw new Error(`${entityName} from the confirmed state must have a positive id`);
    }
    if (itemsById.has(id)) {
      throw new Error(`Confirmed ${entityName} ids must be unique`);
    }
    itemsById.set(id, item);
  }

  return itemsById;
}

function toVariantColorStatus(value: string): ProductVariantColorStatus {
  if (value === "confirmed" || value === "requires_user_input") return value;
  throw new Error("Product variant has an unsupported color status");
}

function toProductVariantImageWritePayload(
  image: ProductVariantImageReplacement,
): ProductVariantImageWritePayload {
  return {
    storageKey: image.storageKey,
    legacyUrl: image.legacyUrl,
    originalFilename: image.originalFilename,
    originalSourcePath: image.originalSourcePath,
    position: image.position,
    isCover: image.isCover,
  };
}

function toProductVariantWritePayload(
  variant: ProductVariantReplacement,
): ProductVariantWritePayload {
  return {
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    colorStatus: toVariantColorStatus(variant.colorStatus),
    position: variant.position,
    isDefault: variant.isDefault,
  };
}

function sameProductVariantImage(
  current: ProductVariantImage,
  next: ProductVariantImageReplacement,
): boolean {
  return (
    current.storageKey === next.storageKey &&
    current.legacyUrl === next.legacyUrl &&
    current.originalFilename === next.originalFilename &&
    current.originalSourcePath === next.originalSourcePath &&
    current.position === next.position &&
    current.isCover === next.isCover
  );
}

function sameProductVariant(current: ProductVariant, next: ProductVariantReplacement): boolean {
  return (
    current.colorName === next.colorName &&
    current.colorHex === next.colorHex &&
    current.colorStatus === next.colorStatus &&
    current.position === next.position &&
    current.isDefault === next.isDefault
  );
}

function hasProductVariantImageOperations(
  operations: ProductVariantImageOperationsPayload,
): boolean {
  return operations.upsert.length > 0 || operations.deleteIds.length > 0;
}

function buildProductVariantOperations(
  currentVariants: ProductVariant[],
  nextVariants: ProductVariantReplacement[],
): ProductVariantOperationsPayload | null {
  const currentVariantsById = confirmedItemsById(currentVariants, "Product variant");
  const currentImagesById = confirmedItemsById(
    currentVariants.flatMap((variant) => variant.images),
    "Product variant image",
  );
  const retainedVariantIds = new Set<number>();

  for (const variant of nextVariants) {
    const variantId = toEntityId(variant.id, "Product variant");
    if (variantId === null) continue;
    if (!currentVariantsById.has(variantId)) {
      throw new Error("Product variant id is not confirmed for this product");
    }
    if (retainedVariantIds.has(variantId)) {
      throw new Error("Product variant ids must be unique in a replacement");
    }
    retainedVariantIds.add(variantId);
  }

  const deleteIds = [...currentVariantsById.keys()].filter((id) => !retainedVariantIds.has(id));
  const destinations = new Map<
    ProductVariantReplacement,
    { id?: number; clientKey?: string }
  >();
  let newVariantIndex = 0;

  for (const variant of nextVariants) {
    const variantId = toEntityId(variant.id, "Product variant");
    if (variantId !== null) {
      destinations.set(variant, { id: variantId });
      continue;
    }

    destinations.set(variant, {
      clientKey: `new-variant-${crypto.randomUUID()}-${newVariantIndex++}`,
    });
  }

  const nextImagesById = new Map<
    number,
    { image: ProductVariantImageReplacement; destination: { id?: number; clientKey?: string } }
  >();

  for (const variant of nextVariants) {
    const destination = destinations.get(variant);
    if (!destination) throw new Error("Product variant destination is missing");

    for (const image of variant.images) {
      const imageId = toEntityId(image.id, "Product variant image");
      if (imageId === null) continue;
      if (!currentImagesById.has(imageId)) {
        throw new Error("Product variant image id is not confirmed for this product");
      }
      if (nextImagesById.has(imageId)) {
        throw new Error("Product variant image ids must be unique in a replacement");
      }
      nextImagesById.set(imageId, { image, destination });
    }
  }

  const moveImages: ProductVariantImageMovePayload[] = [];
  for (const [imageId, { image, destination }] of nextImagesById) {
    const currentImage = currentImagesById.get(imageId);
    if (!currentImage) throw new Error("Product variant image is not confirmed");

    if (destination.id === currentImage.productVariantId) continue;

    if (destination.id === undefined && !destination.clientKey) {
      throw new Error("New product variant client key is missing");
    }

    moveImages.push({
      imageId,
      fromVariantId: currentImage.productVariantId,
      ...(destination.id === undefined
        ? { toVariantClientKey: destination.clientKey }
        : { toVariantId: destination.id }),
      position: image.position,
      isCover: image.isCover,
    });
  }

  const upsert: ProductVariantUpsertPayload[] = [];

  for (const variant of nextVariants) {
    const variantId = toEntityId(variant.id, "Product variant");
    const destination = destinations.get(variant);
    if (!destination) throw new Error("Product variant destination is missing");

    if (variantId === null) {
      upsert.push({
        ...toProductVariantWritePayload(variant),
        clientKey: destination.clientKey,
        images: {
          upsert: variant.images.flatMap((image) =>
            toEntityId(image.id, "Product variant image") === null
              ? [toProductVariantImageWritePayload(image)]
              : [],
          ),
          deleteIds: [],
        },
      });
      continue;
    }

    const currentVariant = currentVariantsById.get(variantId);
    if (!currentVariant) {
      throw new Error("Product variant id is not confirmed for this product");
    }
    const imageOperations: ProductVariantImageOperationsPayload = {
      upsert: variant.images.flatMap((image) => {
        const imageId = toEntityId(image.id, "Product variant image");
        if (imageId === null) return [toProductVariantImageWritePayload(image)];

        const currentImage = currentImagesById.get(imageId);
        if (!currentImage) {
          throw new Error("Product variant image id is not confirmed for this product");
        }
        if (currentImage.productVariantId !== currentVariant.id) return [];

        return sameProductVariantImage(currentImage, image)
          ? []
          : [{ id: currentImage.id, ...toProductVariantImageWritePayload(image) }];
      }),
      deleteIds: currentVariant.images
        .filter((image) => !nextImagesById.has(image.id))
        .map((image) => image.id),
    };

    if (!sameProductVariant(currentVariant, variant) || hasProductVariantImageOperations(imageOperations)) {
      upsert.push({
        id: currentVariant.id,
        ...toProductVariantWritePayload(variant),
        images: imageOperations,
      });
    }
  }

  return upsert.length > 0 || deleteIds.length > 0 || moveImages.length > 0
    ? { upsert, deleteIds, moveImages }
    : null;
}

function hasProductVariants(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.productVariants);
}

function isProductStatus(value: unknown): value is ProductStatus {
  return value === "nuevo" || value === "oferta" || value === "limitada" || value === "agotado";
}

function toProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;

  const product = value;
  const price = toNumber(product.price);

  if (
    (typeof product.id !== "number" && typeof product.id !== "string") ||
    typeof product.slug !== "string" ||
    typeof product.name !== "string" ||
    typeof product.type !== "string" ||
    price === null
  ) {
    return null;
  }

  const compareAtPrice = toNumber(product.compareAtPrice);

  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    type: product.type,
    price,
    compareAtPrice: compareAtPrice ?? undefined,
    description: typeof product.description === "string" ? product.description : "",
    details: toStringArray(product.details),
    dropSlug: typeof product.dropSlug === "string" ? product.dropSlug : "",
    sizes: toStringArray(product.sizes),
    colors: toProductColors(product.colors),
    stock: toNumber(product.stock) ?? 0,
    images: toStringArray(product.images),
    productVariants: toProductVariants(product.productVariants),
    status: isProductStatus(product.status) ? product.status : "nuevo",
    featured: product.featured === true,
    bestSeller: product.bestSeller === true,
    tags: toStringArray(product.tags),
    createdAt: typeof product.createdAt === "string" ? product.createdAt : new Date(0).toISOString(),
  };
}

function normalizeProductResponse(value: unknown, fallback?: Product): Product | null {
  const product = toProduct(value);
  if (!product) return null;

  return hasProductVariants(value)
    ? product
    : { ...product, productVariants: fallback?.productVariants ?? product.productVariants };
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // La respuesta puede no contener JSON; se conserva el mensaje de respaldo.
  }

  return fallback;
}

async function fetchConfirmedProducts(endpoint: "/api/products" | "/api/admin/products"): Promise<Product[]> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(await responseError(response, "Unable to refresh products"));
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Products API returned an invalid response");
  }

  const normalized = data.map(toProduct);
  if (normalized.some((product) => product === null)) {
    throw new Error("Products API returned an invalid product");
  }

  return normalized.filter((product): product is Product => product !== null);
}

function toProductVariantCreatePayload(
  variant: ProductVariantReplacement,
): ProductVariantWritePayload & { images: ProductVariantImageWritePayload[] } {
  if (toEntityId(variant.id, "Product variant") !== null) {
    throw new Error("A new product cannot include a persisted product variant id");
  }

  return {
    ...toProductVariantWritePayload(variant),
    images: variant.images.map((image) => {
      if (toEntityId(image.id, "Product variant image") !== null) {
        throw new Error("A new product variant cannot include a persisted image id");
      }
      return toProductVariantImageWritePayload(image);
    }),
  };
}

function toProductCreatePayload(
  product: Omit<Product, "productVariants">,
  productVariants?: ProductVariantReplacement[],
): Omit<Product, "productVariants"> & {
  productVariants?: Array<ProductVariantWritePayload & { images: ProductVariantImageWritePayload[] }>;
} {
  if (productVariants === undefined) return product;

  return {
    ...product,
    productVariants: productVariants.map(toProductVariantCreatePayload),
  };
}

function replaceProduct(products: Product[], productId: string, nextProduct: Product): Product[] {
  return products.map((product) => (product.id === productId ? nextProduct : product));
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

function variantOverrides(overrides: OverridesMap): OverridesMap {
  const variantsOnly: OverridesMap = {};

  for (const [productId, override] of Object.entries(overrides)) {
    if (Array.isArray(override.variants)) {
      variantsOnly[productId] = { variants: override.variants };
    }
  }

  return variantsOnly;
}

function buildLiveCatalog(
  databaseProducts: Product[],
  overrides: OverridesMap,
): Product[] {
  return databaseProducts.map((product) => applyOverride(product, overrides[product.id]));
}

function toDatabaseId(id: string): number | null {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enabled = EDIT_MODE && pathname.startsWith("/admin") && pathname !== "/admin/login";
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([]);
  const databaseProductsRef = useRef<Product[]>([]);
  const persistedProductsRef = useRef<Product[]>([]);
  const pendingProductVariantReplacements = useRef(new Set<string>());
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const adminStateReadyToPersistRef = useRef(false);
  const productMutationQueues = useRef<Record<string, Promise<void>>>({});

  const updateDatabaseProducts = useCallback((updater: ProductListUpdater) => {
    const nextProducts = updater(databaseProductsRef.current);
    databaseProductsRef.current = nextProducts;
    setDatabaseProducts(nextProducts);
  }, []);

  const replacePersistedProduct = useCallback((productId: string, product: Product) => {
    persistedProductsRef.current = replaceProduct(persistedProductsRef.current, productId, product);
  }, []);

  /* Cargar estado guardado solo dentro de la ruta administrativa. */
  useEffect(() => {
    if (!enabled) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (typeof parsed.logoSrc === "string") setLogoSrc(parsed.logoSrc);
        if (parsed.overrides) setOverrides(variantOverrides(parsed.overrides));
      } else {
        // Migrar overrides del storage v1 si existían
        const legacy = localStorage.getItem("cymt.editor.overrides.v1");
        if (legacy) {
          setOverrides(variantOverrides(JSON.parse(legacy) as OverridesMap));
        }
      }
    } catch {
      /* storage corrupto → ignorar */
    }
    setHydrated(true);
  }, [enabled]);

  /* Cargar el catálogo base desde PostgreSQL mediante la API existente. */
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const products = await fetchConfirmedProducts(
          enabled ? "/api/admin/products" : "/api/products",
        );
        if (cancelled) return;

        databaseProductsRef.current = products;
        persistedProductsRef.current = products;
        setDatabaseProducts(products);
      } catch {
        /* La interfaz conserva los productos locales creados durante esta sesión. */
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /* Persistir cambios */
  useEffect(() => {
    if (!enabled || !hydrated) {
      adminStateReadyToPersistRef.current = false;
      return;
    }
    if (!adminStateReadyToPersistRef.current) {
      adminStateReadyToPersistRef.current = true;
      return;
    }
    try {
      const payload: PersistedState = { logoSrc, overrides };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* cuota llena → los cambios siguen vivos en memoria */
    }
  }, [enabled, logoSrc, overrides, hydrated]);

  /* Bloquear scroll mientras el panel está abierto */
  useEffect(() => {
    if (!enabled) {
      document.body.style.overflow = "";
      return;
    }
    if (activeId) document.body.style.overflow = "hidden";
    return () => {
      if (activeId) document.body.style.overflow = "";
    };
  }, [activeId, enabled]);

  /* Esc cierra el panel */
  useEffect(() => {
    if (!enabled || !activeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, enabled]);

  const liveProducts = useMemo(
    () => buildLiveCatalog(databaseProducts, enabled ? overrides : EMPTY_OVERRIDES),
    [databaseProducts, enabled, overrides],
  );

  const openEditor = useCallback((productId: string) => {
    if (enabled) setActiveId(productId);
  }, [enabled]);

  const closeEditor = useCallback(() => setActiveId(null), []);

  const updateLogo = useCallback((src: string | null) => {
    if (enabled) setLogoSrc(src);
  }, [enabled]);

  const enqueueProductMutation = useCallback(
    (productId: string, mutation: () => Promise<void>): Promise<void> => {
      const previous = productMutationQueues.current[productId] ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(mutation);
      productMutationQueues.current[productId] = next;
      void next.catch((error: unknown) => {
        console.error("No fue posible guardar el producto:", error);
      });
      return next;
    },
    [],
  );

  const updateOverride = useCallback((productId: string, patch: ProductOverride) => {
    if ("productVariants" in patch) {
      console.error("Use replaceProductVariants for relational product variants");
      return;
    }

    updateDatabaseProducts((products) =>
      products.map((product) =>
        product.id === productId ? applyOverride(product, patch) : product,
      ),
    );

    if (patch.variants !== undefined) {
      setOverrides((prev) => ({
        ...prev,
        [productId]: { ...prev[productId], variants: patch.variants },
      }));
    }

    const { variants: _variants, ...databasePatch } = patch;
    if (Object.keys(databasePatch).length === 0) return;

    const id = toDatabaseId(productId);
    if (id === null) return;

    enqueueProductMutation(productId, async () => {
      const persistedProduct = persistedProductsRef.current.find(
        (product) => product.id === productId,
      );

      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...databasePatch }),
      });

      if (!response.ok) throw new Error("Unable to update product");

      const data: unknown = await response.json();
      const updated = normalizeProductResponse(data, persistedProduct);
      if (!updated) throw new Error("API returned an invalid product");

      replacePersistedProduct(productId, updated);
      updateDatabaseProducts((products) => replaceProduct(products, productId, updated));
    });
  }, [enqueueProductMutation, replacePersistedProduct, updateDatabaseProducts]);

  const replaceProductVariants = useCallback(
    async (
      productId: string,
      nextProductVariants: ProductVariantReplacement[],
    ): Promise<void> => {
      const id = toDatabaseId(productId);
      if (id === null) {
        throw new Error("Product id is not valid for variant persistence");
      }
      if (pendingProductVariantReplacements.current.has(productId)) {
        throw new Error("Wait for the current product variant replacement to finish");
      }

      const replacement = cloneProductVariantReplacements(nextProductVariants);
      pendingProductVariantReplacements.current.add(productId);

      try {
        await enqueueProductMutation(productId, async () => {
          const persistedProduct = persistedProductsRef.current.find(
            (product) => product.id === productId,
          );
          if (!persistedProduct) {
            throw new Error("Product is not available for persistence");
          }

          const variantOperations = buildProductVariantOperations(
            persistedProduct.productVariants ?? [],
            replacement,
          );
          if (variantOperations === null) return;

          const response = await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, variantOperations }),
          });

          if (!response.ok) throw new Error("Unable to update product variants");

          const data: unknown = await response.json();
          if (!hasProductVariants(data)) {
            throw new Error("API did not return persisted product variants");
          }

          const updated = normalizeProductResponse(data);
          if (!updated) throw new Error("API returned an invalid product");

          replacePersistedProduct(productId, updated);
          updateDatabaseProducts((products) => replaceProduct(products, productId, updated));
        });
      } finally {
        pendingProductVariantReplacements.current.delete(productId);
      }
    },
    [enqueueProductMutation, replacePersistedProduct, updateDatabaseProducts],
  );

  const assignProductsToDrop = useCallback(
    async (productIds: string[], dropSlug: string | null): Promise<void> => {
      const databaseIds = productIds.map(toDatabaseId);
      if (
        databaseIds.length === 0 ||
        databaseIds.some((id) => id === null)
      ) {
        throw new Error("Selecciona productos válidos antes de actualizar el Drop");
      }

      const ids = databaseIds.filter((id): id is number => id !== null);
      if (new Set(ids).size !== ids.length) {
        throw new Error("La selección contiene productos duplicados");
      }

      let requestError: Error | null = null;
      try {
        const response = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bulkDropAssignment: {
              productIds: ids,
              dropSlug,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(await responseError(response, "No fue posible actualizar los Drops"));
        }

        const updated: unknown = await response.json();
        if (!Array.isArray(updated) || updated.length !== ids.length) {
          throw new Error("La API no confirmó todos los productos actualizados");
        }

        const updatedIds = updated.map((product) =>
          isRecord(product) && typeof product.id === "number" ? product.id : null,
        );
        if (
          updatedIds.some((id) => id === null) ||
          new Set(updatedIds).size !== ids.length ||
          !ids.every((id) => updatedIds.includes(id))
        ) {
          throw new Error("La API confirmó una selección de productos inesperada");
        }
      } catch (error) {
        requestError = error instanceof Error ? error : new Error("No fue posible actualizar los Drops");
      }

      try {
        const confirmedProducts = await fetchConfirmedProducts("/api/admin/products");
        databaseProductsRef.current = confirmedProducts;
        persistedProductsRef.current = confirmedProducts;
        setDatabaseProducts(confirmedProducts);
      } catch (error) {
        const refreshError = error instanceof Error ? error.message : "Error desconocido";
        if (requestError) {
          throw new Error(`${requestError.message}. Tampoco fue posible refrescar los productos: ${refreshError}`);
        }
        throw new Error(`La actualización fue confirmada, pero no fue posible refrescar los productos: ${refreshError}`);
      }

      if (requestError) throw requestError;
    },
    [],
  );

  const createProduct = useCallback(
    async (
      dropSlug: string,
      initialProductVariants?: ProductVariantReplacement[],
    ): Promise<void> => {
      const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const createdAt = new Date().toISOString().slice(0, 10);
      const product: Omit<Product, "productVariants"> = {
        id: "",
        slug: `${slugify("Nuevo producto")}-${suffix}`,
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
      try {
        const productVariants =
          initialProductVariants === undefined
            ? undefined
            : cloneProductVariantReplacements(initialProductVariants);
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toProductCreatePayload(product, productVariants)),
        });

        if (!response.ok) throw new Error("Unable to create product");

        const data: unknown = await response.json();
        if (productVariants !== undefined && !hasProductVariants(data)) {
          throw new Error("API did not return persisted product variants");
        }

        const created = normalizeProductResponse(data);
        if (!created) throw new Error("API returned an invalid product");

        updateDatabaseProducts((products) => [...products, created]);
        persistedProductsRef.current = [...persistedProductsRef.current, created];
        setActiveId(created.id);
      } catch (error) {
        console.error("No fue posible crear el producto:", error);
      }
    },
    [updateDatabaseProducts],
  );

  const deleteProduct = useCallback((productId: string) => {
    const id = toDatabaseId(productId);
    const product = databaseProductsRef.current.find((item) => item.id === productId);
    if (id === null || !product) return;

    updateDatabaseProducts((products) => products.filter((item) => item.id !== productId));
    setOverrides((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setActiveId((current) => (current === productId ? null : current));

    enqueueProductMutation(productId, async () => {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        persistedProductsRef.current = persistedProductsRef.current.filter(
          (item) => item.id !== productId,
        );
        return;
      }

      updateDatabaseProducts((products) =>
        products.some((item) => item.id === productId) ? products : [...products, product],
      );
      throw new Error("Unable to delete product");
    });
  }, [enqueueProductMutation, updateDatabaseProducts]);

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
      enabled,
      hydrated,
      logoSrc,
      overrides,
      liveProducts,
      activeId,
      openEditor,
      closeEditor,
      updateLogo,
      updateOverride,
      replaceProductVariants,
      assignProductsToDrop,
      createProduct,
      deleteProduct,
      getLiveProduct,
      productsByDropLive,
    }),
    [
      enabled,
      hydrated,
      logoSrc,
      overrides,
      liveProducts,
      activeId,
      openEditor,
      closeEditor,
      updateLogo,
      updateOverride,
      replaceProductVariants,
      assignProductsToDrop,
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
 * Fuera de /admin no aplica overrides locales al storefront.
 */
export function useEditedProduct(product: Product): Product {
  const { enabled, overrides, liveProducts } = useEditor();
  return useMemo(() => {
    // Preferir la versión del catálogo vivo (incluye custom + overrides)
    const live = liveProducts.find((p) => p.id === product.id);
    if (live) return live;
    if (!enabled) return product;
    return applyOverride(product, overrides[product.id]);
  }, [enabled, product, overrides, liveProducts]);
}

/**
 * Catálogo vivo completo, cargado desde PostgreSQL a través de la API.
 */
export function useLiveProducts(): Product[] {
  const { liveProducts } = useEditor();
  return liveProducts;
}
