import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  machineryCategories,
  machineryProductImages,
  machineryProducts,
} from "@/db/schema";
import type {
  MachineryCategory,
  MachineryCategoryPayload,
  MachineryImagePayload,
  MachineryMetrics,
  MachineryProduct,
  MachineryProductImage,
  MachineryProductPayload,
  MachinerySpecification,
} from "@/lib/machinery-types";

export class MachineryValidationError extends Error {}
export class MachineryNotFoundError extends Error {}
export class MachineryCategoryInUseError extends Error {}
export class MachinerySlugConflictError extends Error {}

type StoredMachineryImage = typeof machineryProductImages.$inferSelect;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function nullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}

function validSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isMachineryStoragePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > "machinery/".length &&
    value.length <= 500 &&
    value.startsWith("machinery/") &&
    !value.includes("..") &&
    !value.includes("\\")
  );
}

function serializeImage(image: StoredMachineryImage): MachineryProductImage {
  return {
    id: image.id,
    productId: image.productId,
    storagePath: image.storagePath,
    altText: image.altText,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt.toISOString(),
  };
}

function serializeSpecifications(value: unknown): MachinerySpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MachinerySpecification =>
      isRecord(item) && typeof item.label === "string" && typeof item.value === "string",
  );
}

export function parseMachineryCategoryPayload(input: unknown): MachineryCategoryPayload {
  if (!isRecord(input)) throw new MachineryValidationError("Datos de categoría inválidos");

  const name = requiredText(input.name, 160);
  const description = nullableText(input.description, 2000);
  if (
    !name ||
    !validSlug(input.slug) ||
    description === undefined ||
    !nonNegativeInteger(input.sortOrder) ||
    typeof input.isPublished !== "boolean"
  ) {
    throw new MachineryValidationError("Revisa los campos de la categoría");
  }

  return {
    name,
    slug: input.slug,
    description,
    sortOrder: input.sortOrder,
    isPublished: input.isPublished,
  };
}

function parseSpecifications(value: unknown): MachinerySpecification[] {
  if (!Array.isArray(value) || value.length > 30) {
    throw new MachineryValidationError("Las especificaciones no son válidas");
  }

  return value.map((item) => {
    if (!isRecord(item)) throw new MachineryValidationError("Las especificaciones no son válidas");
    const label = requiredText(item.label, 120);
    const specificationValue = requiredText(item.value, 300);
    if (!label || !specificationValue) {
      throw new MachineryValidationError("Las especificaciones no son válidas");
    }
    return { label, value: specificationValue };
  });
}

export function parseMachineryProductPayload(input: unknown): MachineryProductPayload {
  if (!isRecord(input)) throw new MachineryValidationError("Datos de producto inválidos");

  const categoryId = positiveId(input.categoryId);
  const name = requiredText(input.name, 200);
  const shortDescription = requiredText(input.shortDescription, 500);
  const description = nullableText(input.description, 8000);
  const priceNote = nullableText(input.priceNote, 160);
  if (
    categoryId === null ||
    !name ||
    !validSlug(input.slug) ||
    !shortDescription ||
    description === undefined ||
    priceNote === undefined ||
    !nonNegativeInteger(input.sortOrder) ||
    typeof input.isPublished !== "boolean"
  ) {
    throw new MachineryValidationError("Revisa los campos del producto");
  }

  return {
    categoryId,
    name,
    slug: input.slug,
    shortDescription,
    description,
    specifications: parseSpecifications(input.specifications),
    priceNote,
    sortOrder: input.sortOrder,
    isPublished: input.isPublished,
  };
}

export function parseMachineryImagePayloads(input: unknown): MachineryImagePayload[] {
  if (!isRecord(input) || !Array.isArray(input.images) || input.images.length > 12) {
    throw new MachineryValidationError("Las imágenes no son válidas");
  }

  const images = input.images.map((item): MachineryImagePayload => {
    if (!isRecord(item)) throw new MachineryValidationError("Las imágenes no son válidas");
    const id = item.id === undefined ? undefined : positiveId(item.id);
    const altText = nullableText(item.altText, 300);
    if (id === null) throw new MachineryValidationError("Las imágenes no son válidas");
    if (
      !isMachineryStoragePath(item.storagePath) ||
      altText === undefined ||
      !nonNegativeInteger(item.sortOrder) ||
      typeof item.isPrimary !== "boolean"
    ) {
      throw new MachineryValidationError("Las imágenes no son válidas");
    }
    return {
      ...(id === undefined ? {} : { id }),
      storagePath: item.storagePath,
      altText,
      sortOrder: item.sortOrder,
      isPrimary: item.isPrimary,
    };
  });

  const paths = images.map((image) => image.storagePath);
  const positions = images.map((image) => image.sortOrder);
  if (
    new Set(paths).size !== paths.length ||
    new Set(positions).size !== positions.length ||
    images.filter((image) => image.isPrimary).length > 1
  ) {
    throw new MachineryValidationError("Las imágenes no son válidas");
  }

  return images;
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === "23505";
}

