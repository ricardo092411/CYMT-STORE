import { ConfectionLanding } from "@/components/confection/confection-landing";
import { getPublicConfectionCatalog } from "@/lib/public-confection";

export const dynamic = "force-dynamic";

export default async function ConfeccionPage() {
  return <ConfectionLanding catalog={await getPublicConfectionCatalog()} />;
}
