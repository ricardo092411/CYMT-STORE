import Link from "next/link";
import { Container, buttonVariants } from "@/components/ui";
import { CYMT_SECTION_CONFIG, type CymtSection } from "@/lib/cymt-modes";

export function ModeSectionPage({
  section,
  title,
  description,
  navigationSections = [],
  futureCategories = [],
}: {
  section: CymtSection;
  title: string;
  description: string;
  navigationSections?: readonly CymtSection[];
  futureCategories?: readonly string[];
}) {
  return (
    <Container className="py-16 md:py-24">
      <p className="eyebrow mb-3">Sección: {CYMT_SECTION_CONFIG[section].label}</p>
      <h1 className="font-display text-4xl font-bold md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-ink-muted md:text-lg">{description}</p>

      {navigationSections.length > 0 && (
        <nav aria-label="Navegación de sección" className="mt-8 flex flex-wrap gap-3">
          {navigationSections.map((item) => {
            const navigationItem = CYMT_SECTION_CONFIG[item];
            return (
              <Link
                key={item}
                href={navigationItem.path}
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
