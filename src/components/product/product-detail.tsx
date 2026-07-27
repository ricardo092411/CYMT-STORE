"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Check, Truck, ShieldCheck, Pencil } from "lucide-react";
import { ProductImage } from "./product-image";
import { ProductCard } from "./product-card";
import { Price, StatusBadge, Container } from "@/components/ui";
import { QuantityStepper } from "./product-card";
import { useStore } from "@/providers/store-provider";
import { useEditedProduct, useEditor } from "@/providers/editor-provider";
import { EDIT_MODE } from "@/config/edit-mode";
import { site } from "@/data/site";
import { getDrop, type Product } from "@/data/catalog";
import { cn, safeCartImage } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ProductDetail({ product: baseProduct, related }: { product: Product; related: Product[] }) {
  const { addToCart, toggleFavorite, isFavorite } = useStore();
  const { openEditor } = useEditor();
  /* Modo Editor: fusiona overrides del admin (sin EDIT_MODE devuelve el original). */
  const product = useEditedProduct(baseProduct);
  const drop = getDrop(product.dropSlug);

  const singleSize = product.sizes.length === 1;
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(singleSize ? product.sizes[0] : null);
  const [qty, setQty] = useState(1);

  /* La variante se deriva del mockup activo: si el editor definió una para
     esa imagen, se usa; si no, se hace fallback al catálogo original. */
  const currentVariant =
    product.variants?.[activeImg]?.trim() ||
    product.colors[0]?.name ||
    "Única";

  const fav = isFavorite(product.id);
  const soldOut = product.status === "agotado";
  const canAdd = !soldOut && size !== null;

  function handleAdd() {
    if (!canAdd || !size) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      /* Imagen del mockup activo → representa visualmente la variante elegida */
      image: safeCartImage(product.images[activeImg] ?? product.images[0]),
      price: product.price,
      /* La variante seleccionada viaja al carrito y luego al mensaje de WhatsApp */
      color: currentVariant,
      size,
      quantity: qty,
    });
  }

  return (
    <Container className="py-10 md:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-ink-faint">
        <Link href="/" className="hover:text-ink">Inicio</Link>
        <span>/</span>
        <Link href="/tienda" className="hover:text-ink">Tienda</Link>
        {drop && (
          <>
            <span>/</span>
            <Link href={`/drop/${drop.slug}`} className="hover:text-ink">{drop.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-surface">
            {/* Transición suave al cambiar de imagen — controlada por el usuario */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={Math.min(activeImg, Math.max(0, product.images.length - 1))}
                initial={{ opacity: 0, scale: 1.015 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="absolute inset-0"
              >
                <ProductImage
                  product={product}
                  index={Math.min(activeImg, Math.max(0, product.images.length - 1))}
                  className="h-full w-full"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={`${i}-${img.slice(0, 40)}`}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "relative aspect-square w-20 overflow-hidden rounded-xl border bg-surface transition",
                    activeImg === i ? "border-brand" : "border-line hover:border-line-strong",
                  )}
                >
                  <ProductImage product={product} index={i} className="h-full w-full" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:py-2">
          <div className="flex items-center gap-3">
            {drop && (
              <Link
                href={`/drop/${drop.slug}`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-brand"
              >
                {drop.name}
              </Link>
            )}
            <StatusBadge status={product.status} />
            {/* MODO EDITOR — botón discreto, solo visible para el admin */}
            {EDIT_MODE && (
              <button
                type="button"
                onClick={() => openEditor(product.id)}
                aria-label="Editar producto"
                title="Editar producto"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-soft transition duration-300 hover:border-line-strong hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} className="text-2xl" />
          </div>

          <p className="mt-5 leading-relaxed text-ink-muted">{product.description}</p>

          {/* Variante — se selecciona al hacer clic sobre cada miniatura */}
          <div className="mt-7">
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Variante: <span className="text-ink">{currentVariant}</span>
            </p>
            <p className="mt-1 text-[0.72rem] text-ink-faint">
              Selecciona una miniatura para elegir la variante deseada.
            </p>
          </div>

          {/* Sizes */}
          {!singleSize && (
            <div className="mt-7">
              <p className="mb-2.5 text-xs uppercase tracking-wider text-ink-muted">Talla</p>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "min-w-12 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                      size === s
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-surface-2 text-ink hover:border-line-strong",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + add */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} />
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(229,9,20,0.85)] transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {soldOut ? "Agotado" : size === null ? "Selecciona una talla" : "Añadir al carrito"}
            </button>
            <button
              onClick={() => toggleFavorite(product.id)}
              aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full border transition",
                fav ? "border-brand text-brand" : "border-line text-ink hover:border-line-strong",
              )}
            >
              <Heart className={cn("h-5 w-5", fav && "fill-brand")} />
            </button>
          </div>

          {/* Production note */}
          <div className="mt-5 rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand">
            {site.productionNote}
          </div>

          {/* Trust */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-ink-soft">
              <Truck className="h-4 w-4 text-brand" /> Envíos a todo El Salvador
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-brand" /> Pago por transferencia
            </div>
          </div>

          {/* Details */}
          {product.details && product.details.length > 0 && (
            <div className="mt-8 border-t border-line pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">Detalles</h3>
              <ul className="mt-3 space-y-2">
                {product.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold md:text-3xl">También te puede gustar</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}


