import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inkProductImages, inkProducts } from "@/db/schema";
import type { InkSpecification } from "@/lib/ink-types";

const PRODUCT_IMAGES_BUCKET = "product-images";
const STORAGE_PREFIX = "cmt-ink/";

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

export type PublicInkCatalog = { products: PublicInkProduct[] };

export type PublicInkProductDetail = PublicInkProduct & {
  images: Array<{ id: number; src: string; alt: string; isPrimary: boolean }>;
};

function toPublicImageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !storagePath.startsWith(STORAGE_PREFIX)) return null;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
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
  const records = await db
    .select()
    .from(inkProducts)
    .where(eq(inkProducts.isPublished, true))
    .orderBy(asc(inkProducts.sortOrder), asc(inkProducts.name));
  const imageUrlByProductId = await getListingImageUrls(records.map((product) => product.id));
  return {
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

  const imageRows = await db
    .select()
    .from(inkProductImages)
    .where(eq(inkProductImages.productId, product.id))
    .orderBy(desc(inkProductImages.isPrimary), asc(inkProductImages.sortOrder));
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
  };
}
