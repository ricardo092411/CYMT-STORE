import type { Metadata } from "next";
import { CmtInkLanding } from "@/components/inks/cmt-ink-landing";
import { getPublicInkCatalog } from "@/lib/public-inks";

export const dynamic = "force-dynamic";

const title = "CMT Ink Glow in the Dark";
const description =
  "Tintas CMT Ink Glow in the Dark para serigrafía y producción creativa. Consultá los productos y especificaciones publicados.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tintas" },
  openGraph: { title, description, url: "/tintas" },
  twitter: { title, description },
};

export default async function TintasPage() {
  return <CmtInkLanding catalog={await getPublicInkCatalog()} />;
}
