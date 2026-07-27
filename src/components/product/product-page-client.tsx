"use client";

import Link from "next/link";
import { ProductDetail } from "@/components/product/product-detail";
import { useEditor } from "@/providers/editor-provider";
import { Container, buttonVariants } from "@/components/ui";
import type { Product } from "@/data/catalog";

/**
 * Resuelve el producto desde el catálogo vivo (base + creados en editor).
 * Así los productos dinámicos de cada colección también tienen ficha.
 */
export function ProductPageClient({
  slug,
  seed,
}: {
  slug: string;
  seed?: Product | null;
}) {
  const { getLiveProduct, productsByDropLive, hydrated } = useEditor();

  if (!hydrated) {
    return (
      <Container className="py-24">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
      </Container>
    );
  }

  const product = getLiveProduct(slug) ?? seed ?? null;

  if (!product) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Producto no encontrado</h1>
          <p className="mt-2 text-ink-muted">
            Este producto no existe o fue eliminado del catálogo.
          </p>
          <Link href="/tienda" className={`${buttonVariants({ variant: "primary" })} mt-6`}>
            Volver a la tienda
          </Link>
        </div>
      </Container>
    );
  }

  /* Sin límite artificial: todos los demás productos de la misma colección. */
  const related = productsByDropLive(product.dropSlug).filter((p) => p.id !== product.id);

  return <ProductDetail product={product} related={related} />;
}
