import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  Factory,
  Headphones,
  MessageCircle,
  Ruler,
  Settings2,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Container, SectionHeader, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";

const machineCategories = [
  {
    title: "Pulpos serigráficos",
    description: "Precisión, estabilidad y rendimiento para producción de uno o varios colores.",
  },
  {
    title: "Reveladoras UV",
    description: "Exposición práctica y consistente para el revelado de marcos.",
  },
  {
    title: "Presecadores / Flash",
    description: "Secado rápido para procesos multicolor y bases.",
  },
  {
    title: "Hornos de curado",
    description: "Soluciones para curado uniforme y producción continua.",
  },
  {
    title: "Mesas y accesorios",
    description: "Equipos complementarios para mejorar el flujo del taller.",
  },
] as const;

const benefits: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Factory,
    title: "Fabricación local",
    description: "Equipos pensados y fabricados cerca de tu operación.",
  },
  {
    icon: Headphones,
    title: "Soporte directo",
    description: "Hablás con el equipo que conoce cada configuración.",
  },
  {
    icon: Ruler,
    title: "Diseño funcional",
    description: "Soluciones claras para un flujo de trabajo más ordenado.",
  },
  {
    icon: Settings2,
    title: "Producción continua",
    description: "Estructuras robustas para acompañar el ritmo del taller.",
  },
  {
    icon: Wrench,
    title: "Acompañamiento técnico",
    description: "Te orientamos para elegir la configuración adecuada.",
  },
];

function MediaPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-label={label}
      className={cn(
        "relative overflow-hidden border border-line bg-[#15161a]",
        "before:absolute before:inset-0 before:bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.05)_45%,transparent_75%)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-50" />
      <div className="absolute -right-8 top-1/2 h-28 w-[130%] -translate-y-1/2 rotate-[-12deg] border-y border-white/10 bg-black/10" />
      <div className="absolute bottom-0 left-0 h-1.5 w-24 bg-brand" />
      <span className="absolute bottom-4 left-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </span>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_35%,rgba(229,9,20,0.16),transparent_27%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.025)_55%,transparent_56%,transparent_100%)]" />
      <Container className="relative grid min-h-[calc(100vh-4rem)] items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/35 bg-brand-soft px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">
            <Factory className="h-3.5 w-3.5" /> Fabricación local
          </span>
          <h1 className="mt-6 text-balance text-5xl font-bold leading-[0.93] sm:text-6xl lg:text-7xl">
            Máquinas <span className="text-brand">Serigráficas</span> CYMT
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Equipos robustos, funcionales y diseñados para producción real.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#maquinas" className={buttonVariants({ size: "lg" })}>
              Ver máquinas <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={site.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle className="h-4 w-4 text-brand" /> Cotizar por WhatsApp
            </a>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
            {[
              [Factory, "Fabricación local"],
              [Settings2, "Producción real"],
              [Truck, "Envíos en El Salvador"],
              [Headphones, "Soporte directo"],
            ].map(([Icon, label]) => {
              const BenefitIcon = Icon as LucideIcon;
              return (
                <div key={label as string} className="flex gap-2.5 text-sm text-ink-soft">
                  <BenefitIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <MediaPlaceholder
            label="Imagen principal de maquinaria"
            className="aspect-[5/4] rounded-2xl shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]"
          />
          <div className="absolute -bottom-4 -left-3 border border-line-strong bg-surface px-4 py-3 shadow-xl sm:-left-5">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Diseñadas para</p>
            <p className="mt-1 font-display text-lg font-semibold text-ink">Producción continua</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function MachineCategories() {
  return (
    <section id="maquinas" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow="Maquinaria CYMT"
          title="Nuestras máquinas"
          description="Soluciones para cada etapa de tu producción serigráfica."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {machineCategories.map((category) => (
            <article
              key={category.title}
              className="group overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:bg-surface-2"
            >
              <MediaPlaceholder label={`Fotografía pendiente: ${category.title}`} className="aspect-[16/10]" />
              <div className="flex min-h-44 flex-col p-6">
                <h2 className="text-2xl font-semibold text-ink">{category.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{category.description}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft transition group-hover:text-brand">
                  Próximamente <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Benefits() {
  return (
    <section className="border-y border-line bg-bg-soft py-20 md:py-28">
      <Container>
        <SectionHeader
          eyebrow="Ventaja CYMT"
          title="¿Por qué elegir maquinaria CYMT?"
          description="Equipos y acompañamiento para producir con más confianza desde el primer día."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="min-h-56 bg-surface p-6 transition hover:bg-surface-2">
              <Icon className="h-5 w-5 text-brand" />
              <h3 className="mt-8 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
          ))}
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_25%,rgba(229,9,20,0.18),transparent_25%)]" />
          <div className="relative max-w-2xl">
            <span className="eyebrow text-brand">Hablemos de tu taller</span>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-tight md:text-5xl">
              ¿Querés equipar o mejorar tu taller?
            </h2>
            <p className="mt-4 max-w-xl text-ink-muted md:text-lg">
              Contanos qué querés producir y te ayudamos a elegir la configuración adecuada.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={site.whatsapp.link}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "lg" })}
              >
                <MessageCircle className="h-4 w-4" /> Cotizar por WhatsApp
              </a>
              <Link href="/maquinas/tintas" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Ver tintas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function InkCrossSell() {
  return (
    <section className="pb-20 md:pb-28">
      <Container>
        <div className="grid overflow-hidden rounded-3xl border border-line bg-bg-soft lg:grid-cols-[0.9fr_1.1fr]">
          <MediaPlaceholder label="Imagen pendiente de CMT Ink" className="min-h-72 lg:min-h-full" />
          <div className="flex items-center px-6 py-14 md:px-12 md:py-16">
            <div className="max-w-xl">
              <p className="eyebrow">Complementá tu producción</p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">CMT <span className="text-brand">Ink</span></h2>
              <p className="mt-5 text-ink-muted md:text-lg">
                Tintas serigráficas y soluciones para complementar tu proceso de producción.
              </p>
              <Link href="/maquinas/tintas" className={cn(buttonVariants({ variant: "secondary" }), "mt-8")}>
                Conocé nuestras tintas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function MachineryLanding() {
  return (
    <>
      <Hero />
      <MachineCategories />
      <Benefits />
      <ConversionCta />
      <InkCrossSell />
    </>
  );
}
