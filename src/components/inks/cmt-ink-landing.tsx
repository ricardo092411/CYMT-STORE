import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Beaker,
  CircleDot,
  Lightbulb,
  MessageCircle,
  MoonStar,
  Paintbrush,
  Shirt,
  Sparkles,
  Sun,
  Truck,
  Wrench,
} from "lucide-react";
import { Container, SectionHeader, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import type { PublicInkCatalog, PublicInkProduct } from "@/lib/public-inks";
import { cn } from "@/lib/utils";

const heroBenefits: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Sparkles, title: "Efecto fotoluminiscente", description: "Un acabado visual pensado para destacar." },
  { icon: MoonStar, title: "Brillo en oscuridad", description: "Diseños que cambian con el entorno." },
  { icon: Paintbrush, title: "Aplicación serigráfica", description: "Orientado a procesos de serigrafía." },
  { icon: Truck, title: "Envíos en El Salvador", description: "Consultá opciones para tu proyecto." },
];

const steps = [
  { number: "01", title: "Carga con luz", description: "La impresión recibe luz natural o artificial." },
  {
    number: "02",
    title: "Absorbe energía",
    description: "Los pigmentos fotoluminiscentes almacenan energía luminosa.",
  },
  {
    number: "03",
    title: "Brilla en la oscuridad",
    description: "La energía se libera gradualmente creando el efecto luminoso.",
  },
] as const;

const applications: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Shirt, title: "Prendas", description: "Para piezas con un detalle visual distintivo." },
  { icon: Sparkles, title: "Diseños especiales", description: "Para conceptos que buscan destacar de noche." },
  { icon: Paintbrush, title: "Serigrafía creativa", description: "Para explorar acabados diferentes en tus diseños." },
];

const reasons: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: CircleDot, title: "Efecto visual diferencial", description: "Un recurso para piezas memorables." },
  { icon: Wrench, title: "Integración serigráfica", description: "Orientado a procesos de serigrafía." },
  { icon: Lightbulb, title: "Diseños especiales", description: "Una opción para propuestas con personalidad." },
  { icon: MessageCircle, title: "Soporte directo", description: "Consultá opciones según tu proyecto." },
];

function GlowMediaPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-label={label}
      className={cn(
        "relative overflow-hidden border border-white/10 bg-[#111412]",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_66%_35%,rgba(184,243,107,0.22),transparent_28%),linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.05)_50%,transparent_78%)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:2rem_2rem]" />
      <div className="absolute left-[18%] top-[20%] h-40 w-40 rounded-full border border-[#b8f36b]/30 bg-[#b8f36b]/10 blur-sm" />
      <div className="absolute bottom-[18%] right-[15%] h-24 w-24 rounded-full border border-white/10 bg-white/5" />
      <div className="absolute bottom-0 left-0 h-1 w-28 bg-[#b8f36b]" />
      <span className="absolute bottom-4 left-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </span>
    </div>
  );
}

function GlowProductVisual({ product }: { product: PublicInkProduct }) {
  return product.primaryImageUrl ? (
    <img src={product.primaryImageUrl} alt={product.name} className="aspect-square w-full object-cover" />
  ) : (
    <GlowMediaPlaceholder label={`Imagen pendiente: ${product.name}`} className="aspect-square" />
  );
}

