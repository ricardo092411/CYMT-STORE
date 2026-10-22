import { ModeSectionPage } from "@/components/navigation/mode-section-page";
import { getAllowedSections } from "@/lib/cymt-modes";

export default function MaquinasPage() {
  return (
    <ModeSectionPage
      section="maquinas"
      title="Máquinas Serigráficas"
      description="Equipos para producción serigráfica fabricados y respaldados por CYMT."
      navigationSections={getAllowedSections("maquinas")}
    />
  );
}
