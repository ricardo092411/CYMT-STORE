"use client";

import { useMemo } from "react";
import { ProductShowcase } from "@/components/home/product-showcase";
import { useLiveProducts } from "@/providers/editor-provider";

/**
 * Secciones de productos del home alimentadas por el catálogo vivo.
 * Sin límite artificial: refleja productos base + creados en el editor.
 */
export function HomeProductSections() {
  const products = useLiveProducts();

  const featured = useMemo(
    () => products.filter((p) => p.featured),
    [products],
  );

  const bestSellers = useMemo(
    () => products.filter((p) => p.bestSeller),
    [products],
  );

  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8),
    [products],
  );

  return (
    <>
      <ProductShowcase
        eyebrow="Selección"
        title="Destacados"
        description="Las piezas que definen el lenguaje de CYMT. Calidad premium bajo pedido."
        products={featured}
        priorityCount={4}
      />

      <ProductShowcase
        eyebrow="Recién llegado"
        title="Nuevos lanzamientos"
        products={newArrivals}
        viewAllLabel="Ver tienda"
      />

      <ProductShowcase
        eyebrow="Los favoritos"
        title="Lo más vendido"
        products={bestSellers}
        viewAllHref="/tienda"
      />
    </>
  );
}
