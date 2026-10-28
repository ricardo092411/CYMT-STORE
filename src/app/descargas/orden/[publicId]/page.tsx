import { Container } from "@/components/ui";
import { DigitalOrderPage } from "@/components/downloads/digital-order-page";
export const dynamic = "force-dynamic";
export default async function DigitalOrderRoute({ params }: { params: Promise<{ publicId: string }> }) { const { publicId } = await params; return <main className="bg-bg-soft"><Container className="py-10 md:py-14"><DigitalOrderPage publicId={publicId} /></Container></main>; }
