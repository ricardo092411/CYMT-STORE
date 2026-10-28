import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { digitalCategories, digitalProductImages, digitalProducts } from "@/db/schema";
import type { DigitalSpecification } from "@/lib/downloads-types";

const PREVIEW_BUCKET = "product-images";

export type PublicDigitalCategory = { id: number; name: string; slug: string; description: string | null; productCount: number; previewImageUrl: string | null };
export type PublicDigitalProduct = { id: number; categoryId: number; categoryName: string; categorySlug: string; name: string; slug: string; shortDescription: string; description: string | null; specifications: DigitalSpecification[]; priceCents: number; currency: "USD"; primaryImageUrl: string | null };
export type PublicDigitalCatalog = { categories: PublicDigitalCategory[]; products: PublicDigitalProduct[] };
export type PublicDigitalProductDetail = PublicDigitalProduct & { images: Array<{ id: number; src: string; alt: string; isPrimary: boolean }> };

function previewUrl(path: string): string | null { const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""); if (!origin || !path.startsWith("downloads/")) return null; return `${origin}/storage/v1/object/public/${PREVIEW_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`; }
function specifications(value: unknown): DigitalSpecification[] { return Array.isArray(value) ? value.filter((item): item is DigitalSpecification => typeof item === "object" && item !== null && typeof (item as DigitalSpecification).label === "string" && typeof (item as DigitalSpecification).value === "string") : []; }
function mapProduct(product: typeof digitalProducts.$inferSelect, category: typeof digitalCategories.$inferSelect, image: string | null): PublicDigitalProduct { return { id: product.id, categoryId: product.categoryId, categoryName: category.name, categorySlug: category.slug, name: product.name, slug: product.slug, shortDescription: product.shortDescription, description: product.description, specifications: specifications(product.specifications), priceCents: product.priceCents, currency: "USD", primaryImageUrl: image }; }
async function listingImages(ids: number[]) { if (!ids.length) return new Map<number, string>(); const rows = await db.selectDistinctOn([digitalProductImages.productId], { productId: digitalProductImages.productId, storagePath: digitalProductImages.storagePath }).from(digitalProductImages).where(inArray(digitalProductImages.productId, ids)).orderBy(asc(digitalProductImages.productId), desc(digitalProductImages.isPrimary), asc(digitalProductImages.sortOrder)); return new Map(rows.flatMap((row) => { const url = previewUrl(row.storagePath); return url ? [[row.productId, url] as const] : []; })); }

/** Public catalog never joins or selects digital_product_files. */
export async function getPublicDigitalCatalog(): Promise<PublicDigitalCatalog> {
  const [categoryRows, productRows] = await Promise.all([
    db.select().from(digitalCategories).where(eq(digitalCategories.isPublished, true)).orderBy(asc(digitalCategories.sortOrder), asc(digitalCategories.name)),
    db.select({ product: digitalProducts, category: digitalCategories }).from(digitalProducts).innerJoin(digitalCategories, eq(digitalProducts.categoryId, digitalCategories.id)).where(and(eq(digitalProducts.isPublished, true), eq(digitalCategories.isPublished, true))).orderBy(asc(digitalProducts.sortOrder), asc(digitalProducts.name)),
  ]);
  const imageById = await listingImages(productRows.map(({ product }) => product.id));
  const products = productRows.map(({ product, category }) => mapProduct(product, category, imageById.get(product.id) ?? null));
  const byCategory = new Map<number, PublicDigitalProduct[]>(); for (const product of products) { const current = byCategory.get(product.categoryId) ?? []; current.push(product); byCategory.set(product.categoryId, current); }
  return { categories: categoryRows.map((category) => { const productsForCategory = byCategory.get(category.id) ?? []; return { id: category.id, name: category.name, slug: category.slug, description: category.description, productCount: productsForCategory.length, previewImageUrl: productsForCategory.find((product) => product.primaryImageUrl)?.primaryImageUrl ?? null }; }), products };
}

/** A draft product or draft category returns null, which the route renders as notFound(). */
export async function getPublicDigitalProductBySlug(slug: string): Promise<PublicDigitalProductDetail | null> {
  const [record] = await db.select({ product: digitalProducts, category: digitalCategories }).from(digitalProducts).innerJoin(digitalCategories, eq(digitalProducts.categoryId, digitalCategories.id)).where(and(eq(digitalProducts.slug, slug), eq(digitalProducts.isPublished, true), eq(digitalCategories.isPublished, true))).limit(1);
  if (!record) return null;
  const imageRows = await db.select().from(digitalProductImages).where(eq(digitalProductImages.productId, record.product.id)).orderBy(desc(digitalProductImages.isPrimary), asc(digitalProductImages.sortOrder));
  const images = imageRows.flatMap((image) => { const src = previewUrl(image.storagePath); return src ? [{ id: image.id, src, alt: image.altText ?? record.product.name, isPrimary: image.isPrimary }] : []; });
  return { ...mapProduct(record.product, record.category, images[0]?.src ?? null), images };
}
