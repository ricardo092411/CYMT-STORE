import type { Metadata } from "next";
import { ConfectionLanding } from "@/components/confection/confection-landing";
import { getPublicConfectionCatalog } from "@/lib/public-confection";

export const dynamic = "force-dynamic";

const title = "Confección y Productos Textiles";
const description =
  "Confección de productos textiles y trabajos personalizados de CYMT. Conocé las prendas y especificaciones publicadas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/confeccion" },
  openGraph: { title, description, url: "/confeccion" },
  twitter: { title, description },
};

export default async function ConfeccionPage() {
  return <ConfectionLanding catalog={await getPublicConfectionCatalog()} />;
}
