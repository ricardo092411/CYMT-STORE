import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MachineryProductDetail } from "@/components/machinery/machinery-product-detail";
import { getPublicMachineryProductBySlug } from "@/lib/public-machinery";

export const dynamic = "force-dynamic";

const getProduct = cache(getPublicMachineryProductBySlug);

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
    "Conocé esta maquinaria para serigrafía y producción textil de CYMT.";
  const url = `/maquinas/${product.slug}`;
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

export default async function MachineryProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <MachineryProductDetail product={product} />;
}
