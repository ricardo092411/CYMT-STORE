import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Container, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import type { Product } from "@/data/catalog";

/**
 * Reusable product showcase row used on the home page for featured, new
 * arrivals and best sellers sections.
 */
export function ProductShowcase({
  eyebrow,
  title,
  description,
  products,
  viewAllHref = "/tienda",
  viewAllLabel = "Ver todo",
  priorityCount = 0,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  priorityCount?: number;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={
              <Link
                href={viewAllHref}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
              >
                {viewAllLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 0.06}>
              <ProductCard product={product} priority={i < priorityCount} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
