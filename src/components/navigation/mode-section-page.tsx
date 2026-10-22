import Link from "next/link";
import { Container, buttonVariants } from "@/components/ui";
import {
  CYMT_SECTION_CONFIG,
  getAllowedSections,
  getSectionHref,
  type CymtMode,
  type CymtSection,
} from "@/lib/cymt-modes";

export function ModeSectionPage({
  section,
  mode,
}: {
  section: CymtSection;
  mode?: CymtMode;
}) {
  const sectionConfig = CYMT_SECTION_CONFIG[section];
  const navigationSections = mode ? getAllowedSections(mode) : [];
  const futureCategories = sectionConfig.futureCategories ?? [];

  return (
    <Container className="py-16 md:py-24">
      <p className="eyebrow mb-3">Sección: {sectionConfig.label}</p>
      <h1 className="font-display text-4xl font-bold md:text-5xl">{sectionConfig.title}</h1>
      <p className="mt-4 max-w-2xl text-ink-muted md:text-lg">{sectionConfig.description}</p>

      {mode && navigationSections.length > 0 && (
        <nav aria-label="Navegación de sección" className="mt-8 flex flex-wrap gap-3">
          {navigationSections.map((item) => {
            const navigationItem = CYMT_SECTION_CONFIG[item];
            return (
              <Link
                key={item}
                href={getSectionHref(mode, item)}
                className={buttonVariants({ variant: item === section ? "primary" : "secondary" })}
              >
                {navigationItem.label}
              </Link>
            );
          })}
        </nav>
      )}

      {futureCategories.length > 0 && (
        <div className="mt-8 max-w-xl rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Próximamente</p>
          <ul className="mt-3 space-y-2 text-ink-muted">
            {futureCategories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
