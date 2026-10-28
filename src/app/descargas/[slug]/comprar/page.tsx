import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { DigitalCheckout } from "@/components/downloads/digital-checkout";
import { getPublicDigitalProductBySlug } from "@/lib/public-downloads";
export const dynamic = "force-dynamic";
export default async function DigitalCheckoutPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = await getPublicDigitalProductBySlug(slug); if (!product) notFound(); const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() && (process.env.PAYPAL_ENV === "sandbox" || process.env.PAYPAL_ENV === "live") ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.trim() : null; return <main className="bg-bg-soft"><Container className="py-10 md:py-14"><DigitalCheckout product={{ name: product.name, slug: product.slug, priceCents: product.priceCents }} paypalClientId={paypalClientId} /></Container></main>; }
