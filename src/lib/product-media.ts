import type { Product, ProductColor, ProductVariant, ProductVariantImage } from "@/data/catalog";
import { getProductImagePublicUrl } from "./storage";

export type StorefrontProductImage = {
  src: string;
  source: "relational" | "legacy";
  variantId: number | null;
  colorName: string | null;
  colorHex: string | null;
  position: number;
  isCover: boolean;
};

export type StorefrontProductColor = {
  name: string;
  hex: string | null;
};

export type StorefrontProductMedia = {
  usesRelationalMedia: boolean;
  images: StorefrontProductImage[];
  primaryImage: StorefrontProductImage | null;
  colors: StorefrontProductColor[];
  filterColors: string[];
  defaultVariant: ProductVariant | null;
  primaryColor: string | null;
};

type VariantWithImages = {
  variant: ProductVariant;
  images: StorefrontProductImage[];
};

function trimmedValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function orderedByPosition<T extends { position: number }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => left.item.position - right.item.position || left.index - right.index)
    .map(({ item }) => item);
}

function toRelationalImage(
  variant: ProductVariant,
  image: ProductVariantImage,
): StorefrontProductImage | null {
  const storageKey = trimmedValue(image.storageKey);
  const legacyUrl = trimmedValue(image.legacyUrl);
  const src = storageKey ? getProductImagePublicUrl(storageKey) : legacyUrl;

  if (!src) return null;

  return {
    src,
    source: "relational",
    variantId: variant.id,
    colorName: trimmedValue(variant.colorName),
    colorHex: trimmedValue(variant.colorHex),
    position: image.position,
    isCover: image.isCover,
  };
}

function isStorefrontProductImage(
  image: StorefrontProductImage | null,
): image is StorefrontProductImage {
  return image !== null;
}

function toLegacyColors(colors: ProductColor[]): StorefrontProductColor[] {
  return colors.flatMap((color) => {
    const name = trimmedValue(color.name);
    return name ? [{ name, hex: trimmedValue(color.hex) }] : [];
  });
}

function toLegacyFilterColors(product: Product, colors: StorefrontProductColor[]): string[] {
  const variants = (product.variants ?? []).flatMap((variant) => {
    const name = trimmedValue(variant);
    return name ? [name] : [];
  });

  return variants.length > 0 ? variants : colors.map((color) => color.name);
}

function toLegacyMedia(product: Product): StorefrontProductMedia {
  const colors = toLegacyColors(product.colors);
  const primaryImageSource = product.images[0];
  const primaryImage = primaryImageSource
    ? {
        src: primaryImageSource,
        source: "legacy" as const,
        variantId: null,
        colorName: null,
        colorHex: null,
        position: 0,
        isCover: true,
      }
    : null;

  return {
    usesRelationalMedia: false,
    images: product.images.flatMap((src, position) =>
      src
        ? [{
            src,
            source: "legacy" as const,
            variantId: null,
            colorName: null,
            colorHex: null,
            position,
            isCover: position === 0,
          }]
        : [],
    ),
    primaryImage,
    colors,
    filterColors: toLegacyFilterColors(product, colors),
    defaultVariant: null,
    primaryColor: trimmedValue(product.variants?.[0]) ?? colors[0]?.name ?? null,
  };
}

/**
 * Produces the relational-first media representation used by the storefront.
 * Product legacy image/color fields remain read-only compatibility fallbacks.
 */
export function getStorefrontProductMedia(product: Product): StorefrontProductMedia {
  const variantsWithImages: VariantWithImages[] = orderedByPosition(product.productVariants ?? [])
    .map((variant) => ({
      variant,
      images: orderedByPosition(variant.images)
        .map((image) => toRelationalImage(variant, image))
        .filter(isStorefrontProductImage),
    }))
    .filter((entry) => entry.images.length > 0);

  if (variantsWithImages.length === 0) return toLegacyMedia(product);

  const defaultVariant =
    variantsWithImages.find((entry) => entry.variant.isDefault) ?? variantsWithImages[0];
  const primaryImage =
    defaultVariant.images.find((image) => image.isCover) ?? defaultVariant.images[0];
  const seenSources = new Set<string>();
  const images = variantsWithImages.flatMap((entry) =>
    entry.images.filter((image) => {
      if (seenSources.has(image.src)) return false;
      seenSources.add(image.src);
      return true;
    }),
  );
  const colors = orderedByPosition(product.productVariants ?? []).flatMap((variant) => {
    const name = trimmedValue(variant.colorName);
    return name ? [{ name, hex: trimmedValue(variant.colorHex) }] : [];
  });

  return {
    usesRelationalMedia: true,
    images,
    primaryImage,
    colors,
    filterColors: colors.map((color) => color.name),
    defaultVariant: defaultVariant.variant,
    primaryColor: trimmedValue(defaultVariant.variant.colorName),
  };
}

export function usesDirectProductImageElement(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}
