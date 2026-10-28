import { notFound } from "next/navigation";
import { InkProductDetail } from "@/components/inks/ink-product-detail";
import { getPublicInkProductBySlug } from "@/lib/public-inks";

export const dynamic = "force-dynamic";

export default async function InkProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicInkProductBySlug(slug);
  if (!product) notFound();
  return <InkProductDetail product={product} />;
}
