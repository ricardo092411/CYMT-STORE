import { CmtInkLanding } from "@/components/inks/cmt-ink-landing";
import { getPublicInkCatalog } from "@/lib/public-inks";

export const dynamic = "force-dynamic";

export default async function TintasPage() {
  return <CmtInkLanding catalog={await getPublicInkCatalog()} />;
}
