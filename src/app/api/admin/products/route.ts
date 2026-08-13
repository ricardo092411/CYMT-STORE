import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productImages, productVariants, products } from "@/db/schema";
import type { ProductColor, ProductStatus } from "@/data/catalog";

type ProductImage = typeof productImages.$inferSelect;
type ProductVariant = typeof productVariants.$inferSelect;
type ProductVariantWithImages = typeof productVariants.$inferSelect & {
  images: ProductImage[];
};

type VariantColorStatus = "confirmed" | "requires_user_input";

interface ProductImageWriteValues {
  storageKey: string | null;
  legacyUrl: string | null;
  originalFilename: string;
  originalSourcePath: string | null;
  position: number;
  isCover: boolean;
}

interface ProductVariantWriteValues {
  colorName: string | null;
  colorHex: string | null;
  colorStatus: VariantColorStatus;
  position: number;
  isDefault: boolean;
}

interface ProductVariantCreateValues extends ProductVariantWriteValues {
  images: ProductImageWriteValues[];
}

interface ProductImageUpsertValues extends ProductImageWriteValues {
  id?: number;
}

interface ProductVariantImageOperations {
  upsert: ProductImageUpsertValues[];
  deleteIds: number[];
}

interface ProductVariantUpsertValues extends ProductVariantWriteValues {
  id?: number;
  images: ProductVariantImageOperations;
}

interface ProductVariantOperations {
  upsert: ProductVariantUpsertValues[];
  deleteIds: number[];
}

class InvalidVariantOperationsError extends Error {}

interface ProductWriteValues {
  slug?: string;
  name?: string;
  type?: string;
  price?: string;
  compareAtPrice?: string;
  description?: string;
  details?: string[];
  dropSlug?: string;
  sizes?: string[];
  colors?: ProductColor[];
  stock?: number;
  images?: string[];
  status?: ProductStatus;
  featured?: boolean;
  bestSeller?: boolean;
  tags?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProductColors(value: unknown): value is ProductColor[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        typeof item.hex === "string",
    )
  );
}

