import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { confectionCategories, confectionProductImages, confectionProducts } from "@/db/schema";
import type {
  ConfectionCategory,
  ConfectionCategoryPayload,
  ConfectionImagePayload,
  ConfectionMetrics,
  ConfectionProduct,
  ConfectionProductImage,
  ConfectionProductPayload,
  ConfectionSpecification,
} from "@/lib/confection-types";

export class ConfectionValidationError extends Error {}
export class ConfectionNotFoundError extends Error {}
export class ConfectionCategoryInUseError extends Error {}
export class ConfectionSlugConflictError extends Error {}

type StoredImage = typeof confectionProductImages.$inferSelect;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function positiveId(value: unknown): number | null { return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null; }
function nonNegativeInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0; }
function requiredText(value: unknown, maxLength: number): string | null { if (typeof value !== "string") return null; const text = value.trim(); return text.length > 0 && text.length <= maxLength ? text : null; }
function nullableText(value: unknown, maxLength: number): string | null | undefined { if (value === null || value === undefined) return null; if (typeof value !== "string") return undefined; const text = value.trim(); return text.length <= maxLength ? text || null : undefined; }
function validSlug(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
function isConfectionStoragePath(value: unknown): value is string { return typeof value === "string" && value.length > "confection/".length && value.length <= 500 && value.startsWith("confection/") && !value.includes("..") && !value.includes("\\"); }
function isUniqueViolation(error: unknown): boolean { return isRecord(error) && error.code === "23505"; }

function serializeSpecifications(value: unknown): ConfectionSpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ConfectionSpecification => isRecord(item) && typeof item.label === "string" && typeof item.value === "string");
}

function serializeImage(image: StoredImage): ConfectionProductImage {
  return { id: image.id, productId: image.productId, storagePath: image.storagePath, altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary, createdAt: image.createdAt.toISOString() };
}

export function parseConfectionCategoryPayload(input: unknown): ConfectionCategoryPayload {
  if (!isRecord(input)) throw new ConfectionValidationError("Datos de categoría inválidos");
  const name = requiredText(input.name, 160);
  const description = nullableText(input.description, 2000);
  if (!name || !validSlug(input.slug) || description === undefined || !nonNegativeInteger(input.sortOrder) || typeof input.isPublished !== "boolean") throw new ConfectionValidationError("Revisa los campos de la categoría");
  return { name, slug: input.slug, description, sortOrder: input.sortOrder, isPublished: input.isPublished };
}

function parseSpecifications(value: unknown): ConfectionSpecification[] {
  if (!Array.isArray(value) || value.length > 30) throw new ConfectionValidationError("Las especificaciones no son válidas");
  return value.map((item) => {
    if (!isRecord(item)) throw new ConfectionValidationError("Las especificaciones no son válidas");
    const label = requiredText(item.label, 120);
    const specificationValue = requiredText(item.value, 300);
    if (!label || !specificationValue) throw new ConfectionValidationError("Las especificaciones no son válidas");
    return { label, value: specificationValue };
  });
}

export function parseConfectionProductPayload(input: unknown): ConfectionProductPayload {
  if (!isRecord(input)) throw new ConfectionValidationError("Datos de producto inválidos");
  const categoryId = positiveId(input.categoryId);
  const name = requiredText(input.name, 200);
  const shortDescription = requiredText(input.shortDescription, 500);
  const description = nullableText(input.description, 8000);
  const priceNote = nullableText(input.priceNote, 160);
  if (categoryId === null || !name || !shortDescription || !validSlug(input.slug) || description === undefined || priceNote === undefined || !nonNegativeInteger(input.sortOrder) || typeof input.isPublished !== "boolean") throw new ConfectionValidationError("Revisa los campos del producto");
  return { categoryId, name, slug: input.slug, shortDescription, description, specifications: parseSpecifications(input.specifications), priceNote, sortOrder: input.sortOrder, isPublished: input.isPublished };
}

