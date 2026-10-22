import { ModeSectionPage } from "@/components/navigation/mode-section-page";
import { getAllowedSections } from "@/lib/cymt-modes";

export default function CamisasPage() {
  return (
    <ModeSectionPage
      section="camisas"
      title="Camisas CYMT"
      description="Streetwear, anime, cultura pop y diseños exclusivos de CYMT Store."
      navigationSections={getAllowedSections("camisas")}
    />
  );
}
