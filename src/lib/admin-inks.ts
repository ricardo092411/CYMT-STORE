import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { inkProductImages, inkProducts } from "@/db/schema";
import type {
  InkImagePayload,
  InkMetrics,
  InkProduct,
  InkProductImage,
  InkProductPayload,
  InkSpecification,
} from "@/lib/ink-types";

export class InkValidationError extends Error {}
export class InkNotFoundError extends Error {}
export class InkSlugConflictError extends Error {}

type StoredInkImage = typeof inkProductImages.$inferSelect;

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
  return typeof value === "string" && value.length > 0 && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isInkStoragePath(value: unknown): value is string {
  return typeof value === "string" && value.length > "cmt-ink/".length && value.length <= 500 && value.startsWith("cmt-ink/") && !value.includes("..") && !value.includes("\\");
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === "23505";
}

function serializeSpecifications(value: unknown): InkSpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is InkSpecification => isRecord(item) && typeof item.label === "string" && typeof item.value === "string",
  );
}

function serializeImage(image: StoredInkImage): InkProductImage {
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

function mapProduct(product: typeof inkProducts.$inferSelect, images: StoredInkImage[]): InkProduct {
  return {
    id: product.id,
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
    images: images.sort((left, right) => left.sortOrder - right.sortOrder).map(serializeImage),
  };
}

function parseSpecifications(value: unknown): InkSpecification[] {
  if (!Array.isArray(value) || value.length > 30) throw new InkValidationError("Las especificaciones no son válidas");
  return value.map((item) => {
    if (!isRecord(item)) throw new InkValidationError("Las especificaciones no son válidas");
    const label = requiredText(item.label, 120);
    const specificationValue = requiredText(item.value, 300);
    if (!label || !specificationValue) throw new InkValidationError("Las especificaciones no son válidas");
    return { label, value: specificationValue };
  });
}

export function parseInkProductPayload(input: unknown): InkProductPayload {
  if (!isRecord(input)) throw new InkValidationError("Datos de CMT Ink inválidos");
  const name = requiredText(input.name, 200);
  const shortDescription = requiredText(input.shortDescription, 500);
  const description = nullableText(input.description, 8000);
  const priceNote = nullableText(input.priceNote, 160);
  if (!name || !shortDescription || !validSlug(input.slug) || description === undefined || priceNote === undefined || !nonNegativeInteger(input.sortOrder) || typeof input.isPublished !== "boolean") {
    throw new InkValidationError("Revisa los campos del producto");
  }
  return { name, slug: input.slug, shortDescription, description, specifications: parseSpecifications(input.specifications), priceNote, sortOrder: input.sortOrder, isPublished: input.isPublished };
}

export function parseInkImagePayloads(input: unknown): InkImagePayload[] {
  if (!isRecord(input) || !Array.isArray(input.images) || input.images.length > 12) throw new InkValidationError("Las imágenes no son válidas");
  const images = input.images.map((item): InkImagePayload => {
    if (!isRecord(item)) throw new InkValidationError("Las imágenes no son válidas");
    const id = item.id === undefined ? undefined : positiveId(item.id);
    const altText = nullableText(item.altText, 300);
    if (id === null || !isInkStoragePath(item.storagePath) || altText === undefined || !nonNegativeInteger(item.sortOrder) || typeof item.isPrimary !== "boolean") {
      throw new InkValidationError("Las imágenes no son válidas");
    }
    return { ...(id === undefined ? {} : { id }), storagePath: item.storagePath, altText, sortOrder: item.sortOrder, isPrimary: item.isPrimary };
  });
  const paths = images.map((image) => image.storagePath);
  const positions = images.map((image) => image.sortOrder);
  if (new Set(paths).size !== paths.length || new Set(positions).size !== positions.length || images.filter((image) => image.isPrimary).length > 1) {
    throw new InkValidationError("Las imágenes no son válidas");
  }
  return images;
}

export async function listInkProducts(): Promise<InkProduct[]> {
  const products = await db.select().from(inkProducts).orderBy(asc(inkProducts.sortOrder), asc(inkProducts.name));
  const productIds = products.map((product) => product.id);
  const images = productIds.length === 0 ? [] : await db.select().from(inkProductImages).where(inArray(inkProductImages.productId, productIds)).orderBy(asc(inkProductImages.sortOrder));
  const imagesByProduct = new Map<number, StoredInkImage[]>();
  for (const image of images) {
    const current = imagesByProduct.get(image.productId) ?? [];
    current.push(image);
    imagesByProduct.set(image.productId, current);
  }
  return products.map((product) => mapProduct(product, imagesByProduct.get(product.id) ?? []));
}

export async function getInkMetrics(): Promise<InkMetrics> {
  const [count, states] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(inkProducts),
    db.select({ isPublished: inkProducts.isPublished }).from(inkProducts),
  ]);
  const productCount = count[0]?.value ?? 0;
  const publishedCount = states.filter((product) => product.isPublished).length;
  return { productCount, publishedCount, draftCount: productCount - publishedCount };
}

