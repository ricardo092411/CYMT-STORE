import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { hasCompositeColorName } from "../src/lib/suspicious-variants";

type ImportMode = "dry-run" | "execute";
type ProductReference = { candidateId: string; storageSlug: string };
type ImportCounts = { products: number; variants: number; images: number };

type CliOptions = {
  mode: ImportMode;
  packagePath: string;
  sourceRoot: string;
  auditDirectory: string;
  approvalToken?: string;
};

type ImagePlan = {
  sourcePath: string;
  originalSourcePath: string;
  originalFilename: string;
  sha256: string;
  position: number;
  isCover: boolean;
  variantPosition: number;
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
  cli: CliOptions;
  mode: ImportMode;
  packageSha256: string | null;
  batchId: string;
  batchPrefix: string;
  candidateProducts: ProductPlan[];
  variants: VariantPlan[];
  images: ImagePlan[];
  sourceImages: SourceImageCheck[];
  uploads: UploadPlan[];
  expectedCounts: ImportCounts;
  packageCounts: ImportCounts;
  hashesValid: number;
  imageSignaturesValid: number;
  missingFiles: string[];
  hashMismatches: string[];
  imageSignatureMismatches: string[];
  resolvedSourcePaths: Map<string, string>;
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
const productImagesBucket = "product-images";
const maximumRecordsPerKind = 100_000;

dotenv.config({ path: resolve(projectRoot, ".env.local"), quiet: true });
dotenv.config({ path: resolve(projectRoot, ".env"), quiet: true });

function usage(): string {
  return [
    "Usage:",
    "  npm run import:product-library -- --dry-run --package <package.json> [--source-root <directory>] [--audit-dir <directory>]",
    "  npm run import:product-library -- --execute --package <package.json> --approval-token <sha256> [--source-root <directory>] [--audit-dir <directory>]",
  ].join("\n");
}

function resolveCliPath(value: string): string {
  return resolve(isAbsolute(value) ? value : resolve(projectRoot, value));
}

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  let mode: ImportMode | undefined;
  let packageValue: string | undefined;
  let sourceRootValue: string | undefined;
  let auditDirectoryValue: string | undefined;
  let approvalToken: string | undefined;

  const requireValue = (flag: string, index: number): string => {
    const value = args[index + 1];
    if (!value || value.startsWith("--") || value.trim().length === 0) {
      throw new Error(`${flag} requires a non-empty value.\n${usage()}`);
    }
    return value;
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run" || argument === "--execute") {
      const requestedMode: ImportMode = argument === "--dry-run" ? "dry-run" : "execute";
      if (mode) throw new Error(`Specify exactly one mode.\n${usage()}`);
      mode = requestedMode;
      continue;
    }

    if (argument === "--package" || argument === "--source-root" || argument === "--audit-dir" || argument === "--approval-token") {
      const value = requireValue(argument, index);
      index += 1;
      if (argument === "--package") {
        if (packageValue !== undefined) throw new Error(`--package may be specified only once.\n${usage()}`);
        packageValue = value;
      } else if (argument === "--source-root") {
        if (sourceRootValue !== undefined) throw new Error(`--source-root may be specified only once.\n${usage()}`);
        sourceRootValue = value;
      } else if (argument === "--audit-dir") {
        if (auditDirectoryValue !== undefined) throw new Error(`--audit-dir may be specified only once.\n${usage()}`);
        auditDirectoryValue = value;
      } else {
        if (approvalToken !== undefined) throw new Error(`--approval-token may be specified only once.\n${usage()}`);
        approvalToken = value;
      }
      continue;
    }

    throw new Error(`Unknown argument: ${argument}.\n${usage()}`);
  }

  if (!mode || !packageValue) throw new Error(`Both a mode and --package are required.\n${usage()}`);
  if (mode === "dry-run" && approvalToken !== undefined) {
    throw new Error(`--approval-token is accepted only with --execute.\n${usage()}`);
  }
  if (mode === "execute") {
    if (!approvalToken) throw new Error(`--execute requires --approval-token from a passing dry-run.\n${usage()}`);
    if (!/^[a-f0-9]{64}$/.test(approvalToken)) {
      throw new Error(`--approval-token must be an exact lowercase SHA-256 digest.\n${usage()}`);
    }
  }

  return {
    mode,
    packagePath: resolveCliPath(packageValue),
    sourceRoot: resolveCliPath(sourceRootValue ?? projectRoot),
    auditDirectory: resolveCliPath(auditDirectoryValue ?? resolve(projectRoot, "import-results")),
    approvalToken,
  };
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

