import { Hero } from "@/components/home/hero";
import { Marquee } from "@/components/home/marquee";
import { DropsSection } from "@/components/home/drops-section";
import { HomeProductSections } from "@/components/home/home-product-sections";
import { ClubCta } from "@/components/home/club-cta";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import { site } from "@/data/site";
import { getHomeHero } from "@/lib/home-hero";

const marqueeItems = [
  site.name,
  "Entregas En 48 Horas",
  "Hecho en El Salvador",
  "Drops exclusivos",
  "Calidad premium",
  "Envíos a todo el país",
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const hero = await getHomeHero();

  return (
    <>
      <Hero hero={hero} />
      <Marquee items={marqueeItems} className="border-y border-line bg-black py-3.5" />

      <DropsSection />

      {/* Entregas En 48 Horas — brand story */}
      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <div className="grid gap-10 rounded-3xl border border-line bg-surface p-8 md:grid-cols-3 md:p-12">
              <div>
                <p className="eyebrow mb-3">Por qué CYMT</p>
                <h2 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
                  Entregas En 48 Horas.
                </h2>
                <p className="mt-4 text-ink-muted">
                  No fabricamos en serie. Cada pieza se produce cuando la pides, con materiales
                  seleccionados y acabados pensados para durar.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3 md:col-span-2">
                <Pillar index="01" title="Tu Eleccion" text="Fabricamos tu pieza solo cuando la ordenas. Cero desperdicio, máxima calidad." />
                <Pillar index="02" title="Calidad premium" text="Materiales pesados, costuras reforzadas y estampados que resisten." />
                <Pillar index="03" title="Hecho en El Salvador" text="Diseñado y producido localmente." />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <HomeProductSections />

      <ClubCta />
    </>
  );
}

function Pillar({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-soft p-5">
      <span className="font-display text-sm font-bold text-brand">{index}</span>
      <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{text}</p>
    </div>// Trigger deployment
  );
}
