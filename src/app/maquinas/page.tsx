import type { Metadata } from "next";
import { MachineryLanding } from "@/components/machinery/machinery-landing";
import { getPublicMachineryCatalog } from "@/lib/public-machinery";

export const dynamic = "force-dynamic";

const title = "Maquinaria para Serigrafía";
const description =
  "Maquinaria y equipos para serigrafía fabricados por CYMT en El Salvador. Conocé pulpos, reveladoras, presecadores y soluciones para producción.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/maquinas" },
  openGraph: { title, description, url: "/maquinas" },
  twitter: { title, description },
};

export default async function MaquinasPage() {
  return <MachineryLanding catalog={await getPublicMachineryCatalog()} />;
}
