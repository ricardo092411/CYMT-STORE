import type { Metadata } from "next";
import { ProductPageClient } from "@/components/product/product-page-client";
import { products, getProduct } from "@/data/catalog";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return {
      title: "Producto",
      robots: { index: false, follow: true },
    };
  }
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images[0]
        ? [{ url: product.images[0], width: 1000, height: 1250 }]
        : undefined,
    },
  };
}

/**
 * Ficha de producto.
 * - Productos del catálogo base: SSG + seed server-side.
 * - Productos creados en el editor: se resuelven en cliente desde el catálogo vivo.
 * dynamicParams permite slugs nuevos sin reescribir la app.
 */
export const dynamicParams = true;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seed = getProduct(slug) ?? null;
  return <ProductPageClient slug={slug} seed={seed} />;
}
