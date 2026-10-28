import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  confectionCategories,
  confectionProductImages,
  confectionProducts,
} from "@/db/schema";
import type { ConfectionSpecification } from "@/lib/confection-types";

const PRODUCT_IMAGES_BUCKET = "product-images";

export type PublicConfectionCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
  previewImageUrl: string | null;
};

export type PublicConfectionProduct = {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: ConfectionSpecification[];
  priceNote: string | null;
  primaryImageUrl: string | null;
};

export type PublicConfectionCatalog = {
  categories: PublicConfectionCategory[];
  products: PublicConfectionProduct[];
};

export type PublicConfectionProductDetail = PublicConfectionProduct & {
  images: Array<{ id: number; src: string; alt: string; isPrimary: boolean }>;
};

function toPublicImageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !storagePath.startsWith("confection/")) return null;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
}

function toSpecifications(value: unknown): ConfectionSpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ConfectionSpecification =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ConfectionSpecification).label === "string" &&
      typeof (item as ConfectionSpecification).value === "string",
  );
}

async function getListingImageUrls(productIds: number[]): Promise<Map<number, string>> {
  if (productIds.length === 0) return new Map();
  const images = await db
    .selectDistinctOn([confectionProductImages.productId], {
      productId: confectionProductImages.productId,
      storagePath: confectionProductImages.storagePath,
    })
    .from(confectionProductImages)
    .where(inArray(confectionProductImages.productId, productIds))
    .orderBy(
      asc(confectionProductImages.productId),
      desc(confectionProductImages.isPrimary),
      asc(confectionProductImages.sortOrder),
    );
  return new Map(
    images.flatMap((image) => {
      const url = toPublicImageUrl(image.storagePath);
      return url ? [[image.productId, url] as const] : [];
    }),
  );
}

/** Public catalog query: both the parent category and the product must be published. */
export async function getPublicConfectionCatalog(): Promise<PublicConfectionCatalog> {
  const [categoryRows, productRows] = await Promise.all([
    db
      .select()
      .from(confectionCategories)
      .where(eq(confectionCategories.isPublished, true))
      .orderBy(asc(confectionCategories.sortOrder), asc(confectionCategories.name)),
    db
      .select({ product: confectionProducts, category: confectionCategories })
      .from(confectionProducts)
      .innerJoin(confectionCategories, eq(confectionProducts.categoryId, confectionCategories.id))
      .where(
        and(
          eq(confectionProducts.isPublished, true),
          eq(confectionCategories.isPublished, true),
        ),
      )
      .orderBy(asc(confectionProducts.sortOrder), asc(confectionProducts.name)),
  ]);

  const imageUrlByProductId = await getListingImageUrls(productRows.map(({ product }) => product.id));
  const products = productRows.map(({ product, category }) => ({
    id: product.id,
    categoryId: product.categoryId,
    categoryName: category.name,
    categorySlug: category.slug,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    specifications: toSpecifications(product.specifications),
    priceNote: product.priceNote,
    primaryImageUrl: imageUrlByProductId.get(product.id) ?? null,
  }));

  const productsByCategory = new Map<number, PublicConfectionProduct[]>();
  for (const product of products) {
    const categoryProducts = productsByCategory.get(product.categoryId) ?? [];
    categoryProducts.push(product);
    productsByCategory.set(product.categoryId, categoryProducts);
  }

  const categories = categoryRows.map((category) => {
    const categoryProducts = productsByCategory.get(category.id) ?? [];
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: categoryProducts.length,
      previewImageUrl: categoryProducts.find((product) => product.primaryImageUrl)?.primaryImageUrl ?? null,
    };
  });

  return { categories, products };
}

/** A hidden category also hides all products and their individual public pages. */
export async function getPublicConfectionProductBySlug(
  slug: string,
): Promise<PublicConfectionProductDetail | null> {
  const [record] = await db
    .select({ product: confectionProducts, category: confectionCategories })
    .from(confectionProducts)
    .innerJoin(confectionCategories, eq(confectionProducts.categoryId, confectionCategories.id))
    .where(
      and(
        eq(confectionProducts.slug, slug),
        eq(confectionProducts.isPublished, true),
        eq(confectionCategories.isPublished, true),
      ),
    )
    .limit(1);
  if (!record) return null;

  const imageRows = await db
    .select()
    .from(confectionProductImages)
    .where(eq(confectionProductImages.productId, record.product.id))
    .orderBy(desc(confectionProductImages.isPrimary), asc(confectionProductImages.sortOrder));
  const images = imageRows.flatMap((image) => {
    const src = toPublicImageUrl(image.storagePath);
    return src
      ? [{ id: image.id, src, alt: image.altText ?? record.product.name, isPrimary: image.isPrimary }]
      : [];
  });

  return {
    id: record.product.id,
    categoryId: record.product.categoryId,
    categoryName: record.category.name,
    categorySlug: record.category.slug,
    name: record.product.name,
    slug: record.product.slug,
    shortDescription: record.product.shortDescription,
    description: record.product.description,
    specifications: toSpecifications(record.product.specifications),
    priceNote: record.product.priceNote,
    primaryImageUrl: images[0]?.src ?? null,
    images,
  };
}
