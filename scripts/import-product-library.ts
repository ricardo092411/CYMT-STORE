import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { hasCompositeColorName } from "../src/lib/suspicious-variants";

type ImportMode = "dry-run" | "execute";
type ProductReference = { candidateId: string; storageSlug: string };

type ImagePlan = {
  sourcePath: string;
  originalSourcePath: string;
  originalFilename: string;
  sha256: string;
  position: number;
  isCover: boolean;
  productReference: ProductReference;
  label: string;
};

type SourceImageCheck = {
  sourcePath: string;
  sha256: string;
  label: string;
};

type VariantPlan = {
  colorName: string;
  colorHex: string | null;
  colorStatus: "confirmed" | "requires_user_input";
  position: number;
  isDefault: boolean;
  productReference: ProductReference;
  images: ImagePlan[];
  label: string;
};

type ProductPlan = {
  candidateId: string;
  slug: string;
  name: string;
  type: string;
  price: number;
  variants: VariantPlan[];
};

type UploadPlan = ImagePlan & {
  absoluteSourcePath: string;
  storageKey: string;
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  data_type: string;
  udt_name: string;
};

type IndexRow = {
  tablename: string;
  indexname: string;
  indexdef: string;
};

type ExistingProductRow = {
  id: number;
  slug: string;
  name: string;
  type: string;
};

type DatabasePreflight = {
  pool?: Pool;
  schemaProblems: string[];
  existingSlugConflicts: ExistingProductRow[];
  potentialProductConflicts: ExistingProductRow[];
};

type StoragePreflight = {
  client?: SupabaseClient;
  status: "PASS" | "BLOCKED";
  secretKeyStatus: "PRESENT" | "MISSING";
  productImagesStatus: "BUCKET_EXISTS" | "NOT_FOUND" | "ERROR" | "NOT_CHECKED";
  detail: string;
};

type Preflight = {
  mode: ImportMode;
  batchId: string;
  batchPrefix: string;
  candidateProducts: ProductPlan[];
  variants: VariantPlan[];
  images: ImagePlan[];
  sourceImages: SourceImageCheck[];
  uploads: UploadPlan[];
  expectedCounts: { products: number; variants: number; images: number };
  packageCounts: { products: number; variants: number; images: number };
  hashesValid: number;
  missingFiles: string[];
  hashMismatches: string[];
  blockers: string[];
  warnings: string[];
  database: DatabasePreflight;
  storage: StoragePreflight;
};

type CreatedRecords = {
  products: number[];
  variants: number[];
  images: number[];
  storageKeys: string[];
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const packagePath = "D:/temp/cymt-final-import-package-v3-20260817230351552/final-import-package-v3.json";
const sourceImageRoot = resolve(projectRoot, "public", "images", "collections");
const auditDirectory = "D:/temp/cymt-import-results";
const productImagesBucket = "product-images";
const expectedCounts = { products: 103, variants: 117, images: 274 };

dotenv.config({ path: resolve(projectRoot, ".env.local"), quiet: true });
dotenv.config({ path: resolve(projectRoot, ".env"), quiet: true });

function parseMode(): ImportMode {
  const args = process.argv.slice(2);
  if (args.length !== 1 || (args[0] !== "--dry-run" && args[0] !== "--execute")) {
    throw new Error("Usage: tsx scripts/import-product-library.ts --dry-run|--execute");
  }

  return args[0] === "--dry-run" ? "dry-run" : "execute";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addBlocker(preflight: Preflight, message: string): void {
  if (!preflight.blockers.includes(message)) preflight.blockers.push(message);
}

function addWarning(preflight: Preflight, message: string): void {
  if (!preflight.warnings.includes(message)) preflight.warnings.push(message);
}

function requiredString(
  preflight: Preflight,
  value: unknown,
  label: string,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    addBlocker(preflight, `${label} must be a non-empty string.`);
    return null;
  }

  return value;
}

function requiredPositiveNumber(
  preflight: Preflight,
  value: unknown,
  label: string,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > Number.EPSILON
  ) {
    addBlocker(preflight, `${label} must be a finite number greater than zero with at most two decimals.`);
    return null;
  }

  return value;
}

function requiredNonNegativeInteger(
  preflight: Preflight,
  value: unknown,
  label: string,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    addBlocker(preflight, `${label} must be a non-negative integer.`);
    return null;
  }

  return value;
}

function requiredBoolean(preflight: Preflight, value: unknown, label: string): boolean | null {
  if (typeof value !== "boolean") {
    addBlocker(preflight, `${label} must be a boolean.`);
    return null;
  }

  return value;
}

function nullableString(preflight: Preflight, value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value === "string" && value.trim().length > 0) return value;

  addBlocker(preflight, `${label} must be a non-empty string or null.`);
  return null;
}

function requireNull(preflight: Preflight, value: unknown, label: string): void {
  if (value !== null) addBlocker(preflight, `${label} must be null; persistent IDs and storage keys are not accepted from the package.`);
}

function normalizeColorStatus(
  preflight: Preflight,
  value: unknown,
  label: string,
): "confirmed" | "requires_user_input" {
  const rawValue = requiredString(preflight, value, label);
  if (!rawValue) return "requires_user_input";

  const tokens = rawValue.trim().toLowerCase().split(/\s+/);
  if (tokens.every((token) => token === "resolved")) return "confirmed";
  if (rawValue === "requires_user_input") return "requires_user_input";

  addBlocker(preflight, `${label} must contain only approved resolved values.`);
  return "requires_user_input";
}

