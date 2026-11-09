import { CmtInkLanding } from "@/components/inks/cmt-ink-landing";
import { getPublicInkLandingSettings } from "@/lib/public-inks";

export const dynamic = "force-dynamic";

export default async function MaquinasTintasPage() {
  return <CmtInkLanding catalog={{ products: [], landingSettings: await getPublicInkLandingSettings() }} />;
}
