import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/ui";
import { ProductBrowser } from "@/components/product/product-browser";
import { drops, getDrop, productsByDrop } from "@/data/catalog";
import { site } from "@/data/site";

export function generateStaticParams() {
  return drops.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) return {};
  return {
    title: drop.name,
    description: drop.description,
    alternates: { canonical: `/drop/${drop.slug}` },
    openGraph: {
      title: `${drop.name} — ${drop.title}`,
      description: drop.description,
      images: drop.banner ? [{ url: drop.banner, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) notFound();

  /* Lista seed del catálogo base; ProductBrowser usa el catálogo vivo
     (sin límite) y el botón "Nuevo Producto" en modo editor. */
  const items = productsByDrop(slug);

  return (
    <>
      <section className="relative flex min-h-[46vh] items-end overflow-hidden">
        {drop.banner ? (
          <Image
            src={drop.banner}
            alt={drop.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-bg">
            <div className="glow-red absolute left-1/3 top-0 h-72 w-72" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/20" />
        <Container className="relative z-10 pb-12 pt-32">
          <p className="eyebrow mb-3 text-brand">Drop</p>
          <h1 className="font-display text-5xl font-bold md:text-7xl">{drop.name}</h1>
          <p className="mt-2 text-lg text-ink-soft md:text-xl">{drop.title}</p>
          <p className="mt-4 max-w-xl text-ink-muted">{drop.description}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">
            {site.productionNote}
          </p>
        </Container>
      </section>

      <ProductBrowser products={items} scopedDrop={drop} />
    </>
  );
}
