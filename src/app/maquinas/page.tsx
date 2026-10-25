import { MachineryLanding } from "@/components/machinery/machinery-landing";
import { getPublicMachineryCatalog } from "@/lib/public-machinery";

export const dynamic = "force-dynamic";

export default async function MaquinasPage() {
  return <MachineryLanding catalog={await getPublicMachineryCatalog()} />;
}
