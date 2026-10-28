import { notFound } from "next/navigation";
import { DigitalProductDetail } from "@/components/downloads/digital-product-detail";
import { getPublicDigitalProductBySlug } from "@/lib/public-downloads";
export const dynamic = "force-dynamic";
export default async function DigitalProductPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = await getPublicDigitalProductBySlug(slug); if (!product) notFound(); return <DigitalProductDetail product={product} />; }
