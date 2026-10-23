import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCode2,
  FileImage,
  FileText,
  Layers3,
  LockKeyhole,
  PackageCheck,
  PanelTop,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Container, SectionHeader, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DigitalResourceCard } from "@/components/downloads/digital-resource-card";

const categories: { number: string; title: string; description: string; icon: LucideIcon }[] = [
  { number: "01", title: "Separaciones", description: "Archivos preparados para impresión por colores y procesos de separación.", icon: Layers3 },
  { number: "02", title: "Semitonos", description: "Recursos preparados para trabajos con trama, degradados y reproducción tonal.", icon: PanelTop },
  { number: "03", title: "Packs DTF", description: "Colecciones de diseños preparadas para producción DTF.", icon: FileImage },
  { number: "04", title: "Editables", description: "Recursos personalizables según los formatos incluidos.", icon: FileText },
  { number: "05", title: "Mockups", description: "Presentaciones visuales para mostrar diseños y productos.", icon: Sparkles },
  { number: "06", title: "Corte láser", description: "Archivos vectoriales para proyectos de corte y fabricación digital.", icon: FileCode2 },
  { number: "07", title: "Plotter de corte", description: "Plantillas y recursos vectoriales para flujos con plotters compatibles.", icon: SlidersHorizontal },
];

const demoResources = [
  { title: "Recurso de ejemplo", category: "Separaciones", formats: ["PSD", "PNG"], technicalLabels: ["Datos técnicos demo", "Previsualización" ] },
  { title: "Pack de muestra", category: "Packs DTF", formats: ["PNG", "PDF"], technicalLabels: ["Contenido demo", "Formatos visibles" ] },
  { title: "Archivo vectorial de demostración", category: "Corte láser", formats: ["SVG", "DXF", "AI"], technicalLabels: ["Piezas: demo", "Medidas: pendientes" ] },
  { title: "Separación de ejemplo", category: "Semitonos", formats: ["PSD", "PDF"], technicalLabels: ["Canales: demo", "Editable: pendiente" ] },
] as const;