function checkPositions<T extends { position: number | null }>(
  preflight: Preflight,
  values: T[],
  label: string,
): void {
  const positions = values.flatMap((value) => (value.position === null ? [] : [value.position]));
  const sorted = [...positions].sort((left, right) => left - right);
  if (
    positions.length !== values.length ||
    positions.length === 0 ||
    new Set(positions).size !== positions.length ||
    !sorted.every((position, index) => position === index)
  ) {
    addBlocker(preflight, `${label} positions must be consecutive from zero without collisions.`);
  }
}

function checkExactlyOne(
  preflight: Preflight,
  values: Array<{ value: boolean | null }>,
  label: string,
): void {
  if (values.some((item) => item.value === null)) {
    addBlocker(preflight, `${label} flag is missing.`);
    return;
  }

  if (values.filter((item) => item.value === true).length !== 1) {
    addBlocker(preflight, `${label} must have exactly one true value.`);
  }
}

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const secretValues = [
    process.env.DATABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ].filter((value): value is string => Boolean(value));

  const redacted = secretValues.reduce(
    (message, secret) => message.replaceAll(secret, "[redacted]"),
    raw,
  ).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database url]");
  return redacted.trim() || (error instanceof Error ? error.name : "Unknown error");
}

function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function uniqueDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

function storagePathIsSafe(storageKey: string): boolean {
  const parts = storageKey.split("/");
  return (
    storageKey.length > 0 &&
    !storageKey.startsWith("/") &&
    parts.every((part) => part.length > 0 && part !== "." && part !== ".." && !part.includes("\\"))
  );
}

function createBatchId(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `cymt-${timestamp}-${randomUUID()}`;
}

function makeEmptyPreflight(mode: ImportMode): Preflight {
  const batchId = createBatchId();
  return {
    mode,
    batchId,
    batchPrefix: `imports/${batchId}`,
    candidateProducts: [],
    variants: [],
    images: [],
    sourceImages: [],
    uploads: [],
    expectedCounts,
    packageCounts: { products: 0, variants: 0, images: 0 },
    hashesValid: 0,
    missingFiles: [],
    hashMismatches: [],
    blockers: [],
    warnings: [],
    database: {
      schemaProblems: [],
      existingSlugConflicts: [],
      potentialProductConflicts: [],
    },
    storage: {
      status: "BLOCKED",
      secretKeyStatus: process.env.SUPABASE_SECRET_KEY ? "PRESENT" : "MISSING",
      productImagesStatus: "NOT_CHECKED",
      detail: "Storage preflight has not run.",
    },
  };
}

function validateImage(
  preflight: Preflight,
  value: unknown,
  productReference: ProductReference,
  label: string,
): ImagePlan | null {
  if (!isRecord(value)) {
    addBlocker(preflight, `${label} must be an object.`);
    return null;
  }

  const sourcePath = requiredString(preflight, value.sourcePath, `${label}.sourcePath`);
  const originalSourcePath = requiredString(
    preflight,
    value.originalSourcePath,
    `${label}.originalSourcePath`,
  );
  const originalFilename = requiredString(
    preflight,
    value.originalFilename,
    `${label}.originalFilename`,
  );
  const sha256 = requiredString(preflight, value.sha256, `${label}.sha256`);
  const position = requiredNonNegativeInteger(preflight, value.position, `${label}.position`);
  const isCover = requiredBoolean(preflight, value.isCover, `${label}.isCover`);
  requireNull(preflight, value.storageKey, `${label}.storageKey`);
  requireNull(preflight, value.legacyUrl, `${label}.legacyUrl`);
  requireNull(preflight, value.productImageId, `${label}.productImageId`);

  if (!sourcePath || !originalSourcePath || !originalFilename || !sha256 || position === null || isCover === null) {
    if (sourcePath && sha256) {
      preflight.sourceImages.push({ sourcePath, sha256: sha256.toLowerCase(), label });
    }
    return null;
  }

  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    addBlocker(preflight, `${label}.sha256 is not a SHA-256 hexadecimal digest.`);
  }
  if (extname(originalFilename).length === 0) {
    addBlocker(preflight, `${label}.originalFilename has no extension to preserve.`);
  }
  if (sourcePath !== originalSourcePath) {
    addBlocker(preflight, `${label} sourcePath and originalSourcePath must match exactly.`);
  }

  preflight.sourceImages.push({ sourcePath, sha256: sha256.toLowerCase(), label });

  return {
    sourcePath,
    originalSourcePath,
    originalFilename,
    sha256: sha256.toLowerCase(),
    position,
    isCover,
    productReference,
    label,
  };
}