async function getProductOrThrow(id: number): Promise<typeof inkProducts.$inferSelect> {
  const [product] = await db.select().from(inkProducts).where(eq(inkProducts.id, id)).limit(1);
  if (!product) throw new InkNotFoundError("Producto CMT Ink no encontrado");
  return product;
}

async function resolveProduct(id: number): Promise<InkProduct> {
  const product = await getProductOrThrow(id);
  const images = await db.select().from(inkProductImages).where(eq(inkProductImages.productId, id)).orderBy(asc(inkProductImages.sortOrder));
  return mapProduct(product, images);
}

export async function createInkProduct(values: InkProductPayload): Promise<InkProduct> {
  try {
    const [product] = await db.insert(inkProducts).values({ ...values, isPublished: false, specifications: values.specifications }).returning({ id: inkProducts.id });
    if (!product) throw new Error("Ink product creation did not return a product");
    return resolveProduct(product.id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new InkSlugConflictError("El slug de CMT Ink ya existe");
    throw error;
  }
}

export async function updateInkProduct(id: number, values: InkProductPayload): Promise<InkProduct> {
  await getProductOrThrow(id);
  try {
    await db.update(inkProducts).set({ ...values, specifications: values.specifications, updatedAt: new Date() }).where(eq(inkProducts.id, id));
    return resolveProduct(id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new InkSlugConflictError("El slug de CMT Ink ya existe");
    throw error;
  }
}

export async function deleteInkProduct(id: number): Promise<string[]> {
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: inkProducts.id }).from(inkProducts).where(eq(inkProducts.id, id)).limit(1);
    if (!product) throw new InkNotFoundError("Producto CMT Ink no encontrado");
    const images = await tx.select({ storagePath: inkProductImages.storagePath }).from(inkProductImages).where(eq(inkProductImages.productId, id));
    await tx.delete(inkProducts).where(eq(inkProducts.id, id));
    return images.map((image) => image.storagePath);
  });
}

export async function replaceInkProductImages(id: number, images: InkImagePayload[]) {
  const removedStoragePaths = await db.transaction(async (tx) => {
    const [product] = await tx.select({ id: inkProducts.id }).from(inkProducts).where(eq(inkProducts.id, id)).limit(1);
    if (!product) throw new InkNotFoundError("Producto CMT Ink no encontrado");
    const current = await tx.select().from(inkProductImages).where(eq(inkProductImages.productId, id));
    const nextPaths = new Set(images.map((image) => image.storagePath));
    await tx.delete(inkProductImages).where(eq(inkProductImages.productId, id));
    if (images.length > 0) await tx.insert(inkProductImages).values(images.map((image) => ({ productId: id, storagePath: image.storagePath, altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary })));
    return current.filter((image) => !nextPaths.has(image.storagePath)).map((image) => image.storagePath);
  });
  return { product: await resolveProduct(id), removedStoragePaths };
}

export function parseRouteId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new InkValidationError("Identificador inválido");
  return id;
}
