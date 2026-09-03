import type {
  Product,
  ProductColor,
  ProductStatus,
  ProductVariant,
  ProductVariantImage,
} from "@/data/catalog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

function toDateString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function toProductVariantImage(value: unknown): ProductVariantImage | null {
  if (!isRecord(value)) return null;

  const id = toInteger(value.id);
  const productVariantId = toInteger(value.productVariantId);
  const position = toInteger(value.position);
  const createdAt = toDateString(value.createdAt);

  if (
    id === null ||
    productVariantId === null ||
    position === null ||
    typeof value.originalFilename !== "string" ||
    typeof value.isCover !== "boolean" ||
    createdAt === null
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
    createdAt,
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
    const createdAt = toDateString(item.createdAt);

    if (
      id === null ||
      productId === null ||
      position === null ||
      typeof item.colorStatus !== "string" ||
      typeof item.isDefault !== "boolean" ||
      createdAt === null
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
      createdAt,
      images: toProductVariantImages(item.images),
    }];
  });
}

function isProductStatus(value: unknown): value is ProductStatus {
  return value === "nuevo" || value === "oferta" || value === "limitada" || value === "agotado";
}

/** Converts a database/API product row into the shared storefront Product model. */
export function normalizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;

  const product = value;
  const price = toNumber(product.price);
  const createdAt = toDateString(product.createdAt);

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
    createdAt: createdAt ?? new Date(0).toISOString(),
  };
}

export function normalizeProductResponse(value: unknown, fallback?: Product): Product | null {
  const product = normalizeProduct(value);
  if (!product) return null;

  return isRecord(value) && Array.isArray(value.productVariants)
    ? product
    : { ...product, productVariants: fallback?.productVariants ?? product.productVariants };
}