function validateVariant(
  preflight: Preflight,
  value: unknown,
  productReference: ProductReference,
  label: string,
): VariantPlan | null {
  if (!isRecord(value)) {
    addBlocker(preflight, `${label} must be an object.`);
    return null;
  }

  const colorName = requiredString(preflight, value.colorName, `${label}.colorName`);
  if (colorName && hasCompositeColorName(colorName)) {
    addBlocker(
      preflight,
      `${label}.colorName contains multiple independent colors. Import requires one commercial color per variant.`,
    );
  }
  const colorHex = nullableString(preflight, value.colorHex, `${label}.colorHex`);
  const colorStatus = normalizeColorStatus(preflight, value.colorStatus, `${label}.colorStatus`);
  const position = requiredNonNegativeInteger(preflight, value.position, `${label}.position`);
  const isDefault = requiredBoolean(preflight, value.isDefault, `${label}.isDefault`);
  requireNull(preflight, value.productVariantId, `${label}.productVariantId`);

  const rawImages = toArray(value.images);
  if (!Array.isArray(value.images)) addBlocker(preflight, `${label}.images must be an array.`);
  const images = rawImages
    .map((image, index) => validateImage(preflight, image, productReference, `${label}.images[${index}]`))
    .filter((image): image is ImagePlan => image !== null);
  checkPositions(preflight, images, `${label} image`);
  checkExactlyOne(preflight, images.map((image) => ({ value: image.isCover })), `${label}.images isCover`);

  if (!colorName || position === null || isDefault === null) return null;

  return {
    colorName,
    colorHex,
    colorStatus,
    position,
    isDefault,
    productReference,
    images,
    label,
  };
}

