import { notFound } from "next/navigation";
import { ConfectionProductDetail } from "@/components/confection/confection-product-detail";
import { getPublicConfectionProductBySlug } from "@/lib/public-confection";

export const dynamic = "force-dynamic";

export default async function ConfectionProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicConfectionProductBySlug(slug);
  if (!product) notFound();
  return <ConfectionProductDetail product={product} />;
}