function mapCategory(
  category: typeof machineryCategories.$inferSelect,
  productCount: number,
): MachineryCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sortOrder,
    isPublished: category.isPublished,
    productCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function listMachineryCategories(): Promise<MachineryCategory[]> {
  const [categories, productCounts] = await Promise.all([
    db.select().from(machineryCategories).orderBy(asc(machineryCategories.sortOrder), asc(machineryCategories.name)),
    db
      .select({ categoryId: machineryProducts.categoryId, productCount: sql<number>`count(*)::int` })
      .from(machineryProducts)
      .groupBy(machineryProducts.categoryId),
  ]);
  const productCountByCategory = new Map(
    productCounts.map((entry) => [entry.categoryId, entry.productCount]),
  );
  return categories.map((category) => mapCategory(category, productCountByCategory.get(category.id) ?? 0));
}

function mapProduct(
  product: typeof machineryProducts.$inferSelect,
  category: Pick<typeof machineryCategories.$inferSelect, "name" | "slug">,
  images: StoredMachineryImage[],
): MachineryProduct {
  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryName: category.name,
    categorySlug: category.slug,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    specifications: serializeSpecifications(product.specifications),
    priceNote: product.priceNote,
    sortOrder: product.sortOrder,
    isPublished: product.isPublished,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    images: images
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(serializeImage),
  };
}

export async function listMachineryProducts(): Promise<MachineryProduct[]> {
  const records = await db
    .select({ product: machineryProducts, category: machineryCategories })
    .from(machineryProducts)
    .innerJoin(machineryCategories, eq(machineryProducts.categoryId, machineryCategories.id))
    .orderBy(asc(machineryProducts.sortOrder), asc(machineryProducts.name));
  const productIds = records.map((record) => record.product.id);
  const images =
    productIds.length === 0
      ? []
      : await db
          .select()
          .from(machineryProductImages)
          .where(inArray(machineryProductImages.productId, productIds))
          .orderBy(asc(machineryProductImages.sortOrder));
  const imagesByProduct = new Map<number, StoredMachineryImage[]>();
  for (const image of images) {
    const current = imagesByProduct.get(image.productId) ?? [];
    current.push(image);
    imagesByProduct.set(image.productId, current);
  }
  return records.map(({ product, category }) => mapProduct(product, category, imagesByProduct.get(product.id) ?? []));
}

export async function getMachineryMetrics(): Promise<MachineryMetrics> {
  const [categories, products] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(machineryCategories),
    db.select({ isPublished: machineryProducts.isPublished }).from(machineryProducts),
  ]);
  const productCount = products.length;
  const publishedCount = products.filter((product) => product.isPublished).length;
  return {
    categoryCount: categories[0]?.value ?? 0,
    productCount,
    publishedCount,
    draftCount: productCount - publishedCount,
  };
}

async function getCategoryOrThrow(id: number) {
  const [category] = await db
    .select()
    .from(machineryCategories)
    .where(eq(machineryCategories.id, id))
    .limit(1);
  if (!category) throw new MachineryNotFoundError("Categoría no encontrada");
  return category;
}

async function getProductOrThrow(id: number) {
  const [product] = await db
    .select()
    .from(machineryProducts)
    .where(eq(machineryProducts.id, id))
    .limit(1);
  if (!product) throw new MachineryNotFoundError("Producto no encontrado");
  return product;
}

export async function createMachineryCategory(values: MachineryCategoryPayload) {
  try {
    const [category] = await db
      .insert(machineryCategories)
      .values({ ...values, updatedAt: new Date() })
      .returning();
    if (!category) throw new Error("Category creation did not return a category");
    return mapCategory(category, 0);
  } catch (error) {
    if (isUniqueViolation(error)) throw new MachinerySlugConflictError("El slug de categoría ya existe");
    throw error;
  }
}

