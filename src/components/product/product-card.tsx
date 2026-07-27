"use client";

import Link from "next/link";
import { Minus, Plus, Heart, Pencil } from "lucide-react";
import { ProductImage } from "./product-image";
import { Price, StatusBadge } from "@/components/ui";
import { useStore } from "@/providers/store-provider";
import { useEditedProduct, useEditor } from "@/providers/editor-provider";
import { EDIT_MODE } from "@/config/edit-mode";
import { cn, safeCartImage } from "@/lib/utils";
import type { Product } from "@/data/catalog";

/**
 * Premium product tile: image with hover zoom, status badge, favorite toggle,
 * smart quick-add (single-size items add straight to cart; multi-size route to
 * the product page to pick a variant).
 */
export function ProductCard({ product: baseProduct, priority }: { product: Product; priority?: boolean }) {
  const { toggleFavorite, isFavorite, addToCart } = useStore();
  const { openEditor } = useEditor();
  /* Modo Editor: fusiona overrides del admin (sin EDIT_MODE devuelve el original). */
  const product = useEditedProduct(baseProduct);
  const fav = isFavorite(product.id);
  const soldOut = product.status === "agotado";
  const quickAddable = product.sizes.length === 1 && !soldOut;

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      image: safeCartImage(product.images[0]),
      price: product.price,
      color: product.variants?.[0]?.trim() || product.colors[0]?.name || "Única",
      size: product.sizes[0],
      quantity: 1,
    });
  }

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openEditor(product.id);
  }

  return (
    <div className="group flex flex-col">
      <div className="relative">
        <Link href={`/producto/${product.slug}`} className="block" aria-label={product.name}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
            <ProductImage
              product={product}
              className="h-full w-full"
              imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
              priority={priority}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="absolute left-3 top-3">
              <StatusBadge status={product.status} />
            </div>

            <button
              type="button"
              onClick={handleFavorite}
              aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
              aria-pressed={fav}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full glass text-ink transition hover:scale-110 hover:text-brand"
            >
              <Heart className={cn("h-4 w-4 transition", fav && "fill-brand text-brand")} />
            </button>

            {/* MODO EDITOR — botón discreto, solo visible para el admin */}
            {EDIT_MODE && (
              <button
                type="button"
                onClick={handleEdit}
                aria-label="Editar producto"
                title="Editar producto"
                className="absolute right-3 top-14 grid h-9 w-9 place-items-center rounded-full glass text-ink-soft opacity-70 transition duration-300 hover:scale-110 hover:text-brand hover:opacity-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}

            {soldOut && (
              <div className="absolute inset-0 grid place-items-center bg-bg/55 backdrop-blur-[2px]">
                <span className="rounded-full border border-line-strong bg-bg/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                  Agotado
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Quick action */}
        {!soldOut && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            {quickAddable ? (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-bg transition hover:bg-white"
              >
                <Plus className="h-4 w-4" /> Añadir al carrito
              </button>
            ) : (
              <Link
                href={`/producto/${product.slug}`}
                className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-bg transition hover:bg-white"
              >
                Ver opciones
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3.5 flex flex-1 flex-col">
        <p className="text-[0.62rem] uppercase tracking-[0.18em] text-ink-faint">{product.type}</p>
        <Link
          href={`/producto/${product.slug}`}
          className="link-underline mt-1 w-fit font-medium text-ink"
        >
          {product.name}
        </Link>
        <div className="mt-2">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />
        </div>
      </div>
    </div>
  );
}

/* Re-export for convenience in quantity steppers */
export function QuantityStepper({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className={cn("grid place-items-center rounded-full text-ink-soft hover:text-ink", btn)}
        aria-label="Disminuir"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={cn("grid place-items-center rounded-full text-ink-soft hover:text-ink", btn)}
        aria-label="Aumentar"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
