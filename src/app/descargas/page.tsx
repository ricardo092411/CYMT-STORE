import { ModeSectionPage } from "@/components/navigation/mode-section-page";
import { getAllowedSections } from "@/lib/cymt-modes";

export default function DescargasPage() {
  return (
    <ModeSectionPage
      section="descargas"
      title="Descargas Digitales"
      description="Archivos profesionales para producción gráfica, serigrafía y DTF."
      navigationSections={getAllowedSections("descargas")}
      futureCategories={["Separaciones", "Semitonos", "Packs DTF", "Editables", "Mockups"]}
    />
  );
}
