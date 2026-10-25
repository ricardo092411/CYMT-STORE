import { notFound } from "next/navigation";
import { MachineryProductDetail } from "@/components/machinery/machinery-product-detail";
import { getPublicMachineryProductBySlug } from "@/lib/public-machinery";

export const dynamic = "force-dynamic";

export default async function MachineryProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicMachineryProductBySlug(slug);
  if (!product) notFound();
  return <MachineryProductDetail product={product} />;
}