function validateCandidateProduct(
  preflight: Preflight,
  value: unknown,
  index: number,
): ProductPlan | null {
  const label = `products[${index}]`;
  if (!isRecord(value)) {
    addBlocker(preflight, `${label} must be an object.`);
    return null;
  }

  const candidateId = requiredString(preflight, value.candidateId, `${label}.candidateId`);
  const slug = requiredString(preflight, value.suggestedSlug, `${label}.suggestedSlug`);
  const name = requiredString(preflight, value.name, `${label}.name`);
  const type = requiredString(preflight, value.type, `${label}.type`);
  const price = requiredPositiveNumber(preflight, value.price, `${label}.price`);
  requireNull(preflight, value.productId, `${label}.productId`);
  if (value.recordType !== "PRODUCT_CANDIDATE_IMPORT") {
    addBlocker(preflight, `${label}.recordType must be PRODUCT_CANDIDATE_IMPORT.`);
  }

  if (!candidateId || !slug || !name || !type || price === null) return null;
  if (slug.includes("/") || slug.includes("\\") || slug === "." || slug === "..") {
    addBlocker(preflight, `${label}.suggestedSlug is not safe for an isolated Storage path.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    addBlocker(preflight, `${label}.suggestedSlug must be a lowercase technical slug.`);
  }

  const productReference: ProductReference = { candidateId, storageSlug: slug };
  const rawVariants = toArray(value.variants);
  if (!Array.isArray(value.variants)) addBlocker(preflight, `${label}.variants must be an array.`);
  const variants = rawVariants
    .map((variant, variantIndex) =>
      validateVariant(preflight, variant, productReference, `${label}.variants[${variantIndex}]`),
    )
    .filter((variant): variant is VariantPlan => variant !== null);

  checkPositions(preflight, variants, `${label} variant`);
  checkExactlyOne(preflight, variants.map((variant) => ({ value: variant.isDefault })), `${label}.variants isDefault`);

  return { candidateId, slug, name, type, price, variants };
}

function validatePackageMetadata(preflight: Preflight, root: Record<string, unknown>): void {
  if (root.packageVersion !== "3") {
    addBlocker(preflight, "Package packageVersion must be 3.");
  }
  if (root.readyForDryRun !== true) {
    addBlocker(preflight, "Package readyForDryRun must be true.");
  }
  if (!Array.isArray(root.pendingExistingGroupAssociations) || root.pendingExistingGroupAssociations.length !== 0) {
    addBlocker(preflight, "Package pendingExistingGroupAssociations must be an empty array.");
  }
  if (!isRecord(root.associationReconciliation)) {
    addBlocker(preflight, "Package associationReconciliation is missing.");
  } else {
    const reconciliation = root.associationReconciliation;
    if (
      reconciliation.associationsTotal !== 31 ||
      reconciliation.associationsResolvedIntoExistingProducts !== 14 ||
      reconciliation.associationsMaterializedAsNewProducts !== 17 ||
      reconciliation.associationsBlocked !== 0
    ) {
      addBlocker(preflight, "Package associationReconciliation does not describe the approved 14+17 complete materialization.");
    }
  }
  if (!Array.isArray(root.newProductMaterializations) || root.newProductMaterializations.length !== 17) {
    addBlocker(preflight, "Package must contain exactly 17 newProductMaterializations.");
  }

  if (!isRecord(root.validation)) {
    addBlocker(preflight, "Package validation summary is missing.");
    return;
  }

  const validation = root.validation;
  if (!isRecord(validation.counts)) {
    addBlocker(preflight, "Package validation.counts is missing.");
  } else {
    const expectedValidation = [
      ["products", expectedCounts.products],
      ["variants", expectedCounts.variants],
      ["images", expectedCounts.images],
      ["expectedSourcePaths", expectedCounts.images],
      ["matchingHashes", expectedCounts.images],
    ] as const;
    for (const [field, expectedValue] of expectedValidation) {
      if (validation.counts[field] !== expectedValue) {
        addBlocker(preflight, `Package validation.counts.${field} must equal ${expectedValue}.`);
      }
    }
  }
  if (!isRecord(validation.checks) || Object.values(validation.checks).some((value) => value !== true)) {
    addBlocker(preflight, "Package validation.checks must contain only passing checks.");
  }
  if (!Array.isArray(validation.errors) || validation.errors.length > 0) {
    addBlocker(preflight, "Package validation.errors must be an empty array.");
  }
  if (!Array.isArray(validation.warnings) || validation.warnings.length > 0) {
    addBlocker(preflight, "Package validation.warnings must be an empty array.");
  }
}

function countPackageRecords(products: unknown[]): {
  products: number;
  variants: number;
  images: number;
} {
  const variants = products.filter(isRecord).flatMap((product) => toArray(product.variants));
  const images = variants.filter(isRecord).flatMap((variant) => toArray(variant.images));
  return { products: products.length, variants: variants.length, images: images.length };
}

async function readAndValidatePackage(preflight: Preflight): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(packagePath, "utf8")) as unknown;
  } catch (error) {
    addBlocker(preflight, `Unable to read approved package: ${sanitizeError(error)}`);
    return;
  }

  if (!isRecord(parsed)) {
    addBlocker(preflight, "Approved package root must be an object.");
    return;
  }

  validatePackageMetadata(preflight, parsed);
  const rawProducts = toArray(parsed.products);
  if (!Array.isArray(parsed.products)) addBlocker(preflight, "Package products must be an array.");

  preflight.packageCounts = countPackageRecords(rawProducts);
  for (const [field, expectedValue] of Object.entries(expectedCounts) as Array<
    [keyof typeof expectedCounts, number]
  >) {
    if (preflight.packageCounts[field] !== expectedValue) {
      addBlocker(
        preflight,
        `Package contains ${preflight.packageCounts[field]} ${field}; expected exactly ${expectedValue}.`,
      );
    }
  }

  preflight.candidateProducts = rawProducts
    .map((product, index) => validateCandidateProduct(preflight, product, index))
    .filter((product): product is ProductPlan => product !== null);
  preflight.variants = preflight.candidateProducts.flatMap((product) => product.variants);
  preflight.images = preflight.variants.flatMap((variant) => variant.images);

  const duplicateSlugs = uniqueDuplicates(preflight.candidateProducts.map((product) => product.slug));
  if (duplicateSlugs.length > 0) {
    addBlocker(preflight, `Package contains duplicate candidate slugs: ${duplicateSlugs.join(", ")}.`);
  }
  const duplicateSourcePaths = uniqueDuplicates(preflight.sourceImages.map((image) => image.sourcePath));
  if (duplicateSourcePaths.length > 0) {
    addBlocker(preflight, `Package contains duplicate sourcePaths: ${duplicateSourcePaths.join(", ")}.`);
  }
  const duplicateHashes = uniqueDuplicates(preflight.sourceImages.map((image) => image.sha256));
  if (duplicateHashes.length > 0) {
    addBlocker(preflight, `Package contains duplicate SHA-256 values: ${duplicateHashes.join(", ")}.`);
  }

  if (preflight.candidateProducts.length !== expectedCounts.products) {
    addBlocker(
      preflight,
      `Validated product candidates total ${preflight.candidateProducts.length}; expected ${expectedCounts.products}.`,
    );
  }
  if (preflight.variants.length !== expectedCounts.variants) {
    addBlocker(preflight, `Validated variants total ${preflight.variants.length}; expected ${expectedCounts.variants}.`);
  }
  if (preflight.images.length !== expectedCounts.images) {
    addBlocker(preflight, `Validated images total ${preflight.images.length}; expected ${expectedCounts.images}.`);
  }
}

async function mapWithConcurrency<T>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const run = async (): Promise<void> => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex++;
      await worker(values[currentIndex]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run));
}

async function validateSourceFiles(preflight: Preflight): Promise<void> {
  await mapWithConcurrency(preflight.sourceImages, 8, async (image) => {
    const absoluteSourcePath = resolve(projectRoot, image.sourcePath);
    const pathWithinSourceRoot = relative(sourceImageRoot, absoluteSourcePath);
    if (
      isAbsolute(pathWithinSourceRoot) ||
      pathWithinSourceRoot === "" ||
      pathWithinSourceRoot.startsWith("..\\") ||
      pathWithinSourceRoot.startsWith("../")
    ) {
      addBlocker(preflight, `${image.label}.sourcePath is outside public/images/collections.`);
      return;
    }

    try {
      await access(absoluteSourcePath);
    } catch {
      preflight.missingFiles.push(image.sourcePath);
      return;
    }

    const actualHash = createHash("sha256").update(await readFile(absoluteSourcePath)).digest("hex");
    if (actualHash !== image.sha256) {
      preflight.hashMismatches.push(image.sourcePath);
      return;
    }
    preflight.hashesValid += 1;
  });

  if (preflight.missingFiles.length > 0) {
    addBlocker(preflight, `${preflight.missingFiles.length} approved source files are missing.`);
  }
  if (preflight.hashMismatches.length > 0) {
    addBlocker(preflight, `${preflight.hashMismatches.length} approved source hashes do not match.`);
  }
  if (preflight.hashesValid !== expectedCounts.images) {
    addBlocker(
      preflight,
      `Verified ${preflight.hashesValid}/${expectedCounts.images} source hashes; all hashes must match.`,
    );
  }
}

function column(
  columns: ColumnRow[],
  tableName: string,
  columnName: string,
): ColumnRow | undefined {
  return columns.find((item) => item.table_name === tableName && item.column_name === columnName);
}

function checkDatabaseSchema(preflight: Preflight, columns: ColumnRow[], indexes: IndexRow[]): void {
  const requiredColumns: Record<string, string[]> = {
    products: [
      "id",
      "slug",
      "name",
      "type",
      "price",
      "stock",
      "status",
      "featured",
      "best_seller",
    ],
    product_variants: [
      "id",
      "product_id",
      "color_name",
      "color_hex",
      "color_status",
      "position",
      "is_default",
    ],
    product_images: [
      "id",
      "product_variant_id",
      "storage_key",
      "legacy_url",
      "original_filename",
      "original_source_path",
      "position",
      "is_cover",
    ],
  };
  for (const [tableName, fields] of Object.entries(requiredColumns)) {
    for (const field of fields) {
      if (!column(columns, tableName, field)) {
        preflight.database.schemaProblems.push(`${tableName}.${field} is missing.`);
      }
    }
  }

  const notNullFields = [
    ["products", "slug"],
    ["products", "name"],
    ["products", "type"],
    ["products", "price"],
    ["product_variants", "product_id"],
    ["product_variants", "position"],
    ["product_variants", "is_default"],
    ["product_images", "product_variant_id"],
    ["product_images", "original_filename"],
    ["product_images", "position"],
    ["product_images", "is_cover"],
  ] as const;
  for (const [tableName, field] of notNullFields) {
    if (column(columns, tableName, field)?.is_nullable !== "NO") {
      preflight.database.schemaProblems.push(`${tableName}.${field} must be NOT NULL.`);
    }
  }

  const expectedDefaults = [
    ["products", "stock", "0"],
    ["products", "status", "nuevo"],
    ["products", "featured", "false"],
    ["products", "best_seller", "false"],
  ] as const;
  for (const [tableName, field, expectedDefault] of expectedDefaults) {
    const defaultValue = column(columns, tableName, field)?.column_default?.toLowerCase() ?? "";
    if (!defaultValue.includes(expectedDefault)) {
      preflight.database.schemaProblems.push(
        `${tableName}.${field} default is incompatible with the approved import defaults.`,
      );
    }
  }

  const hasUniqueIndex = (tableName: string, requiredTerms: string[], partialTerm?: string): boolean =>
    indexes.some((index) => {
      const definition = index.indexdef.toLowerCase();
      return (
        index.tablename === tableName &&
        definition.includes("unique") &&
        requiredTerms.every((term) => definition.includes(term)) &&
        (partialTerm === undefined || definition.includes(partialTerm))
      );
    });
  if (!hasUniqueIndex("products", ["slug"])) {
    preflight.database.schemaProblems.push("products.slug has no unique index.");
  }
  if (!hasUniqueIndex("product_variants", ["product_id", "position"])) {
    preflight.database.schemaProblems.push("product_variants has no unique product_id/position index.");
  }
  if (!hasUniqueIndex("product_variants", ["product_id", "is_default"], "where")) {
    preflight.database.schemaProblems.push("product_variants has no partial unique default index.");
  }
  if (!hasUniqueIndex("product_images", ["product_variant_id", "position"])) {
    preflight.database.schemaProblems.push("product_images has no unique product_variant_id/position index.");
  }
  if (!hasUniqueIndex("product_images", ["product_variant_id", "is_cover"], "where")) {
    preflight.database.schemaProblems.push("product_images has no partial unique cover index.");
  }

  for (const problem of preflight.database.schemaProblems) {
    addBlocker(preflight, `Database schema: ${problem}`);
  }
}

async function preflightDatabase(preflight: Preflight): Promise<void> {
  if (!process.env.DATABASE_URL) {
    addBlocker(preflight, "Environment: DATABASE_URL is unavailable for the read-only PostgreSQL preflight.");
    return;
  }

  try {
    const { pool } = await import("../src/db");
    preflight.database.pool = pool;
    const [columnsResult, indexesResult] = await Promise.all([
      pool.query<ColumnRow>(
        `SELECT table_name, column_name, is_nullable, column_default, data_type, udt_name
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = ANY($1::text[])`,
        [["products", "product_variants", "product_images"]],
      ),
      pool.query<IndexRow>(
        `SELECT tablename, indexname, indexdef
         FROM pg_indexes
         WHERE schemaname = current_schema()
           AND tablename = ANY($1::text[])`,
        [["products", "product_variants", "product_images"]],
      ),
    ]);
    checkDatabaseSchema(preflight, columnsResult.rows, indexesResult.rows);

    const slugs = preflight.candidateProducts.map((product) => product.slug);
    const candidateNameTypes = new Set(
      preflight.candidateProducts.map((product) => `${normalizedText(product.name)}\u0000${normalizedText(product.type)}`),
    );
    const candidateNames = [...new Set(preflight.candidateProducts.map((product) => normalizedText(product.name)))];
    const [slugResult, nameResult] = await Promise.all([
      pool.query<ExistingProductRow>(
        `SELECT id, slug, name, type FROM products WHERE slug = ANY($1::text[])`,
        [slugs],
      ),
      pool.query<ExistingProductRow>(
        `SELECT id, slug, name, type FROM products WHERE lower(name) = ANY($1::text[])`,
        [candidateNames],
      ),
    ]);
    preflight.database.existingSlugConflicts = slugResult.rows;
    preflight.database.potentialProductConflicts = nameResult.rows.filter((product) =>
      candidateNameTypes.has(`${normalizedText(product.name)}\u0000${normalizedText(product.type)}`),
    );

    if (preflight.database.existingSlugConflicts.length > 0) {
      addBlocker(
        preflight,
        `PostgreSQL already contains package slugs: ${preflight.database.existingSlugConflicts.map((product) => product.slug).join(", ")}.`,
      );
    }
    if (preflight.database.potentialProductConflicts.length > 0) {
      addWarning(
        preflight,
        `Potential PostgreSQL name/type conflicts: ${preflight.database.potentialProductConflicts.map((product) => product.slug).join(", ")}.`,
      );
    }

  } catch (error) {
    addBlocker(preflight, `PostgreSQL read preflight failed: ${sanitizeError(error)}`);
  }
}

function makeUploadPlans(preflight: Preflight): void {
  const uploads: UploadPlan[] = [];
  for (const image of preflight.images) {
    const extension = extname(image.originalFilename);
    const storageKey = `${preflight.batchPrefix}/${image.productReference.storageSlug}/v${image.productReference.candidateId}/i${image.position}-${image.sha256.slice(0, 16)}${extension}`;
    if (!storagePathIsSafe(storageKey)) {
      addBlocker(preflight, `${image.label} would generate an unsafe Storage key.`);
      continue;
    }
    uploads.push({
      ...image,
      absoluteSourcePath: resolve(projectRoot, image.sourcePath),
      storageKey,
    });
  }
  preflight.uploads = uploads;

  const duplicateKeys = uniqueDuplicates(uploads.map((upload) => upload.storageKey));
  if (duplicateKeys.length > 0) {
    addBlocker(preflight, `Planned Storage keys collide: ${duplicateKeys.join(", ")}.`);
  }
  if (uploads.length !== expectedCounts.images) {
    addBlocker(
      preflight,
      `Only ${uploads.length}/${expectedCounts.images} Storage destinations can be planned; every image needs one resolved product destination.`,
    );
  }
}

function createAdministrativeStorageClient(preflight: Preflight): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  preflight.storage.secretKeyStatus = secretKey ? "PRESENT" : "MISSING";

  if (!supabaseUrl) {
    const detail = "NEXT_PUBLIC_SUPABASE_URL missing";
    preflight.storage.detail = detail;
    addBlocker(preflight, `Storage preflight: ${detail}`);
    return null;
  }
  if (!secretKey) {
    const detail = "SUPABASE_SECRET_KEY missing";
    preflight.storage.detail = detail;
    addBlocker(preflight, detail);
    return null;
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function preflightStorage(preflight: Preflight): Promise<void> {
  const client = createAdministrativeStorageClient(preflight);
  if (!client) return;

  try {
    preflight.storage.client = client;
    const { data: bucket, error: bucketError } = await client.storage.getBucket(productImagesBucket);
    if (bucketError || bucket?.id !== productImagesBucket) {
      const detail = bucketError
        ? `Cannot read bucket ${productImagesBucket}: ${sanitizeError(bucketError)}`
        : `Bucket ${productImagesBucket} was not returned by Storage.`;
      preflight.storage.productImagesStatus = bucketError?.message.toLowerCase().includes("not found")
        ? "NOT_FOUND"
        : "ERROR";
      preflight.storage.detail = detail;
      addBlocker(preflight, `Storage preflight: ${detail}`);
      return;
    }

    const { data: existingObjects, error: listError } = await client.storage
      .from(productImagesBucket)
      .list(preflight.batchPrefix, { limit: 1 });
    if (listError) {
      const detail = `Cannot inspect planned batch prefix: ${sanitizeError(listError)}`;
      preflight.storage.productImagesStatus = "ERROR";
      preflight.storage.detail = detail;
      addBlocker(preflight, `Storage preflight: ${detail}`);
      return;
    }
    if ((existingObjects ?? []).length > 0) {
      const detail = `Planned batch prefix ${preflight.batchPrefix} already contains objects.`;
      preflight.storage.productImagesStatus = "ERROR";
      preflight.storage.detail = detail;
      addBlocker(preflight, `Storage preflight: ${detail}`);
      return;
    }

    preflight.storage.productImagesStatus = "BUCKET_EXISTS";
    preflight.storage.status = "PASS";
    preflight.storage.detail = `Bucket ${productImagesBucket} is readable through the server-side administrative client; planned prefix is empty.`;
  } catch (error) {
    const detail = `Unable to initialize existing Storage client: ${sanitizeError(error)}`;
    preflight.storage.productImagesStatus = "ERROR";
    preflight.storage.detail = detail;
    addBlocker(preflight, `Storage preflight: ${detail}`);
  }
}

async function buildPreflight(mode: ImportMode): Promise<Preflight> {
  const preflight = makeEmptyPreflight(mode);
  await readAndValidatePackage(preflight);
  await validateSourceFiles(preflight);
  await preflightDatabase(preflight);
  makeUploadPlans(preflight);
  await preflightStorage(preflight);
  return preflight;
}

function displayList(values: string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function printPreflight(preflight: Preflight): void {
  console.log(`IMPORT_PACKAGE: ${packagePath}`);
  console.log(`MODE: ${preflight.mode}`);
  console.log(`BATCH_PREFIX: ${preflight.batchPrefix}`);
  console.log(`PRODUCTS: expected ${expectedCounts.products}; package ${preflight.packageCounts.products}; validated ${preflight.candidateProducts.length}`);
  console.log(`VARIANTS: expected ${expectedCounts.variants}; package ${preflight.packageCounts.variants}; validated ${preflight.variants.length}`);
  console.log(`IMAGES: expected ${expectedCounts.images}; package ${preflight.packageCounts.images}; validated ${preflight.images.length}`);
  console.log(`HASHES_VALID: ${preflight.hashesValid}/${expectedCounts.images}`);
  console.log(`FILES_MISSING: ${preflight.missingFiles.length}`);
  console.log(`HASH_MISMATCHES: ${preflight.hashMismatches.length}`);
  console.log(`POSTGRESQL_SLUG_CONFLICTS: ${displayList(preflight.database.existingSlugConflicts.map((product) => product.slug))}`);
  console.log(`POSTGRESQL_POTENTIAL_CONFLICTS: ${displayList(preflight.database.potentialProductConflicts.map((product) => product.slug))}`);
  console.log(`POSTGRESQL_SCHEMA_PROBLEMS: ${displayList(preflight.database.schemaProblems)}`);
  console.log(`SUPABASE_SECRET_KEY: ${preflight.storage.secretKeyStatus}`);
  console.log(`PRODUCT_IMAGES_STATUS: ${preflight.storage.productImagesStatus}`);
  console.log(`STORAGE_ACCESS: ${preflight.storage.status} - ${preflight.storage.detail}`);
  console.log(`POSTGRESQL_OPERATIONS_PLANNED: INSERT products=${expectedCounts.products}, product_variants=${expectedCounts.variants}, product_images=${expectedCounts.images} in one transaction after all uploads.`);
  console.log(`STORAGE_UPLOADS_PLANNED: ${preflight.uploads.length}/${expectedCounts.images} to ${preflight.batchPrefix}`);
  console.log(`STORAGE_MECHANISM: server-side administrative client with SUPABASE_SECRET_KEY and product-images bucket; upload uses upsert=false.`);
  if (preflight.warnings.length > 0) {
    console.log("WARNINGS:");
    for (const warning of preflight.warnings) console.log(`- ${warning}`);
  }
  if (preflight.blockers.length > 0) {
    console.log("BLOCKERS:");
    for (const blocker of preflight.blockers) console.log(`- ${blocker}`);
  } else {
    console.log("BLOCKERS: none");
  }
}

async function cleanupBatch(client: SupabaseClient, storageKeys: string[]): Promise<string | null> {
  if (storageKeys.length === 0) return null;
  const { error } = await client.storage.from(productImagesBucket).remove(storageKeys);
  return error ? sanitizeError(error) : null;
}

function contentTypeFor(filename: string): string {
  switch (extname(filename).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function createDatabaseRecords(preflight: Preflight, uploadedKeys: Map<string, string>): Promise<CreatedRecords> {
  const { db } = await import("../src/db");
  const { products, productVariants, productImages } = await import("../src/db/schema");
  const { inArray } = await import("drizzle-orm");
  const created: CreatedRecords = { products: [], variants: [], images: [], storageKeys: [...uploadedKeys.values()] };

  await db.transaction(async (tx) => {
    const packageSlugs = preflight.candidateProducts.map((product) => product.slug);
    const conflicts = await tx
      .select({ slug: products.slug })
      .from(products)
      .where(inArray(products.slug, packageSlugs));
    if (conflicts.length > 0) {
      throw new Error(`Concurrent slug conflict: ${conflicts.map((product) => product.slug).join(", ")}`);
    }

    const productIdsByCandidateId = new Map<string, number>();
    for (const product of preflight.candidateProducts) {
      const [createdProduct] = await tx
        .insert(products)
        .values({
          slug: product.slug,
          name: product.name,
          type: product.type,
          price: String(product.price),
          stock: 0,
          status: "nuevo",
          featured: false,
          bestSeller: false,
        })
        .returning({ id: products.id });
      if (!createdProduct) throw new Error(`Insert did not return product ${product.slug}.`);
      productIdsByCandidateId.set(product.candidateId, createdProduct.id);
      created.products.push(createdProduct.id);
    }

    for (const variant of preflight.variants) {
      const productId = productIdsByCandidateId.get(variant.productReference.candidateId);
      if (!productId || productId < 1) {
        throw new Error(`Variant product relationship did not resolve for ${variant.label}.`);
      }
      const [createdVariant] = await tx
        .insert(productVariants)
        .values({
          productId,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          colorStatus: variant.colorStatus,
          position: variant.position,
          isDefault: variant.isDefault,
        })
        .returning({ id: productVariants.id });
      if (!createdVariant) throw new Error(`Insert did not return variant ${variant.label}.`);
      created.variants.push(createdVariant.id);

      for (const image of variant.images) {
        const storageKey = uploadedKeys.get(image.sourcePath);
        if (!storageKey) throw new Error(`Uploaded storage key did not resolve for ${image.sourcePath}.`);
        const [createdImage] = await tx
          .insert(productImages)
          .values({
            productVariantId: createdVariant.id,
            storageKey,
            legacyUrl: null,
            originalFilename: image.originalFilename,
            originalSourcePath: image.originalSourcePath,
            position: image.position,
            isCover: image.isCover,
          })
          .returning({ id: productImages.id });
        if (!createdImage) throw new Error(`Insert did not return image ${image.sourcePath}.`);
        created.images.push(createdImage.id);
      }
    }
  });

  return created;
}

async function writeAuditReport(
  preflight: Preflight,
  startedAt: string,
  result: "SUCCESS" | "BLOCKED" | "FAILED",
  created: CreatedRecords,
  error?: string,
  cleanupError?: string | null,
): Promise<string> {
  await mkdir(auditDirectory, { recursive: true });
  const reportPath = resolve(auditDirectory, `import-result-${preflight.batchId}.json`);
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        batchId: preflight.batchId,
        timestamps: { startedAt, completedAt: new Date().toISOString() },
        result,
        productIds: created.products,
        variantIds: created.variants,
        imageIds: created.images,
        storageKeys: created.storageKeys,
        counts: {
          products: created.products.length,
          variants: created.variants.length,
          images: created.images.length,
          storageKeys: created.storageKeys.length,
        },
        blockers: preflight.blockers,
        error,
        cleanupError: cleanupError ?? null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return reportPath;
}

async function execute(preflight: Preflight): Promise<void> {
  const startedAt = new Date().toISOString();
  const emptyCreated: CreatedRecords = { products: [], variants: [], images: [], storageKeys: [] };
  if (preflight.blockers.length > 0 || !preflight.storage.client) {
    const reportPath = await writeAuditReport(preflight, startedAt, "BLOCKED", emptyCreated);
    console.log(`EXECUTE_RESULT: BLOCKED`);
    console.log(`AUDIT_REPORT: ${reportPath}`);
    return;
  }

  const uploadedKeys = new Map<string, string>();
  let cleanupError: string | null = null;
  try {
    for (const upload of preflight.uploads) {
      const content = new Blob([await readFile(upload.absoluteSourcePath)], {
        type: contentTypeFor(upload.originalFilename),
      });
      const { error } = await preflight.storage.client.storage
        .from(productImagesBucket)
        .upload(upload.storageKey, content, { upsert: false, contentType: content.type });
      if (error) throw new Error(`Storage upload failed for ${upload.sourcePath}: ${sanitizeError(error)}`);
      uploadedKeys.set(upload.sourcePath, upload.storageKey);
    }
    if (uploadedKeys.size !== expectedCounts.images) {
      throw new Error(`Storage upload count ${uploadedKeys.size} does not equal ${expectedCounts.images}.`);
    }

    const created = await createDatabaseRecords(preflight, uploadedKeys);
    const reportPath = await writeAuditReport(preflight, startedAt, "SUCCESS", created);
    console.log("EXECUTE_RESULT: SUCCESS");
    console.log(`AUDIT_REPORT: ${reportPath}`);
  } catch (error) {
    cleanupError = await cleanupBatch(preflight.storage.client, [...uploadedKeys.values()]);
    const failure = sanitizeError(error);
    const failedCreated: CreatedRecords = {
      products: [],
      variants: [],
      images: [],
      storageKeys: [...uploadedKeys.values()],
    };
    const reportPath = await writeAuditReport(
      preflight,
      startedAt,
      "FAILED",
      failedCreated,
      failure,
      cleanupError,
    );
    console.error(`EXECUTE_RESULT: FAILED - ${failure}`);
    if (cleanupError) console.error(`STORAGE_CLEANUP_ERROR: ${cleanupError}`);
    console.error(`AUDIT_REPORT: ${reportPath}`);
    process.exitCode = 1;
  }
}

async function closeDatabasePool(preflight: Preflight | undefined): Promise<void> {
  if (!preflight?.database.pool) return;
  try {
    await preflight.database.pool.end();
  } catch (error) {
    console.error(`POSTGRESQL_POOL_CLOSE_ERROR: ${sanitizeError(error)}`);
  }
}

async function main(): Promise<void> {
  const mode = parseMode();
  let preflight: Preflight | undefined;
  try {
    preflight = await buildPreflight(mode);
    printPreflight(preflight);
    if (mode === "dry-run") {
      console.log(`DRY_RUN_RESULT: ${preflight.blockers.length === 0 ? "PASS" : "BLOCKED"}`);
      console.log("POSTGRESQL_WRITES: 0");
      console.log("STORAGE_UPLOADS: 0");
      console.log("STORAGE_DELETES: 0");
      console.log("PRODUCTOS_CREADOS: 0");
      if (preflight.blockers.length > 0) process.exitCode = 1;
      return;
    }

    await execute(preflight);
  } finally {
    await closeDatabasePool(preflight);
  }
}

void main().catch((error) => {
  console.error(`IMPORTER_FATAL_ERROR: ${sanitizeError(error)}`);
  console.error("DRY_RUN_RESULT: BLOCKED");
  process.exitCode = 1;
});
