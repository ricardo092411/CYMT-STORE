"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { QuantityStepper } from "@/components/product/product-card";
import { Container, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { cart, cartSubtotal, setQuantity, removeFromCart, clearCart, hydrated } = useStore();

  if (!hydrated) {
    return (
      <Container className="py-24">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className="py-24">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="h-7 w-7 text-ink-faint" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Tu carrito está vacío</h1>
          <p className="mt-2 text-ink-muted">Descubre los drops y encuentra tu próxima pieza.</p>
          <Link href="/tienda" className={`${buttonVariants({ variant: "primary" })} mt-6`}>
            Explorar tienda
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Tu carrito</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {cart.map((item) => (
              <li key={item.key} className="flex gap-4 py-5">
                <Link
                  href={`/producto/${item.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface"
                >
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-bg font-display text-3xl font-bold text-ink/80">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/producto/${item.slug}`} className="font-medium text-ink">
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {item.color} · Talla {item.size}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.key)}
                      aria-label="Eliminar"
                      className="text-ink-faint transition hover:text-brand"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper value={item.quantity} onChange={(v) => setQuantity(item.key, v)} />
                    <span className="font-display font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={clearCart}
            className="mt-4 text-sm text-ink-faint underline-offset-4 transition hover:text-brand hover:underline"
          >
            Vaciar carrito
          </button>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">Resumen</h2>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-medium">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-ink-muted">Envío</span>
              <span className="text-ink-faint">Se confirma por WhatsApp</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-ink-muted">Total</span>
              <span className="font-display text-2xl font-bold">{formatPrice(cartSubtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(229,9,20,0.85)] transition hover:bg-brand-bright"
            >
              Finalizar compra <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2.5 text-[0.72rem] leading-relaxed text-brand">
              {site.productionNote}
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