export async function updateMachineryCategory(id: number, values: MachineryCategoryPayload) {
  await getCategoryOrThrow(id);
  try {
    const [category] = await db
      .update(machineryCategories)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(machineryCategories.id, id))
      .returning();
    if (!category) throw new MachineryNotFoundError("Categoría no encontrada");
    const [count] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(machineryProducts)
      .where(eq(machineryProducts.categoryId, id));
    return mapCategory(category, count?.value ?? 0);
  } catch (error) {
    if (isUniqueViolation(error)) throw new MachinerySlugConflictError("El slug de categoría ya existe");
    throw error;
  }
}

export async function deleteMachineryCategory(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [category] = await tx
      .select({ id: machineryCategories.id })
      .from(machineryCategories)
      .where(eq(machineryCategories.id, id))
      .limit(1);
    if (!category) throw new MachineryNotFoundError("Categoría no encontrada");
    const [product] = await tx
      .select({ id: machineryProducts.id })
      .from(machineryProducts)
      .where(eq(machineryProducts.categoryId, id))
      .limit(1);
    if (product) throw new MachineryCategoryInUseError("No puedes eliminar una categoría con productos");
    await tx.delete(machineryCategories).where(eq(machineryCategories.id, id));
  });
}

async function resolveProduct(id: number): Promise<MachineryProduct> {
  const products = await listMachineryProducts();
  const product = products.find((candidate) => candidate.id === id);
  if (!product) throw new MachineryNotFoundError("Producto no encontrado");
  return product;
}

export async function createMachineryProduct(values: MachineryProductPayload) {
  await getCategoryOrThrow(values.categoryId);
  try {
    const [product] = await db
      .insert(machineryProducts)
      .values({ ...values, specifications: values.specifications, updatedAt: new Date() })
      .returning();
    if (!product) throw new Error("Product creation did not return a product");
    return resolveProduct(product.id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new MachinerySlugConflictError("El slug de producto ya existe");
    throw error;
  }
}

export async function updateMachineryProduct(id: number, values: MachineryProductPayload) {
  await Promise.all([getProductOrThrow(id), getCategoryOrThrow(values.categoryId)]);
  try {
    const [product] = await db
      .update(machineryProducts)
      .set({ ...values, specifications: values.specifications, updatedAt: new Date() })
      .where(eq(machineryProducts.id, id))
      .returning({ id: machineryProducts.id });
    if (!product) throw new MachineryNotFoundError("Producto no encontrado");
    return resolveProduct(id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new MachinerySlugConflictError("El slug de producto ya existe");
    throw error;
  }
}

export async function deleteMachineryProduct(id: number): Promise<string[]> {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: machineryProducts.id })
      .from(machineryProducts)
      .where(eq(machineryProducts.id, id))
      .limit(1);
    if (!product) throw new MachineryNotFoundError("Producto no encontrado");
    const images = await tx
      .select({ storagePath: machineryProductImages.storagePath })
      .from(machineryProductImages)
      .where(eq(machineryProductImages.productId, id));
    await tx.delete(machineryProducts).where(eq(machineryProducts.id, id));
    return images.map((image) => image.storagePath);
  });
}

export async function replaceMachineryProductImages(id: number, images: MachineryImagePayload[]) {
  const removedStoragePaths = await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: machineryProducts.id })
      .from(machineryProducts)
      .where(eq(machineryProducts.id, id))
      .limit(1);
    if (!product) throw new MachineryNotFoundError("Producto no encontrado");
    const current = await tx
      .select()
      .from(machineryProductImages)
      .where(eq(machineryProductImages.productId, id));
    const nextPaths = new Set(images.map((image) => image.storagePath));
    await tx.delete(machineryProductImages).where(eq(machineryProductImages.productId, id));
    if (images.length > 0) {
      await tx.insert(machineryProductImages).values(
        images.map((image) => ({
          productId: id,
          storagePath: image.storagePath,
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        })),
      );
    }
    return current
      .filter((image) => !nextPaths.has(image.storagePath))
      .map((image) => image.storagePath);
  });
  return { product: await resolveProduct(id), removedStoragePaths };
}

export function parseRouteId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new MachineryValidationError("Identificador inválido");
  return id;
}
