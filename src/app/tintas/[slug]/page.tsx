import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InkProductDetail } from "@/components/inks/ink-product-detail";
import { getPublicInkProductBySlug } from "@/lib/public-inks";

export const dynamic = "force-dynamic";

const getProduct = cache(getPublicInkProductBySlug);

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
    "Conocé esta tinta CMT Ink y sus especificaciones publicadas.";
  const url = `/tintas/${product.slug}`;
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

export default async function InkProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <InkProductDetail product={product} />;
}
