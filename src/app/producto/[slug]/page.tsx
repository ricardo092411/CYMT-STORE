import type { Metadata } from "next";
import { ProductPageClient } from "@/components/product/product-page-client";
import {
  getPrimaryProductImageUrl,
  getPublicProductWithVariantsBySlug,
  getProductWithVariantsBySlug,
} from "@/lib/products";
import { isAdmin } from "@/lib/auth/admin";
import { normalizeProduct } from "@/lib/product-normalizer";

export const dynamic = "force-dynamic";

async function getVisibleProduct(slug: string) {
  if (await isAdmin()) return getProductWithVariantsBySlug(slug);
  return getPublicProductWithVariantsBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getVisibleProduct(slug);
  if (!product) {
    return {
      title: "Producto",
      robots: { index: false, follow: false },
    };
  }
  const primaryImage = getPrimaryProductImageUrl(product);

  return {
    title: product.name,
    description: product.description ?? undefined,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: primaryImage
        ? [{ url: primaryImage, width: 1000, height: 1250 }]
        : undefined,
    },
  };
}

/**
 * Ficha de producto resuelta en cada request desde PostgreSQL.
 * El seed server-side permite renderizar productos creados desde el admin,
 * incluso si nunca existieron en el catálogo legacy.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getVisibleProduct(slug);
  const seed = product ? normalizeProduct(product) : null;
  return <ProductPageClient slug={slug} seed={seed} />;
}
