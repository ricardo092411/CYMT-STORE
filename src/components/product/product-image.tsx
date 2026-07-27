import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Product } from "@/data/catalog";

/**
 * Renders a product image with automatic WebP/AVIF + lazy loading (next/image).
 * If the product has no photo yet, it renders an elegant branded tile so the
 * catalog always looks premium — and adding a real mockup later is as easy as
 * dropping a file in /public/images/products/ and listing it in catalog.ts.
 */
export function ProductImage({
  product,
  index = 0,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw",
  priority = false,
}: {
  product: Product;
  index?: number;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const src = product.images[index];

  // Imágenes locales del Modo Editor (data/blob URLs): next/image no las
  // soporta, así que se renderizan con <img> nativo. Las rutas normales de
  // /public siguen usando next/image exactamente igual que antes.
  if (src && (src.startsWith("data:") || src.startsWith("blob:"))) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={product.name}
          className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
        />
      </div>
    );
  }

  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", className)}>
        <Image
          src={src}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imgClassName)}
        />
      </div>
    );
  }

  return <ProductFallback product={product} className={className} />;
}

function ProductFallback({ product, className }: { product: Product; className?: string }) {
  /* El sistema de variantes ya no depende de círculos de color;
     el acento visual del fallback sigue usando un tono de marca estable. */
  const accent = product.colors[0]?.hex ?? "#e50914";
  const initial = product.name.trim().charAt(0).toUpperCase() || "C";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-surface-2 to-bg",
        className,
      )}
    >
      <div
        className="absolute -inset-12 opacity-50"
        style={{ background: `radial-gradient(circle at 28% 18%, ${accent}40, transparent 60%)` }}
      />
      <div
        className="absolute -bottom-16 -right-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative px-4 text-center">
        <span className="block font-display text-[5.5rem] font-bold leading-none text-ink/90">
          {initial}
        </span>
        <span className="mt-3 block text-[0.6rem] uppercase tracking-[0.32em] text-ink-faint">
          {product.type}
        </span>
      </div>
    </div>
  );
}
