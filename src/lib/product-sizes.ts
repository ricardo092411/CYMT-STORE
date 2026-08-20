/** Tallas estándar históricas del storefront para prendas sin tallas explícitas. */
export const APPAREL_SIZES: string[] = ["S", "M", "L", "XL", "XXL"];

/**
 * Conserva las tallas explícitas de un producto cuando existen. El fallback
 * es solo de presentación y no modifica datos persistidos.
 */
export function getAvailableProductSizes(
  sizes: readonly string[] | null | undefined,
): readonly string[] {
  const usableSizes = sizes
    ?.map((size) => size.trim())
    .filter((size) => size.length > 0);

  return usableSizes && usableSizes.length > 0 ? usableSizes : APPAREL_SIZES;
}
