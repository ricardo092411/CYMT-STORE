import type { Metadata } from "next";
import { DownloadsLanding } from "@/components/downloads/downloads-landing";
import { getPublicDigitalCatalog } from "@/lib/public-downloads";

export const dynamic = "force-dynamic";

const title = "Recursos Digitales para Diseño y Producción";
const description =
  "Recursos digitales para serigrafía, DTF, diseño, corte y producción creativa disponibles en CYMT Descargas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/descargas" },
  openGraph: { title, description, url: "/descargas" },
  twitter: { title, description },
};

export default async function DescargasPage() {
  return <DownloadsLanding catalog={await getPublicDigitalCatalog()} />;
}