const orderStates = ["PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "CANCELLED", "REFUNDED"] as const;

function DigitalPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden border border-line bg-[#101218]", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(147,197,253,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(147,197,253,0.08)_1px,transparent_1px)] bg-[size:2rem_2rem]" />
      <div className="absolute left-[12%] top-[15%] h-[70%] w-[52%] border border-white/15 bg-surface shadow-2xl" />
      <div className="absolute right-[12%] top-[20%] w-[25%] space-y-3 border border-white/10 bg-bg/85 p-3">
        <div className="h-2 w-full bg-brand/80" />
        <div className="h-1.5 w-3/4 bg-white/15" />
        <div className="h-1.5 w-full bg-white/10" />
        <div className="h-1.5 w-1/2 bg-white/10" />
      </div>
      <span className="absolute bottom-4 left-4 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">Preview de recurso digital</span>
      <span className="absolute bottom-4 right-4 rounded-md border border-white/10 bg-bg/80 px-2 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Demo</span>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_34%,rgba(147,197,253,0.1),transparent_27%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.025)_60%,transparent_100%)]" />
      <Container className="relative grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-brand">Recursos digitales CYMT</p>
          <h1 className="mt-5 text-balance text-5xl font-bold leading-[0.94] sm:text-6xl lg:text-7xl">Archivos listos para <span className="text-brand">producir.</span></h1>
          <p className="mt-6 text-xl text-ink-soft">Recursos digitales preparados para serigrafía, DTF, diseño y fabricación.</p>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-muted md:text-lg">Encontrá separaciones, semitonos, editables, mockups, archivos para corte láser y recursos para plotter preparados para llevar tus proyectos a producción.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#recursos" className={buttonVariants({ size: "lg" })}>Explorar recursos <ArrowRight className="h-4 w-4" /></a>
            <a href="#categorias" className={buttonVariants({ variant: "outline", size: "lg" })}>Ver categorías</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {["PSD", "PNG", "AI", "PDF", "SVG", "DXF"].map((format) => (
              <span key={format} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-ink-soft">{format}</span>
            ))}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <DigitalPreview className="aspect-[5/4] rounded-2xl shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]" />
          <div className="absolute -bottom-4 -left-3 border border-line-strong bg-surface px-4 py-3 shadow-xl sm:-left-5">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">Marketplace digital</p>
            <p className="mt-1 text-sm font-semibold text-ink">Previews, información y acceso protegido</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Categories() {
  return (
    <section id="categorias" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <SectionHeader eyebrow="Biblioteca CYMT" title="Explorá por categoría" description="Recursos organizados para distintos flujos de producción y presentación." />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map(({ number, title, description, icon: Icon }) => (
            <article key={title} className="group min-h-56 rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-line-strong hover:bg-surface-2">
              <div className="flex items-start justify-between"><span className="text-xs font-semibold tracking-[0.16em] text-brand">{number}</span><Icon className="h-5 w-5 text-ink-faint transition group-hover:text-brand" /></div>
              <h2 className="mt-10 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ResourceGrid() {
  return (
    <section id="recursos" className="scroll-mt-20 border-y border-line bg-bg-soft py-20 md:py-28">
      <Container>
        <SectionHeader eyebrow="Selección visual" title="Recursos destacados" description="Tarjetas DEMO preparadas para previews, formatos, datos técnicos y precio futuro." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {demoResources.map((resource) => <DigitalResourceCard key={resource.title} {...resource} />)}
        </div>
      </Container>
    </section>
  );
}

function DetailAndPaymentPreview() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <SectionHeader eyebrow="Interfaz preparada" title="Detalle y compra de recurso" description="Un ejemplo visual de cómo se presentará la información antes de habilitar compras reales." />
        <div className="mt-10 grid overflow-hidden rounded-3xl border border-line lg:grid-cols-[1.1fr_0.9fr]">
          <DigitalPreview className="min-h-80 lg:min-h-full" />
          <div className="bg-surface p-6 md:p-8">
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brand">Detalle DEMO</span>
            <h2 className="mt-3 text-3xl font-bold">Archivo vectorial de demostración</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">Aquí se mostrará la descripción, formatos incluidos, resolución, contenido, instrucciones y datos técnicos confirmados de cada recurso.</p>
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
              {["Formatos incluidos", "Resolución", "Editable", "Contenido incluido"].map((item) => <div key={item} className="bg-bg-soft p-3 text-ink-muted">{item}<p className="mt-1 text-xs text-ink-faint">Dato futuro</p></div>)}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-line pt-5"><div><p className="text-2xl font-semibold">$0.00</p><p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">Precio DEMO</p></div><button type="button" disabled className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white opacity-60 disabled:cursor-not-allowed">Comprar archivo <ArrowRight className="h-4 w-4" /></button></div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
            <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Checkout DEMO</p><h2 className="mt-3 text-2xl font-bold">Elegí cómo pagar</h2></div><span className="rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-brand">Próximamente</span></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="border border-brand/50 bg-brand-soft p-5"><Building2 className="h-5 w-5 text-brand" /><h3 className="mt-5 font-semibold">Transferencia bancaria</h3><p className="mt-2 text-sm text-ink-muted">Interfaz preparada para una orden pendiente de confirmación.</p></div>
              <div className="border border-line bg-bg-soft p-5 opacity-70"><WalletCards className="h-5 w-5 text-ink-muted" /><h3 className="mt-5 font-semibold">PayPal</h3><p className="mt-2 text-sm text-ink-muted">PayPal estará disponible próximamente.</p></div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              {["Banco", "Titular", "Cuenta"].map((item) => <div key={item} className="rounded-lg border border-line bg-bg-soft p-3 text-xs text-ink-faint">{item}<p className="mt-1 text-sm text-ink-muted">Información futura</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-bg-soft p-6 md:p-8"><LockKeyhole className="h-5 w-5 text-brand" /><h2 className="mt-5 text-2xl font-bold">Acceso protegido</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">El frontend no decide si un pago fue confirmado. La descarga se habilitará únicamente tras una autorización futura del servidor.</p><p className="mt-6 flex items-center gap-2 text-sm text-ink-faint"><LockKeyhole className="h-4 w-4" /> Disponible después del pago</p></div>
        </div>
      </Container>
    </section>
  );
}

function FutureFlow() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-y border-line bg-bg-soft py-20 md:py-28">
      <Container>
        <SectionHeader eyebrow="Próximamente" title="¿Cómo funcionarán las descargas?" description="El flujo estará disponible cuando los pagos y la autorización segura estén activos." />
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["01", "Elegís tu recurso"], ["02", "Seleccionás tu método de pago"], ["03", "Confirmamos el pago"], ["04", "Desbloqueamos tu descarga"]].map(([number, text]) => <li key={number} className="border border-line bg-surface p-5"><span className="text-xs font-semibold tracking-[0.16em] text-brand">{number}</span><p className="mt-8 text-lg font-semibold">{text}</p></li>)}</ol>
        <div className="mt-10 flex flex-wrap gap-2">{orderStates.map((state) => <span key={state} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.1em] text-ink-muted">{state}</span>)}</div>
      </Container>
    </section>
  );
}

function TrustFormatsAndCta() {
  return (
    <>
      <section className="py-20 md:py-28"><Container><div className="grid gap-10 lg:grid-cols-2"><div><p className="eyebrow">Confianza</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">Archivos preparados para producción</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{[[CheckCircle2, "Previews claras"], [FileText, "Información técnica"], [PackageCheck, "Archivos organizados"], [ShieldCheck, "Acceso protegido"]].map(([Icon, text]) => { const ItemIcon = Icon as LucideIcon; return <div key={text as string} className="flex items-center gap-3 border-b border-line py-3 text-sm text-ink-soft"><ItemIcon className="h-4 w-4 text-brand" />{text as string}</div>; })}</div></div><div className="rounded-2xl border border-line bg-surface p-6 md:p-8"><p className="eyebrow">Formatos</p><h2 className="mt-4 text-2xl font-bold">Información clara antes de comprar</h2><p className="mt-3 text-ink-muted">Cada recurso indicará claramente los formatos incluidos antes de la compra.</p><div className="mt-7 flex flex-wrap gap-2">{["PSD", "PNG", "AI", "PDF", "SVG", "DXF"].map((format) => <span key={format} className="rounded-md border border-line bg-bg-soft px-3 py-2 text-xs font-semibold tracking-[0.12em] text-ink-soft">{format}</span>)}</div></div></div></Container></section>
      <section className="pb-20 md:pb-28"><Container><div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface px-6 py-14 text-center md:px-12 md:py-16"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(229,9,20,0.16),transparent_40%)]" /><div className="relative mx-auto max-w-2xl"><p className="eyebrow text-brand">Recursos digitales CYMT</p><h2 className="mt-4 text-balance text-3xl font-bold md:text-5xl">¿Trabajás con serigrafía, DTF o fabricación digital?</h2><p className="mt-4 text-ink-muted md:text-lg">Estamos preparando recursos digitales pensados para agilizar tu producción y tus proyectos.</p><a href="#recursos" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>Explorar recursos <ArrowRight className="h-4 w-4" /></a></div></div></Container></section>
    </>
  );
}

export function DownloadsLanding() {
  return <><Hero /><Categories /><ResourceGrid /><DetailAndPaymentPreview /><FutureFlow /><TrustFormatsAndCta /></>;
}
