import { ModeSectionPage } from "@/components/navigation/mode-section-page";
import { getAllowedSections } from "@/lib/cymt-modes";

export default function ConfeccionPage() {
  return (
    <ModeSectionPage
      section="confeccion"
      title="Confección de Prendas"
      description="Producción y confección de prendas personalizadas para negocios, marcas y proyectos."
      navigationSections={getAllowedSections("confeccion")}
    />
  );
}
