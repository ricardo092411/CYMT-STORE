import type { Product, ProductVariant } from "@/data/catalog";

/**
 * Colores comerciales frecuentes usados únicamente para detectar datos que
 * necesitan revisión humana. No representa un vocabulario de colores válido
 * para guardar productos.
 */
const COMMERCIAL_COLOR_WORDS = new Set([
  "negro",
  "blanco",
  "azul",
  "rojo",
  "verde",
  "amarillo",
  "ocre",
  "beige",
  "gris",
  "morado",
  "violeta",
  "rosa",
  "rosado",
  "naranja",
  "cafe",
  "marron",
  "crema",
  "celeste",
  "turquesa",
  "vinotinto",
]);

function normalizeColorWord(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Returns distinct base color words, ignoring legitimate tone words. */
export function getIndependentColorWords(colorName: string | null): string[] {
  if (!colorName) return [];

  const words = normalizeColorWord(colorName).match(/[a-z]+/g) ?? [];
  return [...new Set(words.filter((word) => COMMERCIAL_COLOR_WORDS.has(word)))];
}

export function hasCompositeColorName(colorName: string | null): boolean {
  return getIndependentColorWords(colorName).length >= 2;
}

export function isSuspiciousVariant(
  variant: Pick<ProductVariant, "colorName" | "colorStatus">,
): boolean {
  return variant.colorStatus === "requires_user_input" || hasCompositeColorName(variant.colorName);
}

export function getSuspiciousVariants(product: Product): ProductVariant[] {
  return (product.productVariants ?? []).filter(isSuspiciousVariant);
}
