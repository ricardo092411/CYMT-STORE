import { DownloadsLanding } from "@/components/downloads/downloads-landing";
import { getPublicDigitalCatalog } from "@/lib/public-downloads";

export const dynamic = "force-dynamic";

export default async function DescargasPage() {
  return <DownloadsLanding catalog={await getPublicDigitalCatalog()} />;
}