function InkHero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(184,243,107,0.1),transparent_25%)]" />
      <Container className="relative grid min-h-[calc(100vh-4rem)] items-center gap-12 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-[#b8f36b]">CMT Ink</p>
          <h1 className="mt-5 text-balance text-5xl font-bold leading-[0.93] sm:text-6xl lg:text-7xl">
            Glow <span className="text-[#b8f36b]">in the Dark</span>
          </h1>
          <p className="mt-6 text-xl text-ink-soft">Tintas fotoluminiscentes para serigrafía.</p>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-muted md:text-lg">
            Soluciones para crear impresiones con efectos luminosos y diseños que destacan en la oscuridad.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#linea-glow" className={buttonVariants({ size: "lg" })}>
              Ver línea Glow <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={site.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle className="h-4 w-4 text-[#b8f36b]" /> Cotizar por WhatsApp
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <GlowMediaPlaceholder
            label="Imagen pendiente de envases y muestras CMT Ink"
            className="aspect-[5/4] rounded-2xl shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]"
          />
          <div className="absolute -bottom-4 -left-3 border border-white/15 bg-surface px-4 py-3 shadow-xl sm:-left-5">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Línea actual</p>
            <p className="mt-1 font-display text-lg font-semibold text-[#b8f36b]">Glow in the Dark</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Benefits() {
  return (
    <section className="border-b border-line py-14 md:py-20">
      <Container>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {heroBenefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="min-h-48 bg-surface p-6">
              <Icon className="h-5 w-5 text-[#b8f36b]" />
              <h2 className="mt-7 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function GlowLine({ products }: { products: PublicInkProduct[] }) {
  return (
    <section id="linea-glow" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow="CMT Ink"
          title="Nuestra línea Glow in the Dark"
          description="Productos Glow publicados y listos para conocer con más detalle."
        />
        {products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="font-display text-xl font-semibold text-ink">Estamos preparando nuestra línea Glow in the Dark.</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">Consultanos por WhatsApp para conocer las próximas presentaciones.</p>
            <a href={site.whatsapp.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
              <MessageCircle className="h-4 w-4 text-[#b8f36b]" /> Cotizar por WhatsApp
            </a>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-[#b8f36b]/60">
                <div className="overflow-hidden bg-[#111412]"><GlowProductVisual product={product} /></div>
                <div className="flex min-h-52 flex-col p-5">
                  {product.priceNote && <span className="w-fit border border-[#b8f36b]/35 bg-[#b8f36b]/10 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#b8f36b]">{product.priceNote}</span>}
                  <h2 className="mt-5 text-xl font-semibold">{product.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{product.shortDescription}</p>
                  {product.specifications.length > 0 && <p className="mt-4 text-xs text-ink-faint">{product.specifications.slice(0, 2).map((item) => `${item.label}: ${item.value}`).join(" · ")}</p>}
                  <Link href={`/tintas/${product.slug}`} className={cn(buttonVariants({ variant: "outline" }), "mt-auto w-full pt-2")}>Ver detalles <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-line bg-bg-soft py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow="Efecto Glow"
          title="¿Cómo funciona?"
          description="Una explicación sencilla del efecto fotoluminiscente."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="rounded-2xl border border-line bg-surface p-6 md:p-7">
              <span className="font-display text-sm font-semibold tracking-[0.16em] text-[#b8f36b]">{step.number}</span>
              <h2 className="mt-10 text-2xl font-semibold">{step.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function ApplicationsAndReasons() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow="Posibilidades"
          title="Aplicaciones"
          description="El efecto Glow abre espacio para propuestas creativas y piezas especiales."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {applications.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-line bg-surface p-6">
              <Icon className="h-5 w-5 text-[#b8f36b]" />
              <h2 className="mt-8 text-2xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-20 border-t border-line pt-20 md:mt-28 md:pt-28">
          <SectionHeader
            eyebrow="CMT Ink"
            title="¿Por qué CMT Ink?"
            description="Una línea enfocada en efectos luminosos para proyectos que quieren salir de lo común."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-line bg-bg-soft p-6">
                <Icon className="h-5 w-5 text-[#b8f36b]" />
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function TechnicalInfo() {
  return (
    <section className="border-y border-line bg-bg-soft py-16 md:py-20">
      <Container>
        <div className="grid gap-8 rounded-2xl border border-line bg-surface p-6 md:grid-cols-[0.8fr_1.2fr] md:p-10">
          <div>
            <p className="eyebrow text-[#b8f36b]">Preparado para ampliar</p>
            <h2 className="mt-4 text-3xl font-bold">Información de aplicación</h2>
          </div>
          <div>
            <p className="leading-relaxed text-ink-muted">
              La línea está orientada a serigrafía y al efecto Glow in the Dark. Las instrucciones,
              ficha técnica, malla recomendada y curado se incorporarán cuando estén disponibles.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Uso orientado a serigrafía", "Efecto Glow in the Dark"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-bg-soft px-3 py-1.5 text-xs text-ink-soft">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ConversionCta() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface px-6 py-14 md:px-12 md:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_25%,rgba(184,243,107,0.14),transparent_26%)]" />
          <div className="relative max-w-2xl">
            <p className="eyebrow text-[#b8f36b]">CMT Ink</p>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-tight md:text-5xl">
              ¿Querés probar el efecto Glow en tus diseños?
            </h2>
            <p className="mt-4 text-ink-muted md:text-lg">Consultanos disponibilidad y opciones para tu proyecto.</p>
            <a
              href={site.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-8")}
            >
              <MessageCircle className="h-4 w-4" /> Cotizar por WhatsApp
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

function MachineryCrossSell() {
  return (
    <section className="pb-20 md:pb-28">
      <Container>
        <div className="grid overflow-hidden rounded-3xl border border-line bg-bg-soft lg:grid-cols-[0.9fr_1.1fr]">
          <GlowMediaPlaceholder label="Media pendiente de maquinaria CYMT" className="min-h-64 lg:min-h-full" />
          <div className="flex items-center px-6 py-14 md:px-12 md:py-16">
            <div className="max-w-xl">
              <p className="eyebrow">Complementá tu producción</p>
              <h2 className="mt-4 text-3xl font-bold md:text-5xl">Maquinaria CYMT</h2>
              <p className="mt-5 text-ink-muted md:text-lg">
                Conocé nuestra línea de equipos para serigrafía y soluciones para tu taller.
              </p>
              <Link href="/maquinas" className={cn(buttonVariants({ variant: "secondary" }), "mt-8")}>
                Ver máquinas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function CmtInkLanding({ catalog = { products: [] } }: { catalog?: PublicInkCatalog }) {
  return (
    <>
      <InkHero />
      <Benefits />
      <GlowLine products={catalog.products} />
      <HowItWorks />
      <ApplicationsAndReasons />
      <TechnicalInfo />
      <ConversionCta />
      <MachineryCrossSell />
    </>
  );
}
