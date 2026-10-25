import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  machineryCategories,
  machineryProductImages,
  machineryProducts,
} from "@/db/schema";
import type { MachinerySpecification } from "@/lib/machinery-types";

const PRODUCT_IMAGES_BUCKET = "product-images";

export type PublicMachineryCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
  previewImageUrl: string | null;
};

export type PublicMachineryProduct = {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: MachinerySpecification[];
  priceNote: string | null;
  primaryImageUrl: string | null;
};

export type PublicMachineryCatalog = {
  categories: PublicMachineryCategory[];
  products: PublicMachineryProduct[];
};

export type PublicMachineryProductDetail = PublicMachineryProduct & {
  images: Array<{
    id: number;
    src: string;
    alt: string;
    isPrimary: boolean;
  }>;
};

function toPublicImageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !storagePath.startsWith("machinery/")) return null;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
}

function toSpecifications(value: unknown): MachinerySpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MachinerySpecification =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as MachinerySpecification).label === "string" &&
      typeof (item as MachinerySpecification).value === "string",
  );
}

async function getListingImageUrls(productIds: number[]): Promise<Map<number, string>> {
  if (productIds.length === 0) return new Map();

  const images = await db
    .selectDistinctOn([machineryProductImages.productId], {
      productId: machineryProductImages.productId,
      storagePath: machineryProductImages.storagePath,
    })
    .from(machineryProductImages)
    .where(inArray(machineryProductImages.productId, productIds))
    .orderBy(
      asc(machineryProductImages.productId),
      desc(machineryProductImages.isPrimary),
      asc(machineryProductImages.sortOrder),
    );

  return new Map(
    images.flatMap((image) => {
      const url = toPublicImageUrl(image.storagePath);
      return url ? [[image.productId, url] as const] : [];
    }),
  );
}

/** Public catalog query: both category and product must be published. */
export async function getPublicMachineryCatalog(): Promise<PublicMachineryCatalog> {
  const [categoryRows, productRows] = await Promise.all([
    db
      .select()
      .from(machineryCategories)
      .where(eq(machineryCategories.isPublished, true))
      .orderBy(asc(machineryCategories.sortOrder), asc(machineryCategories.name)),
    db
      .select({ product: machineryProducts, category: machineryCategories })
      .from(machineryProducts)
      .innerJoin(machineryCategories, eq(machineryProducts.categoryId, machineryCategories.id))
      .where(
        and(
          eq(machineryProducts.isPublished, true),
          eq(machineryCategories.isPublished, true),
        ),
      )
      .orderBy(asc(machineryProducts.sortOrder), asc(machineryProducts.name)),
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

  const productsByCategory = new Map<number, PublicMachineryProduct[]>();
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

/** Public product query: a hidden category also hides its published products. */
export async function getPublicMachineryProductBySlug(
  slug: string,
): Promise<PublicMachineryProductDetail | null> {
  const [record] = await db
    .select({ product: machineryProducts, category: machineryCategories })
    .from(machineryProducts)
    .innerJoin(machineryCategories, eq(machineryProducts.categoryId, machineryCategories.id))
    .where(
      and(
        eq(machineryProducts.slug, slug),
        eq(machineryProducts.isPublished, true),
        eq(machineryCategories.isPublished, true),
      ),
    )
    .limit(1);

  if (!record) return null;

  const imageRows = await db
    .select()
    .from(machineryProductImages)
    .where(eq(machineryProductImages.productId, record.product.id))
    .orderBy(desc(machineryProductImages.isPrimary), asc(machineryProductImages.sortOrder));

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
