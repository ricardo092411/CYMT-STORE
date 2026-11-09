import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { InkProductGallery } from "@/components/inks/ink-product-gallery";
import { InkShowcaseMedia } from "@/components/inks/ink-showcase-media";
import { Container, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import type { PublicInkProductDetail } from "@/lib/public-inks";
import { cn } from "@/lib/utils";

export function InkProductDetail({ product }: { product: PublicInkProductDetail }) {
  return (
    <>
      <main className="border-b border-line bg-bg-soft">
        <Container className="py-10 md:py-14">
          <Link
            href="/tintas"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted transition hover:text-[#b8f36b]"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a CMT Ink
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
            <InkProductGallery name={product.name} images={product.images} />

            <section className="flex flex-col">
              <p className="eyebrow text-[#b8f36b]">CMT Ink · Glow in the Dark</p>
              <h1 className="mt-4 text-balance text-4xl font-bold leading-[0.95] md:text-6xl">
                {product.name}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">{product.shortDescription}</p>
              {product.priceNote && (
                <p className="mt-6 inline-flex w-fit border border-[#b8f36b]/35 bg-[#b8f36b]/10 px-3 py-2 text-sm font-semibold text-[#b8f36b]">
                  {product.priceNote}
                </p>
              )}
              {product.description && <p className="mt-7 leading-relaxed text-ink-muted">{product.description}</p>}
              {product.specifications.length > 0 && (
                <div className="mt-8 border-y border-line">
                  {product.specifications.map((specification) => (
                    <div
                      key={`${specification.label}-${specification.value}`}
                      className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 border-b border-line px-1 py-3 text-sm last:border-b-0"
                    >
                      <span className="font-semibold text-ink-soft">{specification.label}</span>
                      <span className="text-ink-muted">{specification.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <a
                href={site.whatsapp.link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }), "mt-9 w-fit")}
              >
                <MessageCircle className="h-4 w-4" /> Cotizar por WhatsApp
              </a>
            </section>
          </div>
        </Container>
      </main>
      <InkShowcaseMedia media={product.showcaseMedia} productName={product.name} />
    </>
  );
}
