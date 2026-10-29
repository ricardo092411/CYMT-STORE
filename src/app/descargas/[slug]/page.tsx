import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DigitalProductDetail } from "@/components/downloads/digital-product-detail";
import { getPublicDigitalProductBySlug } from "@/lib/public-downloads";

export const dynamic = "force-dynamic";

const getProduct = cache(getPublicDigitalProductBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return {};

  const description =
    product.shortDescription ||
    "Conocé este recurso digital CYMT, sus especificaciones y opciones de compra.";
  const url = `/descargas/${product.slug}`;
  const image = product.primaryImageUrl
    ? [{ url: product.primaryImageUrl, alt: product.name }]
    : undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: product.name, description, url, images: image },
    twitter: { title: product.name, description, images: product.primaryImageUrl ? [product.primaryImageUrl] : undefined },
  };
}

export default async function DigitalProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  return <DigitalProductDetail product={product} />;
}