function isProductStatus(value: unknown): value is ProductStatus {
  return value === "nuevo" || value === "oferta" || value === "limitada" || value === "agotado";
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function productId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isVariantColorStatus(value: unknown): value is VariantColorStatus {
  return value === "confirmed" || value === "requires_user_input";
}

function hasUniqueIds(ids: number[]): boolean {
  return new Set(ids).size === ids.length;
}

function hasUniquePositions(values: Array<{ position: number }>): boolean {
  return new Set(values.map((value) => value.position)).size === values.length;
}

function hasAtMostOneDefault(values: Array<{ isDefault: boolean }>): boolean {
  return values.filter((value) => value.isDefault).length <= 1;
}

function hasAtMostOneCover(values: Array<{ isCover: boolean }>): boolean {
  return values.filter((value) => value.isCover).length <= 1;
}

function toProductImageWriteValues(value: unknown): ProductImageWriteValues | null {
  if (
    !isRecord(value) ||
    (value.storageKey !== undefined && !isNullableString(value.storageKey)) ||
    (value.legacyUrl !== undefined && !isNullableString(value.legacyUrl)) ||
    typeof value.originalFilename !== "string" ||
    value.originalFilename.length === 0 ||
    (value.originalSourcePath !== undefined && !isNullableString(value.originalSourcePath)) ||
    !isNonNegativeInteger(value.position) ||
    typeof value.isCover !== "boolean"
  ) {
    return null;
  }

  const storageKey = value.storageKey ?? null;
  const legacyUrl = value.legacyUrl ?? null;
  if (!storageKey && !legacyUrl) return null;

  return {
    storageKey,
    legacyUrl,
    originalFilename: value.originalFilename,
    originalSourcePath: value.originalSourcePath ?? null,
    position: value.position,
    isCover: value.isCover,
  };
}

function toProductVariantWriteValues(value: unknown): ProductVariantWriteValues | null {
  if (
    !isRecord(value) ||
    !isNullableString(value.colorName) ||
    !isNullableString(value.colorHex) ||
    !isVariantColorStatus(value.colorStatus) ||
    !isNonNegativeInteger(value.position) ||
    typeof value.isDefault !== "boolean"
  ) {
    return null;
  }

  return {
    colorName: value.colorName,
    colorHex: value.colorHex,
    colorStatus: value.colorStatus,
    position: value.position,
    isDefault: value.isDefault,
  };
}

function toProductVariantCreateValues(value: unknown): ProductVariantCreateValues | null {
  if (!isRecord(value) || !Array.isArray(value.images)) return null;

  const variant = toProductVariantWriteValues(value);
  if (!variant) return null;

  const images: ProductImageWriteValues[] = [];
  for (const image of value.images) {
    const imageValues = toProductImageWriteValues(image);
    if (!imageValues) return null;
    images.push(imageValues);
  }

  if (!hasUniquePositions(images) || !hasAtMostOneCover(images)) return null;

  return { ...variant, images };
}

function toProductVariantCreateValuesList(value: unknown): ProductVariantCreateValues[] | null {
  if (!Array.isArray(value)) return null;

  const variants: ProductVariantCreateValues[] = [];
  for (const variant of value) {
    const variantValues = toProductVariantCreateValues(variant);
    if (!variantValues) return null;
    variants.push(variantValues);
  }

  if (!hasUniquePositions(variants) || !hasAtMostOneDefault(variants)) return null;

  return variants;
}

function toProductImageUpsertValues(value: unknown): ProductImageUpsertValues | null {
  const image = toProductImageWriteValues(value);
  if (!image || !isRecord(value)) return null;

  if (value.id === undefined) return image;

  const id = productId(value.id);
  return id === null ? null : { ...image, id };
}

function toProductVariantImageOperations(value: unknown): ProductVariantImageOperations | null {
  if (!isRecord(value) || !Array.isArray(value.upsert) || !Array.isArray(value.deleteIds)) {
    return null;
  }

  const upsert: ProductImageUpsertValues[] = [];
  for (const image of value.upsert) {
    const imageValues = toProductImageUpsertValues(image);
    if (!imageValues) return null;
    upsert.push(imageValues);
  }

  const deleteIds: number[] = [];
  for (const idValue of value.deleteIds) {
    const id = productId(idValue);
    if (id === null) return null;
    deleteIds.push(id);
  }

  const upsertIds = upsert.flatMap((image) => (image.id === undefined ? [] : [image.id]));
  if (
    !hasUniqueIds(upsertIds) ||
    !hasUniqueIds(deleteIds) ||
    upsertIds.some((id) => deleteIds.includes(id)) ||
    !hasUniquePositions(upsert) ||
    !hasAtMostOneCover(upsert)
  ) {
    return null;
  }

  return { upsert, deleteIds };
}

function toProductVariantUpsertValues(value: unknown): ProductVariantUpsertValues | null {
  const variant = toProductVariantWriteValues(value);
  if (!variant || !isRecord(value)) return null;

  const images = toProductVariantImageOperations(value.images);
  if (!images) return null;

  if (value.id === undefined) return { ...variant, images };

  const id = productId(value.id);
  return id === null ? null : { ...variant, id, images };
}

function toProductVariantOperations(value: unknown): ProductVariantOperations | null {
  if (!isRecord(value) || !Array.isArray(value.upsert) || !Array.isArray(value.deleteIds)) {
    return null;
  }

  const upsert: ProductVariantUpsertValues[] = [];
  for (const variant of value.upsert) {
    const variantValues = toProductVariantUpsertValues(variant);
    if (!variantValues) return null;
    upsert.push(variantValues);
  }

  const deleteIds: number[] = [];
  for (const idValue of value.deleteIds) {
    const id = productId(idValue);
    if (id === null) return null;
    deleteIds.push(id);
  }

  const upsertIds = upsert.flatMap((variant) => (variant.id === undefined ? [] : [variant.id]));
  if (
    !hasUniqueIds(upsertIds) ||
    !hasUniqueIds(deleteIds) ||
    upsertIds.some((id) => deleteIds.includes(id)) ||
    !hasUniquePositions(upsert) ||
    !hasAtMostOneDefault(upsert)
  ) {
    return null;
  }

  return { upsert, deleteIds };
}

function temporaryPositions(count: number, occupiedPositions: number[]): number[] {
  const lowestPosition = occupiedPositions.reduce(
    (lowest, position) => Math.min(lowest, position),
    -1,
  );

  return Array.from({ length: count }, (_, index) => lowestPosition - index - 1);
}

function withNestedImages(
  variants: ProductVariant[],
  images: ProductImage[],
): ProductVariantWithImages[] {
  const imagesByVariantId = new Map<number, ProductImage[]>();
  for (const image of images) {
    const variantImages = imagesByVariantId.get(image.productVariantId) ?? [];
    variantImages.push(image);
    imagesByVariantId.set(image.productVariantId, variantImages);
  }

  return [...variants]
    .sort((left, right) => left.position - right.position)
    .map((variant) => ({
      ...variant,
      images: [...(imagesByVariantId.get(variant.id) ?? [])].sort(
        (left, right) => left.position - right.position,
      ),
    }));
}

function validateVariantOperations(
  operations: ProductVariantOperations,
  existingVariants: ProductVariant[],
  existingImages: ProductImage[],
): void {
  const variantsById = new Map(existingVariants.map((variant) => [variant.id, variant]));
  const deletingVariantIds = new Set(operations.deleteIds);
  const updatingVariantIds = new Set(
    operations.upsert.flatMap((variant) => (variant.id === undefined ? [] : [variant.id])),
  );

  for (const id of operations.deleteIds) {
    if (!variantsById.has(id)) {
      throw new InvalidVariantOperationsError("Variant does not belong to product");
    }
  }

  for (const variant of operations.upsert) {
    if (variant.id !== undefined && !variantsById.has(variant.id)) {
      throw new InvalidVariantOperationsError("Variant does not belong to product");
    }
  }

  const unchangedVariants = existingVariants.filter(
    (variant) => !deletingVariantIds.has(variant.id) && !updatingVariantIds.has(variant.id),
  );
  const finalVariants = [...unchangedVariants, ...operations.upsert];
  if (!hasUniquePositions(finalVariants) || !hasAtMostOneDefault(finalVariants)) {
    throw new InvalidVariantOperationsError("Invalid final variant positions or default variant");
  }

  const imagesByVariantId = new Map<number, ProductImage[]>();
  for (const image of existingImages) {
    const variantImages = imagesByVariantId.get(image.productVariantId) ?? [];
    variantImages.push(image);
    imagesByVariantId.set(image.productVariantId, variantImages);
  }

  for (const variant of operations.upsert) {
    if (variant.id === undefined) {
      if (
        variant.images.deleteIds.length > 0 ||
        variant.images.upsert.some((image) => image.id !== undefined)
      ) {
        throw new InvalidVariantOperationsError("New variants cannot update existing images");
      }

      continue;
    }

    const variantImages = imagesByVariantId.get(variant.id) ?? [];
    const imagesById = new Map(variantImages.map((image) => [image.id, image]));
    const deletingImageIds = new Set(variant.images.deleteIds);
    const updatingImageIds = new Set(
      variant.images.upsert.flatMap((image) => (image.id === undefined ? [] : [image.id])),
    );

    for (const id of variant.images.deleteIds) {
      if (!imagesById.has(id)) {
        throw new InvalidVariantOperationsError("Image does not belong to variant");
      }
    }

    for (const image of variant.images.upsert) {
      if (image.id !== undefined && !imagesById.has(image.id)) {
        throw new InvalidVariantOperationsError("Image does not belong to variant");
      }
    }

    const unchangedImages = variantImages.filter(
      (image) => !deletingImageIds.has(image.id) && !updatingImageIds.has(image.id),
    );
    const finalImages = [...unchangedImages, ...variant.images.upsert];
    if (!hasUniquePositions(finalImages) || !hasAtMostOneCover(finalImages)) {
      throw new InvalidVariantOperationsError("Invalid final image positions or cover image");
    }
  }
}

function toProductWriteValues(body: Record<string, unknown>): ProductWriteValues {
  const values: ProductWriteValues = {};

  if (typeof body.slug === "string") values.slug = body.slug;
  if (typeof body.name === "string") values.name = body.name;
  if (typeof body.type === "string") values.type = body.type;
  if (isNonNegativeNumber(body.price)) values.price = String(body.price);
  if (isNonNegativeNumber(body.compareAtPrice)) values.compareAtPrice = String(body.compareAtPrice);
  if (typeof body.description === "string") values.description = body.description;
  if (isStringArray(body.details)) values.details = body.details;
  if (typeof body.dropSlug === "string") values.dropSlug = body.dropSlug;
  if (isStringArray(body.sizes)) values.sizes = body.sizes;
  if (isProductColors(body.colors)) values.colors = body.colors;
  if (isNonNegativeNumber(body.stock) && Number.isInteger(body.stock)) values.stock = body.stock;
  if (isStringArray(body.images)) values.images = body.images;
  if (isProductStatus(body.status)) values.status = body.status;
  if (typeof body.featured === "boolean") values.featured = body.featured;
  if (typeof body.bestSeller === "boolean") values.bestSeller = body.bestSeller;
  if (isStringArray(body.tags)) values.tags = body.tags;

  return values;
}

export async function GET() {
  try {
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

    return NextResponse.json(
      data.map((product) => ({
        ...product,
        productVariants: variantsByProductId.get(product.id) ?? [],
      })),
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error obteniendo productos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (
      !isRecord(body) ||
      typeof body.slug !== "string" ||
      typeof body.name !== "string" ||
      typeof body.type !== "string" ||
      !isNonNegativeNumber(body.price)
    ) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const { slug, name, type, price } = body;
    const values = toProductWriteValues(body);
    const variants =
      body.productVariants === undefined
        ? undefined
        : toProductVariantCreateValuesList(body.productVariants);

    if (variants === null) {
      return NextResponse.json({ error: "Invalid product variants" }, { status: 400 });
    }

    if (variants === undefined) {
      const created = await db
        .insert(products)
        .values({
          ...values,
          slug,
          name,
          type,
          price: String(price),
          stock: values.stock ?? 0,
          status: values.status ?? "nuevo",
          featured: values.featured ?? false,
          bestSeller: values.bestSeller ?? false,
        })
        .returning();

      return NextResponse.json(created[0]);
    }

    const created = await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          ...values,
          slug,
          name,
          type,
          price: String(price),
          stock: values.stock ?? 0,
          status: values.status ?? "nuevo",
          featured: values.featured ?? false,
          bestSeller: values.bestSeller ?? false,
        })
        .returning();

      if (!product) throw new Error("Product creation did not return a product");

      const createdVariants: ProductVariant[] = [];
      const createdImages: ProductImage[] = [];

      for (const variant of variants) {
        const [createdVariant] = await tx
          .insert(productVariants)
          .values({
            productId: product.id,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            colorStatus: variant.colorStatus,
            position: variant.position,
            isDefault: variant.isDefault,
          })
          .returning();

        if (!createdVariant) throw new Error("Variant creation did not return a variant");
        createdVariants.push(createdVariant);

        for (const image of variant.images) {
          const [createdImage] = await tx
            .insert(productImages)
            .values({
              productVariantId: createdVariant.id,
              storageKey: image.storageKey,
              legacyUrl: image.legacyUrl,
              originalFilename: image.originalFilename,
              originalSourcePath: image.originalSourcePath,
              position: image.position,
              isCover: image.isCover,
            })
            .returning();

          if (!createdImage) throw new Error("Image creation did not return an image");
          createdImages.push(createdImage);
        }
      }

      return {
        ...product,
        productVariants: withNestedImages(createdVariants, createdImages),
      };
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "No fue posible crear el producto" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const id = productId(body.id);
    const values = toProductWriteValues(body);
    const variantOperations =
      body.variantOperations === undefined
        ? undefined
        : toProductVariantOperations(body.variantOperations);

    if (variantOperations === null) {
      return NextResponse.json({ error: "Invalid variant operations" }, { status: 400 });
    }

    if (id === null || (Object.keys(values).length === 0 && variantOperations === undefined)) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    if (variantOperations === undefined) {
      const updated = await db
        .update(products)
        .set(values)
        .where(eq(products.id, id))
        .returning();

      if (!updated[0]) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json(updated[0]);
    }

    const updated = await db.transaction(async (tx) => {
      const [currentProduct] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!currentProduct) return null;

      const existingVariants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      const existingVariantIds = existingVariants.map((variant) => variant.id);
      const existingImages =
        existingVariantIds.length === 0
          ? []
          : await tx
              .select()
              .from(productImages)
              .where(inArray(productImages.productVariantId, existingVariantIds));

      validateVariantOperations(variantOperations, existingVariants, existingImages);

      if (variantOperations.deleteIds.length > 0) {
        await tx
          .delete(productVariants)
          .where(inArray(productVariants.id, variantOperations.deleteIds));
      }

      const existingVariantOperations = variantOperations.upsert.filter(
        (variant): variant is ProductVariantUpsertValues & { id: number } =>
          variant.id !== undefined,
      );
      const variantTemporaryPositions = temporaryPositions(
        existingVariantOperations.length,
        existingVariants.map((variant) => variant.position),
      );

      for (const [index, variant] of existingVariantOperations.entries()) {
        await tx
          .update(productVariants)
          .set({ position: variantTemporaryPositions[index], isDefault: false })
          .where(eq(productVariants.id, variant.id));
      }

      const variantIdsForUpserts: number[] = [];
      for (const variant of variantOperations.upsert) {
        if (variant.id !== undefined) {
          variantIdsForUpserts.push(variant.id);
          continue;
        }

        const [createdVariant] = await tx
          .insert(productVariants)
          .values({
            productId: id,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            colorStatus: variant.colorStatus,
            position: variant.position,
            isDefault: variant.isDefault,
          })
          .returning();

        if (!createdVariant) throw new Error("Variant creation did not return a variant");
        variantIdsForUpserts.push(createdVariant.id);
      }

      for (const variant of existingVariantOperations) {
        await tx
          .update(productVariants)
          .set({
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            colorStatus: variant.colorStatus,
            position: variant.position,
            isDefault: variant.isDefault,
          })
          .where(eq(productVariants.id, variant.id));
      }

      const existingImagesByVariantId = new Map<number, ProductImage[]>();
      for (const image of existingImages) {
        const variantImages = existingImagesByVariantId.get(image.productVariantId) ?? [];
        variantImages.push(image);
        existingImagesByVariantId.set(image.productVariantId, variantImages);
      }

      for (const [index, variant] of variantOperations.upsert.entries()) {
        const productVariantId = variantIdsForUpserts[index];

        if (variant.images.deleteIds.length > 0) {
          await tx
            .delete(productImages)
            .where(inArray(productImages.id, variant.images.deleteIds));
        }

        const existingImageOperations = variant.images.upsert.filter(
          (image): image is ProductImageUpsertValues & { id: number } => image.id !== undefined,
        );
        const imageTemporaryPositions = temporaryPositions(
          existingImageOperations.length,
          (existingImagesByVariantId.get(productVariantId) ?? []).map((image) => image.position),
        );

        for (const [imageIndex, image] of existingImageOperations.entries()) {
          await tx
            .update(productImages)
            .set({ position: imageTemporaryPositions[imageIndex], isCover: false })
            .where(eq(productImages.id, image.id));
        }

        for (const image of variant.images.upsert) {
          if (image.id !== undefined) continue;

          const [createdImage] = await tx
            .insert(productImages)
            .values({
              productVariantId,
              storageKey: image.storageKey,
              legacyUrl: image.legacyUrl,
              originalFilename: image.originalFilename,
              originalSourcePath: image.originalSourcePath,
              position: image.position,
              isCover: image.isCover,
            })
            .returning();

          if (!createdImage) throw new Error("Image creation did not return an image");
        }

        for (const image of existingImageOperations) {
          await tx
            .update(productImages)
            .set({
              storageKey: image.storageKey,
              legacyUrl: image.legacyUrl,
              originalFilename: image.originalFilename,
              originalSourcePath: image.originalSourcePath,
              position: image.position,
              isCover: image.isCover,
            })
            .where(eq(productImages.id, image.id));
        }
      }

      const [product] =
        Object.keys(values).length === 0
          ? [currentProduct]
          : await tx
              .update(products)
              .set(values)
              .where(eq(products.id, id))
              .returning();

      if (!product) throw new Error("Product update did not return a product");

      const finalVariants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id))
        .orderBy(asc(productVariants.position));
      const finalVariantIds = finalVariants.map((variant) => variant.id);
      const finalImages =
        finalVariantIds.length === 0
          ? []
          : await tx
              .select()
              .from(productImages)
              .where(inArray(productImages.productVariantId, finalVariantIds))
              .orderBy(asc(productImages.position));

      return {
        ...product,
        productVariants: withNestedImages(finalVariants, finalImages),
      };
    });

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidVariantOperationsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unable to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const id = isRecord(body) ? productId(body.id) : null;

    if (id === null) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!deleted[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(deleted[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to delete product" },
      { status: 500 }
    );
  }
}