function normalizedProductNameTypeKey(name: unknown, type: unknown): string {
  return `${normalizedText(name)}\u0000${normalizedText(type)}`;
}

function uniqueDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

function isSafeStorageSegment(value: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value) &&
    !value.includes("..") &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isSafeRelativeSourcePath(value: string): boolean {
  if (
    value.length === 0 ||
    isAbsolute(value) ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.includes(":")
  ) {
    return false;
  }

  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function pathIsStrictlyWithinRoot(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return (
    pathFromRoot.length > 0 &&
    !isAbsolute(pathFromRoot) &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith("..\\") &&
    !pathFromRoot.startsWith("../")
  );
}

function resolveSourcePath(sourceRoot: string, sourcePath: string): string | null {
  if (!isSafeRelativeSourcePath(sourcePath)) return null;
  const resolvedPath = resolve(sourceRoot, sourcePath);
  return pathIsStrictlyWithinRoot(sourceRoot, resolvedPath) ? resolvedPath : null;
}

function supportedImageExtension(filename: string): "jpeg" | "png" | "webp" | null {
  switch (extname(filename).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "jpeg";
    case ".png":
      return "png";
    case ".webp":
      return "webp";
    default:
      return null;
  }
}

function detectImageSignature(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
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

function makeEmptyPreflight(cli: CliOptions): Preflight {
  const batchId = createBatchId();
  return {
    cli,
    mode: cli.mode,
    packageSha256: null,
    batchId,
    batchPrefix: `imports/${batchId}`,
    candidateProducts: [],
    variants: [],
    images: [],
    sourceImages: [],
    uploads: [],
    expectedCounts: { products: 0, variants: 0, images: 0 },
    packageCounts: { products: 0, variants: 0, images: 0 },
    hashesValid: 0,
    imageSignaturesValid: 0,
    missingFiles: [],
    hashMismatches: [],
    imageSignatureMismatches: [],
    resolvedSourcePaths: new Map(),
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
  const originalImageType = supportedImageExtension(originalFilename);
  if (!originalImageType) {
    addBlocker(preflight, `${label}.originalFilename must use .jpg, .jpeg, .png, or .webp.`);
  }
  if (extname(sourcePath).toLowerCase() !== extname(originalFilename).toLowerCase()) {
    addBlocker(preflight, `${label}.sourcePath extension must match originalFilename.`);
  }
  if (sourcePath !== originalSourcePath) {
    addBlocker(preflight, `${label} sourcePath and originalSourcePath must match exactly.`);
  }
  if (!isSafeRelativeSourcePath(sourcePath)) {
    addBlocker(preflight, `${label}.sourcePath must be a safe relative path with forward slashes inside --source-root.`);
  }

  preflight.sourceImages.push({ sourcePath, sha256: sha256.toLowerCase(), label });

  return {
    sourcePath,
    originalSourcePath,
    originalFilename,
    sha256: sha256.toLowerCase(),
    position,
    isCover,
    variantPosition: 0,
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
    images: images.map((image) => ({ ...image, variantPosition: position })),
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
  if (!isSafeStorageSegment(candidateId)) {
    addBlocker(preflight, `${label}.candidateId is not safe for an isolated Storage key.`);
  }
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

function validateCount(
  preflight: Preflight,
  value: unknown,
  label: string,
  expected: number,
): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > maximumRecordsPerKind
  ) {
    addBlocker(preflight, `${label} must be a non-negative integer no greater than ${maximumRecordsPerKind}.`);
    return;
  }
  if (value !== expected) addBlocker(preflight, `${label} must equal the detected count ${expected}.`);
}

function validatePackageMetadata(
  preflight: Preflight,
  root: Record<string, unknown>,
  actualCounts: ImportCounts,
): void {
  if (root.packageVersion !== "3") {
    addBlocker(preflight, "Package packageVersion must be 3.");
  }
  if (root.readyForDryRun !== true) {
    addBlocker(preflight, "Package readyForDryRun must be true.");
  }
  if (
    root.pendingExistingGroupAssociations !== undefined &&
    (!Array.isArray(root.pendingExistingGroupAssociations) || root.pendingExistingGroupAssociations.length !== 0)
  ) {
    addBlocker(preflight, "Package pendingExistingGroupAssociations must be an empty array.");
  }

  let materializedAssociationCount: number | null = null;
  if (root.associationReconciliation !== undefined) {
    if (!isRecord(root.associationReconciliation)) {
      addBlocker(preflight, "Package associationReconciliation must be an object when supplied.");
    } else {
      const reconciliation = root.associationReconciliation;
      const fields = [
        "associationsTotal",
        "associationsResolvedIntoExistingProducts",
        "associationsMaterializedAsNewProducts",
        "associationsBlocked",
      ] as const;
      const values = fields.map((field) => {
        const value = requiredNonNegativeInteger(preflight, reconciliation[field], `Package associationReconciliation.${field}`);
        return value;
      });
      const [total, resolved, materialized, blocked] = values;
      materializedAssociationCount = materialized;
      if (total !== null && resolved !== null && materialized !== null && blocked !== null) {
        if (total !== resolved + materialized + blocked) {
          addBlocker(preflight, "Package associationReconciliation totals are not mathematically coherent.");
        }
        if (blocked !== 0) {
          addBlocker(preflight, "Package associationReconciliation.associationsBlocked must be 0 for this insert-only importer.");
        }
      }
    }
  }
  if (root.newProductMaterializations !== undefined) {
    if (!Array.isArray(root.newProductMaterializations)) {
      addBlocker(preflight, "Package newProductMaterializations must be an array when supplied.");
    } else if (
      materializedAssociationCount !== null &&
      root.newProductMaterializations.length !== materializedAssociationCount
    ) {
      addBlocker(preflight, "Package newProductMaterializations length must match associationReconciliation.associationsMaterializedAsNewProducts.");
    }
  }

  if (!isRecord(root.validation)) {
    addBlocker(preflight, "Package validation summary is missing.");
    return;
  }

  const validation = root.validation;
  if (validation.counts !== undefined) {
    if (!isRecord(validation.counts)) {
      addBlocker(preflight, "Package validation.counts must be an object when supplied.");
    } else {
      const counts = validation.counts;
      for (const [field, expectedValue] of Object.entries(actualCounts) as Array<[keyof ImportCounts, number]>) {
        validateCount(preflight, counts[field], `Package validation.counts.${field}`, expectedValue);
      }
      for (const field of ["expectedSourcePaths", "matchingHashes"] as const) {
        if (counts[field] !== undefined) {
          validateCount(preflight, counts[field], `Package validation.counts.${field}`, actualCounts.images);
        }
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

function packageImageFieldValues(products: unknown[], field: "sourcePath" | "sha256"): string[] {
  return products.flatMap((product) =>
    isRecord(product)
      ? toArray(product.variants).flatMap((variant) =>
        isRecord(variant)
          ? toArray(variant.images).flatMap((image) => isRecord(image) && typeof image[field] === "string" ? [image[field]] : [])
          : [],
      )
      : [],
  );
}

async function readAndValidatePackage(preflight: Preflight): Promise<void> {
  let parsed: unknown;
  try {
    const rawPackage = await readFile(preflight.cli.packagePath);
    preflight.packageSha256 = createHash("sha256").update(rawPackage).digest("hex");
    parsed = JSON.parse(rawPackage.toString("utf8")) as unknown;
  } catch (error) {
    addBlocker(preflight, `Unable to read approved package: ${sanitizeError(error)}`);
    return;
  }

  if (preflight.mode === "execute" && preflight.cli.approvalToken !== preflight.packageSha256) {
    addBlocker(preflight, "Approval token does not match the SHA-256 of the supplied package; execute is blocked before writes.");
  }

  if (!isRecord(parsed)) {
    addBlocker(preflight, "Approved package root must be an object.");
    return;
  }

  const rawProducts = toArray(parsed.products);
  if (!Array.isArray(parsed.products)) addBlocker(preflight, "Package products must be an array.");

  preflight.packageCounts = countPackageRecords(rawProducts);
  preflight.expectedCounts = { ...preflight.packageCounts };
  for (const [field, value] of Object.entries(preflight.packageCounts) as Array<[keyof ImportCounts, number]>) {
    if (value <= 0 || value > maximumRecordsPerKind) {
      addBlocker(preflight, `Detected ${field} count ${value} must be between 1 and ${maximumRecordsPerKind}.`);
    }
  }
  validatePackageMetadata(preflight, parsed, preflight.packageCounts);

  preflight.candidateProducts = rawProducts
    .map((product, index) => validateCandidateProduct(preflight, product, index))
    .filter((product): product is ProductPlan => product !== null);
  preflight.variants = preflight.candidateProducts.flatMap((product) => product.variants);
  preflight.images = preflight.variants.flatMap((variant) => variant.images);

  const duplicateNameTypeKeys = uniqueDuplicates(
    preflight.candidateProducts.map((product) => normalizedProductNameTypeKey(product.name, product.type)),
  );
  if (duplicateNameTypeKeys.length > 0) {
    addBlocker(
      preflight,
      `Package contains duplicate normalized name/type candidates: ${duplicateNameTypeKeys.map((key) => key.replace("\u0000", " / ")).join(", ")}.`,
    );
  }
  const duplicateCandidateIds = uniqueDuplicates(
    rawProducts.flatMap((product) => isRecord(product) && typeof product.candidateId === "string" ? [product.candidateId] : []),
  );
  if (duplicateCandidateIds.length > 0) {
    addBlocker(preflight, `Package contains duplicate candidateIds: ${duplicateCandidateIds.join(", ")}.`);
  }
  const duplicateSlugs = uniqueDuplicates(
    rawProducts.flatMap((product) => isRecord(product) && typeof product.suggestedSlug === "string" ? [product.suggestedSlug] : []),
  );
  if (duplicateSlugs.length > 0) {
    addBlocker(preflight, `Package contains duplicate candidate slugs: ${duplicateSlugs.join(", ")}.`);
  }
  const duplicateSourcePaths = uniqueDuplicates(packageImageFieldValues(rawProducts, "sourcePath"));
  if (duplicateSourcePaths.length > 0) {
    addBlocker(preflight, `Package contains duplicate sourcePaths: ${duplicateSourcePaths.join(", ")}.`);
  }
  const duplicateHashes = uniqueDuplicates(packageImageFieldValues(rawProducts, "sha256").map((hash) => hash.toLowerCase()));
  if (duplicateHashes.length > 0) {
    addBlocker(preflight, `Package contains duplicate SHA-256 values: ${duplicateHashes.join(", ")}.`);
  }

  if (preflight.candidateProducts.length !== preflight.expectedCounts.products) {
    addBlocker(
      preflight,
      `Validated product candidates total ${preflight.candidateProducts.length}; expected ${preflight.expectedCounts.products}.`,
    );
  }
  if (preflight.variants.length !== preflight.expectedCounts.variants) {
    addBlocker(preflight, `Validated variants total ${preflight.variants.length}; expected ${preflight.expectedCounts.variants}.`);
  }
  if (preflight.images.length !== preflight.expectedCounts.images) {
    addBlocker(preflight, `Validated images total ${preflight.images.length}; expected ${preflight.expectedCounts.images}.`);
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
  let resolvedSourceRoot: string;
  try {
    const sourceRootStatus = await stat(preflight.cli.sourceRoot);
    if (!sourceRootStatus.isDirectory()) {
      addBlocker(preflight, `SOURCE_ROOT is not a directory: ${preflight.cli.sourceRoot}`);
      return;
    }
    resolvedSourceRoot = await realpath(preflight.cli.sourceRoot);
  } catch (error) {
    addBlocker(preflight, `Unable to read SOURCE_ROOT: ${sanitizeError(error)}`);
    return;
  }

  await mapWithConcurrency(preflight.sourceImages, 8, async (image) => {
    const absoluteSourcePath = resolveSourcePath(preflight.cli.sourceRoot, image.sourcePath);
    if (!absoluteSourcePath) {
      addBlocker(preflight, `${image.label}.sourcePath escapes --source-root or is not a safe relative path.`);
      return;
    }

    try {
      await access(absoluteSourcePath);
    } catch {
      preflight.missingFiles.push(image.sourcePath);
      return;
    }

    let canonicalSourcePath: string;
    try {
      canonicalSourcePath = await realpath(absoluteSourcePath);
    } catch {
      preflight.missingFiles.push(image.sourcePath);
      return;
    }
    if (!pathIsStrictlyWithinRoot(resolvedSourceRoot, canonicalSourcePath)) {
      addBlocker(preflight, `${image.label}.sourcePath resolves outside --source-root through a link or path escape.`);
      return;
    }

    const contents = await readFile(canonicalSourcePath);
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== image.sha256) {
      preflight.hashMismatches.push(image.sourcePath);
      return;
    }
    preflight.hashesValid += 1;

    const expectedImageType = supportedImageExtension(image.sourcePath);
    const actualImageType = detectImageSignature(contents);
    if (!expectedImageType || expectedImageType !== actualImageType) {
      preflight.imageSignatureMismatches.push(image.sourcePath);
      return;
    }
    preflight.imageSignaturesValid += 1;
    preflight.resolvedSourcePaths.set(image.sourcePath, canonicalSourcePath);
  });

  if (preflight.missingFiles.length > 0) {
    addBlocker(preflight, `${preflight.missingFiles.length} approved source files are missing.`);
  }
  if (preflight.hashMismatches.length > 0) {
    addBlocker(preflight, `${preflight.hashMismatches.length} approved source hashes do not match.`);
  }
  if (preflight.imageSignatureMismatches.length > 0) {
    addBlocker(preflight, `${preflight.imageSignatureMismatches.length} source files have an unsupported or mismatched image signature.`);
  }
  if (preflight.hashesValid !== preflight.expectedCounts.images) {
    addBlocker(
      preflight,
      `Verified ${preflight.hashesValid}/${preflight.expectedCounts.images} source hashes; all hashes must match.`,
    );
  }
  if (preflight.imageSignaturesValid !== preflight.expectedCounts.images) {
    addBlocker(
      preflight,
      `Verified ${preflight.imageSignaturesValid}/${preflight.expectedCounts.images} image signatures; all files must be JPEG, PNG, or WebP with matching extensions.`,
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
      preflight.candidateProducts.map((product) => normalizedProductNameTypeKey(product.name, product.type)),
    );
    const candidateNames = [...new Set(preflight.candidateProducts.map((product) => normalizedText(product.name)))];
    const [slugResult, nameResult] = await Promise.all([
      pool.query<ExistingProductRow>(
        `SELECT id, slug, name, type FROM products WHERE slug = ANY($1::text[])`,
        [slugs],
      ),
      pool.query<ExistingProductRow>(
        `SELECT id, slug, name, type FROM products WHERE lower(btrim(name)) = ANY($1::text[])`,
        [candidateNames],
      ),
    ]);
    preflight.database.existingSlugConflicts = slugResult.rows;
    preflight.database.potentialProductConflicts = nameResult.rows.filter((product) =>
      candidateNameTypes.has(normalizedProductNameTypeKey(product.name, product.type)),
    );

    if (preflight.database.existingSlugConflicts.length > 0) {
      addBlocker(
        preflight,
        `PostgreSQL already contains package slugs: ${preflight.database.existingSlugConflicts.map((product) => product.slug).join(", ")}.`,
      );
    }
    if (preflight.database.potentialProductConflicts.length > 0) {
      addBlocker(
        preflight,
        `PostgreSQL already contains normalized name/type matches: ${preflight.database.potentialProductConflicts.map((product) => product.slug).join(", ")}.`,
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
    const absoluteSourcePath = preflight.resolvedSourcePaths.get(image.sourcePath);
    if (!absoluteSourcePath) {
      addBlocker(preflight, `${image.label} has no verified source file for a Storage upload.`);
      continue;
    }
    const storageKey = `${preflight.batchPrefix}/${image.productReference.storageSlug}/c-${image.productReference.candidateId}/v-${image.variantPosition}/i-${image.position}-${image.sha256.slice(0, 16)}${extension}`;
    if (!storagePathIsSafe(storageKey)) {
      addBlocker(preflight, `${image.label} would generate an unsafe Storage key.`);
      continue;
    }
    uploads.push({
      ...image,
      absoluteSourcePath,
      storageKey,
    });
  }
  preflight.uploads = uploads;

  const duplicateKeys = uniqueDuplicates(uploads.map((upload) => upload.storageKey));
  if (duplicateKeys.length > 0) {
    addBlocker(preflight, `Planned Storage keys collide: ${duplicateKeys.join(", ")}.`);
  }
  if (uploads.length !== preflight.expectedCounts.images) {
    addBlocker(
      preflight,
      `Only ${uploads.length}/${preflight.expectedCounts.images} Storage destinations can be planned; every image needs one resolved product destination.`,
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

async function buildPreflight(cli: CliOptions): Promise<Preflight> {
  const preflight = makeEmptyPreflight(cli);
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
  console.log(`IMPORT_PACKAGE: ${preflight.cli.packagePath}`);
  console.log(`PACKAGE_SHA256: ${preflight.packageSha256 ?? "unavailable"}`);
  console.log(`SOURCE_ROOT: ${preflight.cli.sourceRoot}`);
  console.log(`MODE: ${preflight.mode}`);
  console.log(`BATCH_PREFIX: ${preflight.batchPrefix}`);
  console.log(`PRODUCTS: expected ${preflight.expectedCounts.products}; detected ${preflight.packageCounts.products}; validated ${preflight.candidateProducts.length}`);
  console.log(`VARIANTS: expected ${preflight.expectedCounts.variants}; detected ${preflight.packageCounts.variants}; validated ${preflight.variants.length}`);
  console.log(`IMAGES: expected ${preflight.expectedCounts.images}; detected ${preflight.packageCounts.images}; validated ${preflight.images.length}`);
  console.log(`HASHES_VALID: ${preflight.hashesValid}/${preflight.expectedCounts.images}`);
  console.log(`IMAGE_SIGNATURES_VALID: ${preflight.imageSignaturesValid}/${preflight.expectedCounts.images}`);
  console.log(`FILES_MISSING: ${preflight.missingFiles.length}`);
  console.log(`HASH_MISMATCHES: ${preflight.hashMismatches.length}`);
  console.log(`IMAGE_SIGNATURE_MISMATCHES: ${preflight.imageSignatureMismatches.length}`);
  console.log(`POSTGRESQL_SLUG_CONFLICTS: ${displayList(preflight.database.existingSlugConflicts.map((product) => product.slug))}`);
  console.log(`POSTGRESQL_PRODUCT_CONFLICTS: ${displayList(preflight.database.potentialProductConflicts.map((product) => product.slug))}`);
  console.log(`POSTGRESQL_SCHEMA_PROBLEMS: ${displayList(preflight.database.schemaProblems)}`);
  console.log(`SUPABASE_SECRET_KEY: ${preflight.storage.secretKeyStatus}`);
  console.log(`PRODUCT_IMAGES_STATUS: ${preflight.storage.productImagesStatus}`);
  console.log(`STORAGE_STATUS: ${preflight.storage.status} - ${preflight.storage.detail}`);
  console.log(`POSTGRESQL_OPERATIONS_PLANNED: INSERT products=${preflight.expectedCounts.products}, product_variants=${preflight.expectedCounts.variants}, product_images=${preflight.expectedCounts.images} in one transaction after all uploads.`);
  console.log(`STORAGE_UPLOADS_PLANNED: ${preflight.uploads.length}/${preflight.expectedCounts.images} to ${preflight.batchPrefix}`);
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

async function cleanupBatch(
  client: SupabaseClient,
  batchPrefix: string,
  storageKeys: string[],
): Promise<string | null> {
  if (storageKeys.length === 0) return null;
  if (storageKeys.some((storageKey) => !storageKey.startsWith(`${batchPrefix}/`))) {
    return "Refusing Storage cleanup because a key is outside the current batch prefix.";
  }
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
    default:
      return "application/octet-stream";
  }
}

async function readAndVerifyUploadContent(upload: UploadPlan): Promise<Blob> {
  const contents = await readFile(upload.absoluteSourcePath);
  const actualHash = createHash("sha256").update(contents).digest("hex");
  if (actualHash !== upload.sha256) {
    throw new Error(`Source SHA-256 changed after preflight for ${upload.sourcePath}.`);
  }

  const expectedImageType = supportedImageExtension(upload.originalFilename);
  const actualImageType = detectImageSignature(contents);
  if (!expectedImageType || actualImageType !== expectedImageType) {
    throw new Error(`Source image signature changed or no longer matches ${upload.originalFilename}.`);
  }

  return new Blob([contents], { type: contentTypeFor(upload.originalFilename) });
}

async function createDatabaseRecords(preflight: Preflight, uploadedKeys: Map<string, string>): Promise<CreatedRecords> {
  const { db } = await import("../src/db");
  const { products, productVariants, productImages } = await import("../src/db/schema");
  const { inArray, sql } = await import("drizzle-orm");
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

    const candidateNameTypes = new Set(
      preflight.candidateProducts.map((product) => normalizedProductNameTypeKey(product.name, product.type)),
    );
    const candidateNames = [...new Set(preflight.candidateProducts.map((product) => normalizedText(product.name)))];
    const nameConflicts = await tx
      .select({ slug: products.slug, name: products.name, type: products.type })
      .from(products)
      .where(inArray(sql<string>`lower(btrim(${products.name}))`, candidateNames));
    const normalizedNameTypeConflicts = nameConflicts.filter((product) =>
      candidateNameTypes.has(normalizedProductNameTypeKey(product.name, product.type)),
    );
    if (normalizedNameTypeConflicts.length > 0) {
      throw new Error(
        `Concurrent normalized name/type conflict: ${normalizedNameTypeConflicts.map((product) => product.slug).join(", ")}`,
      );
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
  await mkdir(preflight.cli.auditDirectory, { recursive: true });
  const reportPath = resolve(preflight.cli.auditDirectory, `import-result-${preflight.batchId}.json`);
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        packagePath: preflight.cli.packagePath,
        packageSha256: preflight.packageSha256,
        sourceRoot: preflight.cli.sourceRoot,
        batchId: preflight.batchId,
        batchPrefix: preflight.batchPrefix,
        timestamps: { startedAt, completedAt: new Date().toISOString() },
        mode: preflight.mode,
        result,
        productIds: created.products,
        variantIds: created.variants,
        imageIds: created.images,
        storageKeys: created.storageKeys,
        counts: {
          expected: preflight.expectedCounts,
          detected: preflight.packageCounts,
          validated: {
            products: preflight.candidateProducts.length,
            variants: preflight.variants.length,
            images: preflight.images.length,
            hashes: preflight.hashesValid,
            imageSignatures: preflight.imageSignaturesValid,
          },
          created: {
            products: created.products.length,
            variants: created.variants.length,
            images: created.images.length,
            storageKeys: created.storageKeys.length,
          },
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

async function tryWriteAuditReport(
  preflight: Preflight,
  startedAt: string,
  result: "SUCCESS" | "BLOCKED" | "FAILED",
  created: CreatedRecords,
  error?: string,
  cleanupError?: string | null,
): Promise<{ reportPath: string | null; auditError: string | null }> {
  try {
    return {
      reportPath: await writeAuditReport(preflight, startedAt, result, created, error, cleanupError),
      auditError: null,
    };
  } catch (auditError) {
    return { reportPath: null, auditError: sanitizeError(auditError) };
  }
}

async function execute(preflight: Preflight): Promise<void> {
  const startedAt = new Date().toISOString();
  const emptyCreated: CreatedRecords = { products: [], variants: [], images: [], storageKeys: [] };
  if (preflight.blockers.length > 0 || !preflight.storage.client) {
    const audit = await tryWriteAuditReport(preflight, startedAt, "BLOCKED", emptyCreated);
    console.log(`EXECUTE_RESULT: BLOCKED`);
    if (audit.reportPath) console.log(`AUDIT_REPORT: ${audit.reportPath}`);
    if (audit.auditError) console.error(`AUDIT_REPORT_ERROR: ${audit.auditError}`);
    process.exitCode = 1;
    return;
  }

  const uploadedKeys = new Map<string, string>();
  let created = emptyCreated;
  try {
    for (const upload of preflight.uploads) {
      const content = await readAndVerifyUploadContent(upload);
      const { error } = await preflight.storage.client.storage
        .from(productImagesBucket)
        .upload(upload.storageKey, content, { upsert: false, contentType: content.type });
      if (error) throw new Error(`Storage upload failed for ${upload.sourcePath}: ${sanitizeError(error)}`);
      uploadedKeys.set(upload.sourcePath, upload.storageKey);
    }
    if (uploadedKeys.size !== preflight.expectedCounts.images) {
      throw new Error(`Storage upload count ${uploadedKeys.size} does not equal ${preflight.expectedCounts.images}.`);
    }

    created = await createDatabaseRecords(preflight, uploadedKeys);
  } catch (error) {
    const cleanupError = await cleanupBatch(
      preflight.storage.client,
      preflight.batchPrefix,
      [...uploadedKeys.values()],
    );
    const failure = sanitizeError(error);
    const failedCreated: CreatedRecords = {
      products: [],
      variants: [],
      images: [],
      storageKeys: [...uploadedKeys.values()],
    };
    const audit = await tryWriteAuditReport(
      preflight,
      startedAt,
      "FAILED",
      failedCreated,
      failure,
      cleanupError,
    );
    console.error(`EXECUTE_RESULT: FAILED - ${failure}`);
    if (cleanupError) console.error(`STORAGE_CLEANUP_ERROR: ${cleanupError}`);
    if (audit.reportPath) console.error(`AUDIT_REPORT: ${audit.reportPath}`);
    if (audit.auditError) console.error(`AUDIT_REPORT_ERROR: ${audit.auditError}`);
    process.exitCode = 1;
    return;
  }

  const audit = await tryWriteAuditReport(preflight, startedAt, "SUCCESS", created);
  if (audit.auditError) {
    console.error(`EXECUTE_RESULT: SUCCESS_WITH_AUDIT_ERROR - ${audit.auditError}`);
    console.error("Storage objects and PostgreSQL records remain intact because the transaction already committed.");
    process.exitCode = 1;
    return;
  }
  console.log("EXECUTE_RESULT: SUCCESS");
  console.log(`AUDIT_REPORT: ${audit.reportPath}`);
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
  const cli = parseCli();
  let preflight: Preflight | undefined;
  try {
    preflight = await buildPreflight(cli);
    printPreflight(preflight);
    if (cli.mode === "dry-run") {
      console.log(`DRY_RUN_RESULT: ${preflight.blockers.length === 0 ? "PASS" : "BLOCKED"}`);
      console.log("POSTGRESQL_WRITES: 0");
      console.log("STORAGE_UPLOADS: 0");
      console.log("STORAGE_DELETES: 0");
      console.log("PRODUCTOS_CREADOS: 0");
      if (preflight.blockers.length > 0) {
        process.exitCode = 1;
      } else if (preflight.packageSha256) {
        console.log(`APPROVAL_TOKEN: ${preflight.packageSha256}`);
      }
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
