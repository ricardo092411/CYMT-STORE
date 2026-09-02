import { isAdmin } from "@/lib/auth/admin";
import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drops, productImages, productVariants, products } from "@/db/schema";
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
  clientKey?: string;
  images: ProductVariantImageOperations;
}

interface ProductImageMoveValues {
  imageId: number;
  fromVariantId: number;
  toVariantId?: number;
  toVariantClientKey?: string;
  position: number;
  isCover: boolean;
}

interface ProductVariantOperations {
  upsert: ProductVariantUpsertValues[];
  deleteIds: number[];
  moveImages: ProductImageMoveValues[];
}

class InvalidVariantOperationsError extends Error {}
class InvalidBulkDropAssignmentError extends Error {}

interface BulkDropAssignment {
  productIds: number[];
  dropSlug: string | null;
}

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

function isVariantClientKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function hasUniqueIds(ids: number[]): boolean {
  return new Set(ids).size === ids.length;
}

function toBulkDropAssignment(value: unknown): BulkDropAssignment | null {
  if (!isRecord(value) || !Array.isArray(value.productIds)) return null;

  const parsedProductIds = value.productIds.map(productId);
  if (
    parsedProductIds.length === 0 ||
    parsedProductIds.some((id) => id === null)
  ) {
    return null;
  }

  const productIds = parsedProductIds.filter((id): id is number => id !== null);
  if (!hasUniqueIds(productIds)) return null;

  if (value.dropSlug !== null && typeof value.dropSlug !== "string") return null;
  return { productIds, dropSlug: value.dropSlug };
}

async function applyBulkDropAssignment(assignment: BulkDropAssignment) {
  return db.transaction(async (tx) => {
    if (assignment.dropSlug !== null) {
      const matchingDrop = await tx
        .select({ slug: drops.slug })
        .from(drops)
        .where(eq(drops.slug, assignment.dropSlug))
        .limit(1);

      if (!matchingDrop[0]) {
        throw new InvalidBulkDropAssignmentError("Drop does not exist");
      }
    }

    const existing = await tx
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, assignment.productIds));

    if (existing.length !== assignment.productIds.length) {
      throw new InvalidBulkDropAssignmentError("One or more products do not exist");
    }

    return tx
      .update(products)
      .set({ dropSlug: assignment.dropSlug })
      .where(inArray(products.id, assignment.productIds))
      .returning({ id: products.id, dropSlug: products.dropSlug });
  });
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

  const clientKey = value.clientKey === undefined ? undefined : value.clientKey;
  if (clientKey !== undefined && !isVariantClientKey(clientKey)) return null;

  if (value.id === undefined) return { ...variant, ...(clientKey === undefined ? {} : { clientKey }), images };

  const id = productId(value.id);
  return id === null || clientKey !== undefined ? null : { ...variant, id, images };
}