export function parseConfectionImagePayloads(input: unknown): ConfectionImagePayload[] {
  if (!isRecord(input) || !Array.isArray(input.images) || input.images.length > 12) throw new ConfectionValidationError("Las imágenes no son válidas");
  const images = input.images.map((item): ConfectionImagePayload => {
    if (!isRecord(item)) throw new ConfectionValidationError("Las imágenes no son válidas");
    const id = item.id === undefined ? undefined : positiveId(item.id);
    const altText = nullableText(item.altText, 300);
    if (id === null || !isConfectionStoragePath(item.storagePath) || altText === undefined || !nonNegativeInteger(item.sortOrder) || typeof item.isPrimary !== "boolean") throw new ConfectionValidationError("Las imágenes no son válidas");
    return { ...(id === undefined ? {} : { id }), storagePath: item.storagePath, altText, sortOrder: item.sortOrder, isPrimary: item.isPrimary };
  });
  const paths = images.map((image) => image.storagePath);
  const positions = images.map((image) => image.sortOrder);
  if (new Set(paths).size !== paths.length || new Set(positions).size !== positions.length || images.filter((image) => image.isPrimary).length > 1) throw new ConfectionValidationError("Las imágenes no son válidas");
  return images;
}

function mapCategory(category: typeof confectionCategories.$inferSelect, productCount: number): ConfectionCategory {
  return { id: category.id, name: category.name, slug: category.slug, description: category.description, sortOrder: category.sortOrder, isPublished: category.isPublished, productCount, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() };
}

function mapProduct(product: typeof confectionProducts.$inferSelect, category: Pick<typeof confectionCategories.$inferSelect, "name" | "slug">, images: StoredImage[]): ConfectionProduct {
  return { id: product.id, categoryId: product.categoryId, categoryName: category.name, categorySlug: category.slug, name: product.name, slug: product.slug, shortDescription: product.shortDescription, description: product.description, specifications: serializeSpecifications(product.specifications), priceNote: product.priceNote, sortOrder: product.sortOrder, isPublished: product.isPublished, createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString(), images: images.sort((left, right) => left.sortOrder - right.sortOrder).map(serializeImage) };
}

export async function listConfectionCategories(): Promise<ConfectionCategory[]> {
  const [categories, counts] = await Promise.all([
    db.select().from(confectionCategories).orderBy(asc(confectionCategories.sortOrder), asc(confectionCategories.name)),
    db.select({ categoryId: confectionProducts.categoryId, productCount: sql<number>`count(*)::int` }).from(confectionProducts).groupBy(confectionProducts.categoryId),
  ]);
  const countByCategory = new Map(counts.map((entry) => [entry.categoryId, entry.productCount]));
  return categories.map((category) => mapCategory(category, countByCategory.get(category.id) ?? 0));
}

export async function listConfectionProducts(): Promise<ConfectionProduct[]> {
  const records = await db.select({ product: confectionProducts, category: confectionCategories }).from(confectionProducts).innerJoin(confectionCategories, eq(confectionProducts.categoryId, confectionCategories.id)).orderBy(asc(confectionProducts.sortOrder), asc(confectionProducts.name));
  const ids = records.map((record) => record.product.id);
  const images = ids.length === 0 ? [] : await db.select().from(confectionProductImages).where(inArray(confectionProductImages.productId, ids)).orderBy(asc(confectionProductImages.sortOrder));
  const imagesByProduct = new Map<number, StoredImage[]>();
  for (const image of images) { const current = imagesByProduct.get(image.productId) ?? []; current.push(image); imagesByProduct.set(image.productId, current); }
  return records.map(({ product, category }) => mapProduct(product, category, imagesByProduct.get(product.id) ?? []));
}

export async function getConfectionMetrics(): Promise<ConfectionMetrics> {
  const [categories, products] = await Promise.all([db.select({ value: sql<number>`count(*)::int` }).from(confectionCategories), db.select({ isPublished: confectionProducts.isPublished }).from(confectionProducts)]);
  const productCount = products.length;
  const publishedCount = products.filter((product) => product.isPublished).length;
  return { categoryCount: categories[0]?.value ?? 0, productCount, publishedCount, draftCount: productCount - publishedCount };
}

async function getCategoryOrThrow(id: number) { const [category] = await db.select().from(confectionCategories).where(eq(confectionCategories.id, id)).limit(1); if (!category) throw new ConfectionNotFoundError("Categoría no encontrada"); return category; }
async function getProductOrThrow(id: number) { const [product] = await db.select().from(confectionProducts).where(eq(confectionProducts.id, id)).limit(1); if (!product) throw new ConfectionNotFoundError("Producto no encontrado"); return product; }

export async function createConfectionCategory(values: ConfectionCategoryPayload) {
  try { const [category] = await db.insert(confectionCategories).values({ ...values, isPublished: false }).returning(); if (!category) throw new Error("Category creation failed"); return mapCategory(category, 0); }
  catch (error) { if (isUniqueViolation(error)) throw new ConfectionSlugConflictError("El slug de categoría ya existe"); throw error; }
}

