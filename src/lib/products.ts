import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, productVariants, products } from "@/db/schema";

type ProductImage = typeof productImages.$inferSelect;

type ProductVariantWithImages = typeof productVariants.$inferSelect & {
  images: ProductImage[];
};

export async function getProducts() {
  return await db.select().from(products);
}

/**
 * Public catalog read model used by the storefront. Administrative writes and
 * the corresponding protected endpoint remain separate from this read path.
 */
export async function getProductsWithVariants(): Promise<
  Array<typeof products.$inferSelect & { productVariants: ProductVariantWithImages[] }>
> {
  const [data, variants, images] = await Promise.all([
    db.select().from(products),
    db.select().from(productVariants).orderBy(asc(productVariants.position)),
    db.select().from(productImages).orderBy(asc(productImages.position)),
  ]);

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