function toProductImageMoveValues(value: unknown): ProductImageMoveValues | null {
  if (!isRecord(value)) return null;

  const imageId = productId(value.imageId);
  const fromVariantId = productId(value.fromVariantId);
  const toVariantId = value.toVariantId === undefined ? undefined : productId(value.toVariantId);
  const toVariantClientKey =
    value.toVariantClientKey === undefined ? undefined : value.toVariantClientKey;

  if (
    imageId === null ||
    fromVariantId === null ||
    (toVariantId === null && value.toVariantId !== undefined) ||
    (toVariantClientKey !== undefined && !isVariantClientKey(toVariantClientKey)) ||
    (toVariantId === undefined && toVariantClientKey === undefined) ||
    (toVariantId !== undefined && toVariantClientKey !== undefined) ||
    !isNonNegativeInteger(value.position) ||
    typeof value.isCover !== "boolean"
  ) {
    return null;
  }

  if (toVariantId !== undefined && toVariantId !== null) {
    return { imageId, fromVariantId, toVariantId, position: value.position, isCover: value.isCover };
  }
  if (isVariantClientKey(toVariantClientKey)) {
    return {
      imageId,
      fromVariantId,
      toVariantClientKey,
      position: value.position,
      isCover: value.isCover,
    };
  }

  return null;
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

  const moveImages: ProductImageMoveValues[] = [];
  const rawMoveImages = value.moveImages === undefined ? [] : value.moveImages;
  if (!Array.isArray(rawMoveImages)) return null;

  for (const move of rawMoveImages) {
    const moveValues = toProductImageMoveValues(move);
    if (!moveValues) return null;
    moveImages.push(moveValues);
  }

  const upsertIds = upsert.flatMap((variant) => (variant.id === undefined ? [] : [variant.id]));
  const clientKeys = upsert.flatMap((variant) =>
    variant.clientKey === undefined ? [] : [variant.clientKey],
  );
  if (
    !hasUniqueIds(upsertIds) ||
    !hasUniqueIds(deleteIds) ||
    upsertIds.some((id) => deleteIds.includes(id)) ||
    new Set(clientKeys).size !== clientKeys.length ||
    !hasUniqueIds(moveImages.map((move) => move.imageId)) ||
    !hasUniquePositions(upsert) ||
    !hasAtMostOneDefault(upsert)
  ) {
    return null;
  }

  return { upsert, deleteIds, moveImages };
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

interface ImagePlacement {
  id?: number;
  position: number;
  isCover: boolean;
}

function hasConsecutiveImagePositions(images: ImagePlacement[]): boolean {
  return [...images]
    .sort((left, right) => left.position - right.position)
    .every((image, index) => image.position === index);
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
  const existingImagesById = new Map(existingImages.map((image) => [image.id, image]));
  const imagesByVariantId = new Map<number, ProductImage[]>();

  for (const image of existingImages) {
    const variantImages = imagesByVariantId.get(image.productVariantId) ?? [];
    variantImages.push(image);
    imagesByVariantId.set(image.productVariantId, variantImages);
  }

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

  const variantReferenceByUpsertIndex = operations.upsert.map(
    (variant, index) => variant.id ?? variant.clientKey ?? `new-${index}`,
  );
  const newVariantReferencesByClientKey = new Map<string, string>();
  for (const [index, variant] of operations.upsert.entries()) {
    if (variant.id === undefined && variant.clientKey !== undefined) {
      newVariantReferencesByClientKey.set(variant.clientKey, variantReferenceByUpsertIndex[index] as string);
    }
  }

  const imageUpsertIds = new Set<number>();
  const imageDeleteIds = new Set<number>();
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
    for (const id of variant.images.deleteIds) {
      if (!imagesById.has(id) || imageDeleteIds.has(id)) {
        throw new InvalidVariantOperationsError("Image does not belong to variant");
      }
      imageDeleteIds.add(id);
    }

    for (const image of variant.images.upsert) {
      if (image.id !== undefined) {
        if (!imagesById.has(image.id) || imageUpsertIds.has(image.id)) {
          throw new InvalidVariantOperationsError("Image does not belong to variant");
        }
        imageUpsertIds.add(image.id);
      }
    }
  }

  if ([...imageUpsertIds].some((id) => imageDeleteIds.has(id))) {
    throw new InvalidVariantOperationsError("Image update conflicts with deletion");
  }

  const movedImageIds = new Set<number>();
  const moveDestinationByImageId = new Map<number, number | string>();
  for (const move of operations.moveImages) {
    const fromVariant = variantsById.get(move.fromVariantId);
    if (!fromVariant) {
      throw new InvalidVariantOperationsError("Variant does not belong to product");
    }

    const destination =
      move.toVariantId === undefined
        ? move.toVariantClientKey === undefined
          ? undefined
          : newVariantReferencesByClientKey.get(move.toVariantClientKey)
        : variantsById.has(move.toVariantId) && !deletingVariantIds.has(move.toVariantId)
          ? move.toVariantId
          : undefined;
    if (destination === undefined) {
      throw new InvalidVariantOperationsError("Move destination does not belong to product");
    }

    const image = existingImagesById.get(move.imageId);
    if (!image || image.productVariantId !== fromVariant.id) {
      throw new InvalidVariantOperationsError("Image does not belong to variant");
    }
    if (destination === move.fromVariantId) {
      throw new InvalidVariantOperationsError("Image move must change variant");
    }
    if (
      movedImageIds.has(move.imageId) ||
      imageUpsertIds.has(move.imageId) ||
      imageDeleteIds.has(move.imageId)
    ) {
      throw new InvalidVariantOperationsError("Image move conflicts with another image operation");
    }

    movedImageIds.add(move.imageId);
    moveDestinationByImageId.set(move.imageId, destination);
  }

  const finalImagesByVariantReference = new Map<number | string, ImagePlacement[]>();
  for (const variant of existingVariants) {
    finalImagesByVariantReference.set(
      variant.id,
      (imagesByVariantId.get(variant.id) ?? []).map((image) => ({
        id: image.id,
        position: image.position,
        isCover: image.isCover,
      })),
    );
  }
  for (const reference of variantReferenceByUpsertIndex) {
    if (!finalImagesByVariantReference.has(reference)) {
      finalImagesByVariantReference.set(reference, []);
    }
  }

  for (const [index, variant] of operations.upsert.entries()) {
    const reference = variantReferenceByUpsertIndex[index];
    const finalImages = finalImagesByVariantReference.get(reference);
    if (!finalImages) throw new InvalidVariantOperationsError("Variant image state is missing");

    for (const imageId of variant.images.deleteIds) {
      const imageIndex = finalImages.findIndex((image) => image.id === imageId);
      if (imageIndex === -1) throw new InvalidVariantOperationsError("Image does not belong to variant");
      finalImages.splice(imageIndex, 1);
    }

    for (const image of variant.images.upsert) {
      if (image.id === undefined) {
        finalImages.push({ position: image.position, isCover: image.isCover });
        continue;
      }

      const imageIndex = finalImages.findIndex((current) => current.id === image.id);
      if (imageIndex === -1) throw new InvalidVariantOperationsError("Image does not belong to variant");
      finalImages[imageIndex] = {
        id: image.id,
        position: image.position,
        isCover: image.isCover,
      };
    }
  }

  const movedVariantReferences = new Set<number | string>();
  for (const move of operations.moveImages) {
    const sourceImages = finalImagesByVariantReference.get(move.fromVariantId);
    const destinationReference = moveDestinationByImageId.get(move.imageId);
    const destinationImages =
      destinationReference === undefined
        ? undefined
        : finalImagesByVariantReference.get(destinationReference);
    const imageIndex = sourceImages?.findIndex((image) => image.id === move.imageId) ?? -1;

    if (
      !sourceImages ||
      destinationReference === undefined ||
      !destinationImages ||
      imageIndex === -1
    ) {
      throw new InvalidVariantOperationsError("Image move state is invalid");
    }

    sourceImages.splice(imageIndex, 1);
    destinationImages.push({
      id: move.imageId,
      position: move.position,
      isCover: move.isCover,
    });
    movedVariantReferences.add(move.fromVariantId);
    movedVariantReferences.add(destinationReference);
  }

  for (const id of deletingVariantIds) {
    finalImagesByVariantReference.delete(id);
  }

  for (const [reference, finalImages] of finalImagesByVariantReference) {
    if (!hasUniquePositions(finalImages) || !hasAtMostOneCover(finalImages)) {
      throw new InvalidVariantOperationsError("Invalid final image positions or cover image");
    }
    if (movedVariantReferences.has(reference) && !hasConsecutiveImagePositions(finalImages)) {
      throw new InvalidVariantOperationsError("Moved image positions must be consecutive");
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
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const { getProductsWithVariants } = await import("@/lib/products");
    return NextResponse.json(await getProductsWithVariants());
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error obteniendo productos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
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
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    if (body.bulkDropAssignment !== undefined) {
      if (Object.keys(body).length !== 1) {
        return NextResponse.json({ error: "Invalid bulk drop assignment" }, { status: 400 });
      }

      const assignment = toBulkDropAssignment(body.bulkDropAssignment);
      if (assignment === null) {
        return NextResponse.json({ error: "Invalid bulk drop assignment" }, { status: 400 });
      }

      const updated = await applyBulkDropAssignment(assignment);
      if (updated.length !== assignment.productIds.length) {
        throw new Error("Bulk drop assignment did not update every product");
      }

      return NextResponse.json(updated);
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

      const existingVariantOperations = variantOperations.upsert.filter(
        (variant): variant is ProductVariantUpsertValues & { id: number } =>
          variant.id !== undefined,
      );
      const newVariantOperations = variantOperations.upsert.filter(
        (variant) => variant.id === undefined,
      );
      const variantIdsToTemporarilyUpdate = new Set([
        ...variantOperations.deleteIds,
        ...existingVariantOperations.map((variant) => variant.id),
      ]);
      const variantTemporaryPositions = temporaryPositions(
        variantIdsToTemporarilyUpdate.size + newVariantOperations.length,
        existingVariants.map((variant) => variant.position),
      );

      let variantTemporaryPositionIndex = 0;
      for (const variantId of variantIdsToTemporarilyUpdate) {
        await tx
          .update(productVariants)
          .set({
            position: variantTemporaryPositions[variantTemporaryPositionIndex++],
            isDefault: false,
          })
          .where(eq(productVariants.id, variantId));
      }

      const variantIdsForUpserts = new Map<ProductVariantUpsertValues, number>();
      const newVariantIdsByClientKey = new Map<string, number>();
      for (const variant of existingVariantOperations) {
        variantIdsForUpserts.set(variant, variant.id);
      }

      for (const variant of newVariantOperations) {
        if (variant.id !== undefined) {
          continue;
        }

        const [createdVariant] = await tx
          .insert(productVariants)
          .values({
            productId: id,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            colorStatus: variant.colorStatus,
            position: variantTemporaryPositions[variantTemporaryPositionIndex++],
            isDefault: false,
          })
          .returning();

        if (!createdVariant) throw new Error("Variant creation did not return a variant");
        variantIdsForUpserts.set(variant, createdVariant.id);
        if (variant.clientKey !== undefined) {
          newVariantIdsByClientKey.set(variant.clientKey, createdVariant.id);
        }
      }

      const imageDeleteIds = variantOperations.upsert.flatMap((variant) => variant.images.deleteIds);
      if (imageDeleteIds.length > 0) {
        await tx.delete(productImages).where(inArray(productImages.id, imageDeleteIds));
      }

      const existingImageOperations = variantOperations.upsert.flatMap((variant) =>
        variant.images.upsert.flatMap((image) =>
          image.id === undefined ? [] : [image as ProductImageUpsertValues & { id: number }],
        ),
      );
      const movedImages = variantOperations.moveImages.map((move) => {
        const productVariantId =
          move.toVariantId ??
          (move.toVariantClientKey === undefined
            ? undefined
            : newVariantIdsByClientKey.get(move.toVariantClientKey));
        if (productVariantId === undefined) {
          throw new Error("Move destination did not resolve to a product variant");
        }
        return { ...move, productVariantId };
      });
      const imageTemporaryPositions = temporaryPositions(
        existingImageOperations.length + movedImages.length,
        existingImages.map((image) => image.position),
      );

      const temporarilyUpdatedImageIds = [
        ...existingImageOperations.map((image) => image.id),
        ...movedImages.map((move) => move.imageId),
      ];
      for (const [index, imageId] of temporarilyUpdatedImageIds.entries()) {
        await tx
          .update(productImages)
          .set({ position: imageTemporaryPositions[index], isCover: false })
          .where(eq(productImages.id, imageId));
      }

      for (const move of movedImages) {
        await tx
          .update(productImages)
          .set({
            productVariantId: move.productVariantId,
            position: move.position,
            isCover: move.isCover,
          })
          .where(eq(productImages.id, move.imageId));
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

      for (const variant of variantOperations.upsert) {
        const productVariantId = variantIdsForUpserts.get(variant);
        if (productVariantId === undefined) {
          throw new Error("Variant upsert did not resolve to a product variant");
        }

        for (const image of variant.images.upsert) {
          if (image.id !== undefined) continue;

          await tx.insert(productImages).values({
            productVariantId,
            storageKey: image.storageKey,
            legacyUrl: image.legacyUrl,
            originalFilename: image.originalFilename,
            originalSourcePath: image.originalSourcePath,
            position: image.position,
            isCover: image.isCover,
          });
        }
      }

      if (variantOperations.deleteIds.length > 0) {
        await tx
          .delete(productVariants)
          .where(inArray(productVariants.id, variantOperations.deleteIds));
      }

      for (const variant of variantOperations.upsert) {
        const productVariantId = variantIdsForUpserts.get(variant);
        if (productVariantId === undefined) {
          throw new Error("Variant upsert did not resolve to a product variant");
        }

        await tx
          .update(productVariants)
          .set({
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            colorStatus: variant.colorStatus,
            position: variant.position,
            isDefault: variant.isDefault,
          })
          .where(eq(productVariants.id, productVariantId));
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
    if (error instanceof InvalidVariantOperationsError || error instanceof InvalidBulkDropAssignmentError) {
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
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
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
