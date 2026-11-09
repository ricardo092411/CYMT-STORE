import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  inkLandingSettings,
  inkProductImages,
  inkProductMedia,
  inkProducts,
} from "@/db/schema";
import type { InkSpecification } from "@/lib/ink-types";

const PRODUCT_IMAGES_BUCKET = "product-images";
const STORAGE_PREFIX = "cmt-ink/";
const LANDING_PREFIX = "cmt-ink/landing/";
const SHOWCASE_PREFIX = "cmt-ink/showcase/";

export type PublicInkProduct = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: InkSpecification[];
  priceNote: string | null;
  primaryImageUrl: string | null;
};

export type PublicInkLandingSettings = {
  heroImageUrl: string | null;
  heroAltText: string | null;
};

export type PublicInkCatalog = {
  products: PublicInkProduct[];
  landingSettings: PublicInkLandingSettings;
};

export type PublicInkShowcaseMedia = {
  id: number;
  mediaType: "image" | "video";
  src: string;
  title: string | null;
  caption: string | null;
  alt: string;
};

export type PublicInkProductDetail = PublicInkProduct & {
  images: Array<{ id: number; src: string; alt: string; isPrimary: boolean }>;
  showcaseMedia: PublicInkShowcaseMedia[];
};

function toPublicImageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !storagePath.startsWith(STORAGE_PREFIX)) return null;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
}

function toPublicMediaUrl(storagePath: string, prefix: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !storagePath.startsWith(prefix)) return null;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
}

function isUndefinedTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01";
}

export async function getPublicInkLandingSettings(): Promise<PublicInkLandingSettings> {
  try {
    const [settings] = await db
      .select()
      .from(inkLandingSettings)
      .where(eq(inkLandingSettings.id, 1))
      .limit(1);
    return {
      heroImageUrl: settings?.heroStoragePath
        ? toPublicMediaUrl(settings.heroStoragePath, LANDING_PREFIX)
        : null,
      heroAltText: settings?.heroAltText ?? null,
    };
  } catch (error) {
    if (isUndefinedTable(error)) return { heroImageUrl: null, heroAltText: null };
    throw error;
  }
}

function toSpecifications(value: unknown): InkSpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is InkSpecification =>
      typeof item === "object" && item !== null && typeof (item as InkSpecification).label === "string" && typeof (item as InkSpecification).value === "string",
  );
}

async function getListingImageUrls(productIds: number[]): Promise<Map<number, string>> {
  if (productIds.length === 0) return new Map();
  const images = await db
    .selectDistinctOn([inkProductImages.productId], {
      productId: inkProductImages.productId,
      storagePath: inkProductImages.storagePath,
    })
    .from(inkProductImages)
    .where(inArray(inkProductImages.productId, productIds))
    .orderBy(asc(inkProductImages.productId), desc(inkProductImages.isPrimary), asc(inkProductImages.sortOrder));
  return new Map(images.flatMap((image) => {
    const url = toPublicImageUrl(image.storagePath);
    return url ? [[image.productId, url] as const] : [];
  }));
}

export async function getPublicInkCatalog(): Promise<PublicInkCatalog> {
  const [records, landingSettings] = await Promise.all([
    db
      .select()
      .from(inkProducts)
      .where(eq(inkProducts.isPublished, true))
      .orderBy(asc(inkProducts.sortOrder), asc(inkProducts.name)),
    getPublicInkLandingSettings(),
  ]);
  const imageUrlByProductId = await getListingImageUrls(records.map((product) => product.id));
  return {
    landingSettings,
    products: records.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      specifications: toSpecifications(product.specifications),
      priceNote: product.priceNote,
      primaryImageUrl: imageUrlByProductId.get(product.id) ?? null,
    })),
  };
}

export async function getPublicInkProductBySlug(slug: string): Promise<PublicInkProductDetail | null> {
  const [product] = await db
    .select()
    .from(inkProducts)
    .where(and(eq(inkProducts.slug, slug), eq(inkProducts.isPublished, true)))
    .limit(1);
  if (!product) return null;

  const [imageRows, mediaRows] = await Promise.all([
    db
      .select()
      .from(inkProductImages)
      .where(eq(inkProductImages.productId, product.id))
      .orderBy(desc(inkProductImages.isPrimary), asc(inkProductImages.sortOrder)),
    db
      .select()
      .from(inkProductMedia)
      .where(eq(inkProductMedia.productId, product.id))
      .orderBy(asc(inkProductMedia.sortOrder))
      .catch((error: unknown) => {
        if (isUndefinedTable(error)) return [];
        throw error;
      }),
  ]);
  const images = imageRows.flatMap((image) => {
    const src = toPublicImageUrl(image.storagePath);
    return src ? [{ id: image.id, src, alt: image.altText ?? product.name, isPrimary: image.isPrimary }] : [];
  });
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    specifications: toSpecifications(product.specifications),
    priceNote: product.priceNote,
    primaryImageUrl: images[0]?.src ?? null,
    images,
    showcaseMedia: mediaRows.flatMap((media) => {
      const src = toPublicMediaUrl(media.storagePath, SHOWCASE_PREFIX);
      if (!src) return [];
      return [{
        id: media.id,
        mediaType: media.mediaType === "video" ? "video" : "image",
        src,
        title: media.title,
        caption: media.caption,
        alt: media.altText ?? media.title ?? product.name,
      }];
    }),
  };
}
