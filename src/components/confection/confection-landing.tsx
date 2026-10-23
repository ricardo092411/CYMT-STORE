import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Layers3,
  MessageCircle,
  Ruler,
  Scissors,
  Shirt,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { Container, SectionHeader, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";

// Presentation data lives together so future admin-backed content can replace it without changing the layout.
const categories = [
  { title: "Prendas personalizadas", description: "Piezas textiles pensadas para tu marca, equipo o proyecto.", icon: Shirt },
  { title: "Uniformes", description: "Opciones coordinadas para negocios, equipos y atención al cliente.", icon: Users },
  { title: "Gabachas y delantales", description: "Prendas funcionales para trabajo, servicio y cocina.", icon: Scissors },
  { title: "Manteles", description: "Textiles para mesas, eventos y espacios comerciales.", icon: Layers3 },
  { title: "Especiales", description: "Piezas que requieren una propuesta textil particular.", icon: Sparkles },
  { title: "A medida", description: "Proyectos que parten de una necesidad concreta y propia.", icon: Ruler },
] as const;

const productLines = [
  { title: "Camisetas y polos", label: "Línea de prendas", tone: "bg-[#d9a78e]" },
  { title: "Gabachas y delantales", label: "Línea de trabajo", tone: "bg-[#b98670]" },
  { title: "Mantelería", label: "Línea de espacios", tone: "bg-[#cbb49c]" },
  { title: "Uniformes coordinados", label: "Línea institucional", tone: "bg-[#95695a]" },
] as const;

const differentiators = [
  { title: "Atención directa", description: "Conversaciones claras para entender lo que tu proyecto necesita.", icon: MessageCircle },
  { title: "Producción a medida", description: "Una base flexible para desarrollar piezas y acabados acordes a cada pedido.", icon: Ruler },
  { title: "Variedad textil", description: "Desde prendas funcionales hasta productos para espacios y marcas.", icon: Layers3 },
  { title: "Oficio cercano", description: "Experiencia familiar en confección aplicada con cuidado en cada detalle.", icon: CheckCircle2 },
] as const;

const processSteps = [
  { number: "01", title: "Contanos tu idea", description: "Revisamos el tipo de producto, uso, cantidades y acabados que buscás." },
  { number: "02", title: "Definimos la pieza", description: "Aterrizamos materiales, detalles y una propuesta adecuada para el proyecto." },
  { number: "03", title: "Confeccionamos", description: "Coordinamos la producción de cada pieza con atención al resultado final." },
  { number: "04", title: "Coordinamos entrega", description: "Te acompañamos para cerrar el pedido y definir la entrega o retiro." },
] as const;

function TextilePlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-label={label}
      className={cn(
        "relative overflow-hidden border border-[#cdbbab] bg-[#e7ddd0]",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,rgba(255,255,255,0.48),transparent_34%,rgba(83,52,39,0.1)_70%),repeating-linear-gradient(90deg,transparent_0,transparent_18px,rgba(95,63,47,0.055)_19px,transparent_20px)]",
        className,
      )}
    >
      <div className="absolute -left-[8%] top-[12%] h-[68%] w-[55%] rotate-[-9deg] rounded-[45%_55%_42%_58%] border border-[#a77560]/30 bg-[#f6f0e8]/80 shadow-[20px_26px_45px_-30px_rgba(64,38,28,0.7)]" />
      <div className="absolute bottom-[13%] right-[11%] h-[42%] w-[33%] rounded-[42%_58%_50%_50%] border border-[#9d6a55]/25 bg-[#b87d66]/30" />
      <div className="absolute left-[12%] top-[18%] h-px w-[58%] rotate-[15deg] bg-[#a76f58]/45" />
      <div className="absolute left-[8%] top-[51%] h-px w-[82%] rotate-[-7deg] border-t border-dashed border-[#8e5f4d]/45" />
      <div className="absolute right-[9%] top-[9%] grid h-11 w-11 place-items-center rounded-full border border-[#8c5b49]/20 bg-[#fff9f1]/55 text-[0.53rem] font-semibold tracking-[0.12em] text-[#754c3d]">CYMT</div>
      <div className="absolute bottom-4 left-4 rounded-full border border-[#9a6d59]/30 bg-[#f8f3ec]/80 px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#6b4638] backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f4ede3] text-[#2b2420]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(229,9,20,0.12),transparent_22%),radial-gradient(circle_at_16%_88%,rgba(177,128,96,0.16),transparent_28%)]" />
      <Container className="relative grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-[0.94fr_1.06fr] lg:gap-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full border border-[#cfbcae] bg-white/65 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#7b5040]">
            Estudio textil CYMT
          </p>
          <h1 className="mt-7 max-w-xl text-balance font-display text-5xl font-bold leading-[0.91] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Confección que viste <span className="text-brand">tu idea.</span>
          </h1>
          <p className="mt-7 max-w-xl text-xl leading-relaxed text-[#59483f]">
            Diseñamos y confeccionamos prendas y productos textiles con una presentación cuidada y un acabado profesional.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-[#756157] md:text-lg">
            Uniformes, gabachas, delantales, manteles y propuestas personalizadas para marcas, negocios y proyectos especiales.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={site.whatsapp.link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg" })}>
              Cotizar por WhatsApp <MessageCircle className="h-4 w-4" />
            </a>
            <a href="#lineas" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#a88473] px-5 py-3 text-sm font-semibold text-[#4e352b] transition hover:border-[#714637] hover:bg-white/70">
              Ver líneas textiles <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-11 flex flex-wrap gap-2 border-t border-[#d8c8bc] pt-5">
            {["Confección a medida", "Atención directa", "Producción textil"].map((item) => (
              <span key={item} className="rounded-full border border-[#d8c8bc] bg-white/50 px-3 py-1.5 text-xs font-medium text-[#674a3c]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:pr-9">
          <p className="absolute -left-5 top-12 hidden origin-top-left -rotate-90 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-[#8c6351] lg:block">Atelier CYMT — 01</p>
          <TextilePlaceholder label="Fotografía editorial de confección pendiente" className="aspect-[5/4] rounded-[2rem] shadow-[0_38px_90px_-44px_rgba(67,39,26,0.65)] lg:ml-8" />
          <div className="absolute -bottom-5 -left-2 max-w-56 border border-[#cdbbab] bg-[#fffaf4] p-4 shadow-xl sm:-left-6">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#98705d]">Catálogo textil</p>
            <p className="mt-1 font-display text-lg font-semibold text-[#3c2c25]">Piezas con presencia propia</p>
          </div>
          <div className="absolute -right-2 top-7 hidden border border-white/60 bg-[#5d392e] px-4 py-3 text-[#fff8f0] shadow-lg sm:block">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-[#ead5c7]">CYMT</p>
            <p className="mt-1 text-sm font-medium">Confección</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Categories() {
  return (
    <section id="categorias" className="scroll-mt-20 bg-[#fffaf5] py-24 text-[#2b2420] md:py-32">
      <Container>
        <div className="max-w-3xl border-l-2 border-brand pl-5 md:pl-7">
          <SectionHeader eyebrow="Universo CYMT" title="Confección para distintos proyectos" description="Una base de categorías pensada para crecer a medida que sumemos nuevas líneas y necesidades textiles." />
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {categories.map(({ title, description, icon: Icon }, index) => (
            <article key={title} className="group min-h-60 border border-[#e0d2c6] bg-[#f8f1e9] p-7 transition duration-500 hover:-translate-y-1 hover:border-[#be8b73] hover:bg-white lg:[&:nth-child(2)]:translate-y-8 lg:[&:nth-child(5)]:translate-y-8">
              <div className="flex items-start justify-between border-b border-[#ddcdbf] pb-5"><span className="text-xs font-semibold tracking-[0.16em] text-brand">0{index + 1}</span><Icon className="h-5 w-5 text-[#a87862] transition duration-500 group-hover:rotate-6 group-hover:text-brand" /></div>
              <h2 className="mt-9 font-display text-2xl font-semibold text-[#382923]">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#735e53]">{description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProductLines() {
  return (
    <section id="lineas" className="scroll-mt-20 bg-[#e9ddd0] py-24 text-[#2b2420] md:py-32">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
          <SectionHeader eyebrow="Líneas de producto" title="Capacidades que se ven como catálogo" description="Una presentación inicial de líneas textiles; las imágenes, fichas y descripciones podrán sumarse a cada una más adelante." />
          <p className="border-l border-[#a87a64] pl-4 text-sm leading-relaxed text-[#735e53]">Selección visual de líneas. Sin precios, stock ni productos comprables todavía.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {productLines.map(({ title, label, tone }, index) => (
            <article key={title} className="overflow-hidden border border-[#d2bcab] bg-[#fffaf5] shadow-[0_16px_32px_-30px_rgba(69,40,28,0.7)] transition duration-500 hover:-translate-y-1 xl:[&:nth-child(even)]:translate-y-10">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#d5bdab]">
                <div className={cn("absolute inset-x-[13%] bottom-[11%] top-[13%] rounded-[46%_46%_18%_18%] opacity-75", tone)} />
                <div className="absolute inset-x-[20%] top-[21%] h-px bg-white/70" />
                <div className="absolute inset-x-[11%] bottom-[18%] h-10 rounded-full border border-white/30 bg-white/15" />
                <span className="absolute left-4 top-4 rounded-full bg-[#fffaf5]/85 px-2.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-[#745043]">{`0${index + 1}`}</span>
                <span className="absolute bottom-4 left-4 text-[0.57rem] font-semibold uppercase tracking-[0.17em] text-[#fff8f2]">Imagen de línea pendiente</span>
              </div>
              <div className="p-6"><p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[#a2745e]">{label}</p><h2 className="mt-3 font-display text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-[#776258]">Presentación visual preparada para ampliar con información y fotografías confirmadas.</p></div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Differentiators() {
  return (
    <section className="bg-[#fffaf5] py-24 text-[#2b2420] md:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="lg:pb-8"><p className="eyebrow text-brand">Una atención más cercana</p><h2 className="mt-5 max-w-lg font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-5xl">Cada proyecto merece una solución textil bien pensada.</h2><p className="mt-6 max-w-md leading-relaxed text-[#735e53] md:text-lg">Escuchamos la necesidad de cada cliente para convertirla en una pieza funcional, presentable y coherente con su propósito.</p></div>
          <div className="grid gap-px overflow-hidden border border-[#e0d2c6] bg-[#e0d2c6] sm:grid-cols-2">
            {differentiators.map(({ title, description, icon: Icon }) => <article key={title} className="min-h-52 bg-[#f8f1e9] p-6"><Icon className="h-5 w-5 text-brand" /><h3 className="mt-8 font-display text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-[#735e53]">{description}</p></article>)}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Process() {
  return (
    <section className="border-y border-[#d8c7b8] bg-[#5d392e] py-24 text-[#fff9f4] md:py-32">
      <Container>
        <SectionHeader eyebrow="Proceso CYMT" title="De la idea a la pieza final" description="Una forma clara de acompañar tu proyecto desde el primer mensaje hasta la coordinación de entrega." />
        <ol className="relative mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:before:absolute xl:before:left-[12.5%] xl:before:right-[12.5%] xl:before:top-7 xl:before:border-t xl:before:border-dashed xl:before:border-white/30">
          {processSteps.map(({ number, title, description }) => <li key={number} className="relative border border-white/20 bg-white/5 p-7 xl:border-y-0 xl:border-r-0 xl:bg-transparent xl:first:border-l-0"><span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#5d392e] text-xs font-semibold tracking-[0.18em] text-[#e9c3ac]">{number}</span><h2 className="mt-10 font-display text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-[#eadbd1]">{description}</p></li>)}
        </ol>
      </Container>
    </section>
  );
}

function FlexibilityAndCta() {
  return (
    <>
      <section className="bg-[#f4ede3] py-24 text-[#2b2420] md:py-32"><Container><div className="grid overflow-hidden border border-[#d7c5b7] bg-[#fffaf5] lg:grid-cols-[1fr_0.9fr]"><div className="p-8 md:p-14"><p className="eyebrow text-brand">Más allá de las líneas visibles</p><h2 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-5xl">También desarrollamos proyectos textiles especiales.</h2><p className="mt-6 max-w-xl leading-relaxed text-[#735e53] md:text-lg">Si tu necesidad no encaja en una categoría todavía, conversemos. Esta sección está pensada para crecer junto a los productos que tu proyecto requiera.</p><div className="mt-9 flex items-center gap-3 border-t border-[#ddcdbf] pt-5 text-sm font-medium text-[#5b3b30]"><Wrench className="h-5 w-5 text-brand" /> Propuestas textiles a partir de tu requerimiento</div></div><TextilePlaceholder label="Fotografía de proyecto textil especial pendiente" className="min-h-80 lg:min-h-full" /></div></Container></section>
      <section className="bg-[#f4ede3] pb-24 text-[#2b2420] md:pb-32"><Container><div className="relative overflow-hidden border border-[#be8b73] bg-[#2f2521] px-7 py-16 text-[#fff9f4] md:px-14 md:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(229,9,20,0.32),transparent_28%),linear-gradient(120deg,transparent,rgba(255,255,255,0.06))]" /><div className="relative max-w-2xl"><p className="eyebrow text-[#efc9b3]">Confección CYMT</p><h2 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-5xl">¿Tenés un proyecto textil en mente?</h2><p className="mt-5 text-[#e3d0c3] md:text-lg">Contanos qué necesitás y coordinemos una propuesta para tu marca, negocio o equipo.</p><a href={site.whatsapp.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "mt-9")}><MessageCircle className="h-4 w-4" /> Consultar por WhatsApp</a></div></div></Container></section>
    </>
  );
}

function MachineryCrossSell() {
  return (
    <section className="bg-[#fffaf5] pb-20 text-[#2b2420] md:pb-28"><Container><div className="grid overflow-hidden border border-[#e0d2c6] lg:grid-cols-[0.85fr_1.15fr]"><div className="flex min-h-72 items-center justify-center bg-[#c9aa97] p-8"><ClipboardList className="h-16 w-16 text-[#fff7ef]/80" /></div><div className="flex items-center p-7 md:p-12"><div className="max-w-xl"><p className="eyebrow text-[#a2745e]">Para proyectos de producción</p><h2 className="mt-4 font-display text-4xl font-bold">Conocé nuestra línea de maquinaria</h2><p className="mt-4 leading-relaxed text-[#735e53] md:text-lg">Si tu proyecto también necesita soluciones para el taller, explorá la experiencia de Maquinaria CYMT.</p><Link href="/confeccion/maquinas" className={cn(buttonVariants({ variant: "secondary" }), "mt-8")}><ArrowRight className="h-4 w-4" /> Ver maquinaria</Link></div></div></div></Container></section>
  );
}

export function ConfectionLanding() {
  return <><Hero /><Categories /><ProductLines /><Differentiators /><Process /><FlexibilityAndCta /><MachineryCrossSell /></>;
}