export async function updateConfectionCategory(id: number, values: ConfectionCategoryPayload) {
  await getCategoryOrThrow(id);
  try { const [category] = await db.update(confectionCategories).set({ ...values, updatedAt: new Date() }).where(eq(confectionCategories.id, id)).returning(); if (!category) throw new ConfectionNotFoundError("Categoría no encontrada"); const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(confectionProducts).where(eq(confectionProducts.categoryId, id)); return mapCategory(category, count?.value ?? 0); }
  catch (error) { if (isUniqueViolation(error)) throw new ConfectionSlugConflictError("El slug de categoría ya existe"); throw error; }
}

export async function deleteConfectionCategory(id: number): Promise<void> {
  await db.transaction(async (tx) => { const [category] = await tx.select({ id: confectionCategories.id }).from(confectionCategories).where(eq(confectionCategories.id, id)).limit(1); if (!category) throw new ConfectionNotFoundError("Categoría no encontrada"); const [product] = await tx.select({ id: confectionProducts.id }).from(confectionProducts).where(eq(confectionProducts.categoryId, id)).limit(1); if (product) throw new ConfectionCategoryInUseError("No puedes eliminar una categoría con productos"); await tx.delete(confectionCategories).where(eq(confectionCategories.id, id)); });
}

async function resolveProduct(id: number): Promise<ConfectionProduct> { const [record] = await db.select({ product: confectionProducts, category: confectionCategories }).from(confectionProducts).innerJoin(confectionCategories, eq(confectionProducts.categoryId, confectionCategories.id)).where(eq(confectionProducts.id, id)).limit(1); if (!record) throw new ConfectionNotFoundError("Producto no encontrado"); const images = await db.select().from(confectionProductImages).where(eq(confectionProductImages.productId, id)).orderBy(asc(confectionProductImages.sortOrder)); return mapProduct(record.product, record.category, images); }

export async function createConfectionProduct(values: ConfectionProductPayload) { await getCategoryOrThrow(values.categoryId); try { const [product] = await db.insert(confectionProducts).values({ ...values, isPublished: false, specifications: values.specifications }).returning({ id: confectionProducts.id }); if (!product) throw new Error("Product creation failed"); return resolveProduct(product.id); } catch (error) { if (isUniqueViolation(error)) throw new ConfectionSlugConflictError("El slug de producto ya existe"); throw error; } }

export async function updateConfectionProduct(id: number, values: ConfectionProductPayload) { await Promise.all([getProductOrThrow(id), getCategoryOrThrow(values.categoryId)]); try { await db.update(confectionProducts).set({ ...values, specifications: values.specifications, updatedAt: new Date() }).where(eq(confectionProducts.id, id)); return resolveProduct(id); } catch (error) { if (isUniqueViolation(error)) throw new ConfectionSlugConflictError("El slug de producto ya existe"); throw error; } }

export async function deleteConfectionProduct(id: number): Promise<string[]> { return db.transaction(async (tx) => { const [product] = await tx.select({ id: confectionProducts.id }).from(confectionProducts).where(eq(confectionProducts.id, id)).limit(1); if (!product) throw new ConfectionNotFoundError("Producto no encontrado"); const images = await tx.select({ storagePath: confectionProductImages.storagePath }).from(confectionProductImages).where(eq(confectionProductImages.productId, id)); await tx.delete(confectionProducts).where(eq(confectionProducts.id, id)); return images.map((image) => image.storagePath); }); }

export async function replaceConfectionProductImages(id: number, images: ConfectionImagePayload[]) { const removedStoragePaths = await db.transaction(async (tx) => { const [product] = await tx.select({ id: confectionProducts.id }).from(confectionProducts).where(eq(confectionProducts.id, id)).limit(1); if (!product) throw new ConfectionNotFoundError("Producto no encontrado"); const current = await tx.select().from(confectionProductImages).where(eq(confectionProductImages.productId, id)); const nextPaths = new Set(images.map((image) => image.storagePath)); await tx.delete(confectionProductImages).where(eq(confectionProductImages.productId, id)); if (images.length > 0) await tx.insert(confectionProductImages).values(images.map((image) => ({ productId: id, storagePath: image.storagePath, altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary }))); return current.filter((image) => !nextPaths.has(image.storagePath)).map((image) => image.storagePath); }); return { product: await resolveProduct(id), removedStoragePaths }; }

export function parseRouteId(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new ConfectionValidationError("Identificador inválido"); return id; }
