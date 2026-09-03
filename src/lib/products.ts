import "server-only";

import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drops, productImages, productVariants, products } from "@/db/schema";

type ProductImage = typeof productImages.$inferSelect;

export type ProductWithVariants = typeof products.$inferSelect & {
  productVariants: ProductVariantWithImages[];
};

type ProductVariantWithImages = typeof productVariants.$inferSelect & {
  images: ProductImage[];
};

const PRODUCT_IMAGES_BUCKET = "product-images";

export async function getProducts() {
  return await db.select().from(products);
}

/** Complete relational catalog read model for administrative use. */
export async function getProductsWithVariants(): Promise<
  ProductWithVariants[]
> {
  const [data, variants, images] = await Promise.all([
    db.select().from(products),
    db.select().from(productVariants).orderBy(asc(productVariants.position)),
    db.select().from(productImages).orderBy(asc(productImages.position)),
  ]);

  return attachProductVariants(data, variants, images);
}

export async function getProductWithVariantsBySlug(
  slug: string,
): Promise<ProductWithVariants | null> {
  const productRows = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  const product = productRows[0];

  if (!product) return null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id))
    .orderBy(asc(productVariants.position));
  const variantIds = variants.map((variant) => variant.id);
  const images = variantIds.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productVariantId, variantIds))
        .orderBy(asc(productImages.position))
    : [];

  return attachProductVariants([product], variants, images)[0] ?? null;
}

type HiddenDropReferences = {
  ids: Set<number>;
  slugs: Set<string>;
};

async function getHiddenDropReferences(): Promise<HiddenDropReferences> {
  const hiddenDrops = await db
    .select({ id: drops.id, slug: drops.slug })
    .from(drops)
    .where(eq(drops.live, false));

  return {
    ids: new Set(hiddenDrops.map((drop) => drop.id)),
    slugs: new Set(hiddenDrops.map((drop) => drop.slug)),
  };
}

function belongsToHiddenDrop(
  product: typeof products.$inferSelect,
  hiddenDrops: HiddenDropReferences,
): boolean {
  return (
    (product.dropId !== null && hiddenDrops.ids.has(product.dropId)) ||
    (product.dropSlug !== null && hiddenDrops.slugs.has(product.dropSlug))
  );
}

/**
 * Public catalog read model. A product is hidden when either its relational
 * Drop id or legacy Drop slug points at an unpublished Drop. Both references
 * are checked so historical rows with only one populated remain private.
 */
export async function getPublicProductsWithVariants(): Promise<ProductWithVariants[]> {
  const [allProducts, hiddenDrops] = await Promise.all([
    getProductsWithVariants(),
    getHiddenDropReferences(),
  ]);

  return allProducts.filter((product) => !belongsToHiddenDrop(product, hiddenDrops));
}

/** Public single-product read model with the same unpublished-Drop policy. */
export async function getPublicProductWithVariantsBySlug(
  slug: string,
): Promise<ProductWithVariants | null> {
  const [product, hiddenDrops] = await Promise.all([
    getProductWithVariantsBySlug(slug),
    getHiddenDropReferences(),
  ]);

  return product && !belongsToHiddenDrop(product, hiddenDrops) ? product : null;
}

/** Returns the persisted cover image, preferring relational media over legacy images. */
export function getPrimaryProductImageUrl(product: ProductWithVariants): string | null {
  const variantsWithImages = product.productVariants.filter((variant) => variant.images.length > 0);
  const defaultVariant =
    variantsWithImages.find((variant) => variant.isDefault) ?? variantsWithImages[0];
  const image =
    defaultVariant?.images.find((variantImage) => variantImage.isCover) ??
    defaultVariant?.images[0];

  if (image) {
    const storageKey = image.storageKey?.trim();
    if (storageKey) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
      if (supabaseUrl) {
        const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
        return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedKey}`;
      }
    }

    const legacyUrl = image.legacyUrl?.trim();
    if (legacyUrl) return legacyUrl;
  }

  return product.images?.find((imageUrl) => imageUrl.trim())?.trim() ?? null;
}

function attachProductVariants(
  data: typeof products.$inferSelect[],
  variants: typeof productVariants.$inferSelect[],
  images: ProductImage[],
): ProductWithVariants[] {
  const imagesByVariantId = new Map<number, ProductImage[]>();
  for (const image of images) {
    const variantImages = imagesByVariantId.get(image.productVariantId) ?? [];
    variantImages.push(image);
    imagesByVariantId.set(image.productVariantId, variantImages);
  }

  const variantsByProductId = new Map<number, ProductVariantWithImages[]>();
  for (const variant of variants) {
    const productVariantsForProduct = variantsByProductId.get(variant.productId) ?? [];
    productVariantsForProduct.push({
      ...variant,
      images: imagesByVariantId.get(variant.id) ?? [],
    });
    variantsByProductId.set(variant.productId, productVariantsForProduct);
  }

  return data.map((product) => ({
    ...product,
    productVariants: variantsByProductId.get(product.id) ?? [],
  }));
}

export async function getProductBySlug(slug: string) {
  const result = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));

  return result[0] ?? null;
}
