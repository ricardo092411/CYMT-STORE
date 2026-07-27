"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X, ArrowRight, Trash2 } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { QuantityStepper } from "@/components/product/product-card";
import { buttonVariants } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { site } from "@/data/site";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQuantity, removeFromCart, cartSubtotal, cartCount } =
    useStore();

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Carrito">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-bg-soft"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand" />
                <h2 className="font-display text-lg font-semibold">
                  Tu carrito
                  <span className="ml-1.5 text-ink-muted">({cartCount})</span>
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar carrito"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
                  <ShoppingBag className="h-7 w-7 text-ink-faint" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">Tu carrito está vacío</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Descubre los drops disponibles y encuentra tu próxima pieza.
                  </p>
                </div>
                <Link
                  href="/tienda"
                  onClick={() => setCartOpen(false)}
                  className={buttonVariants({ variant: "primary" })}
                >
                  Explorar tienda
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="flex flex-col gap-4">
                    {cart.map((item) => (
                      <li key={item.key} className="flex gap-4">
                        <Link
                          href={`/producto/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-bg font-display text-2xl font-bold text-ink/80">
                              {item.name.charAt(0)}
                            </div>
                          )}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/producto/${item.slug}`}
                              onClick={() => setCartOpen(false)}
                              className="truncate font-medium text-ink"
                            >
                              {item.name}
                            </Link>
                            <button
                              onClick={() => removeFromCart(item.key)}
                              aria-label="Eliminar"
                              className="text-ink-faint transition hover:text-brand"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {item.color} · Talla {item.size}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <QuantityStepper
                              value={item.quantity}
                              onChange={(v) => setQuantity(item.key, v)}
                              size="sm"
                            />
                            <span className="font-display text-sm font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className="border-t border-line px-5 py-4">
                  <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-center text-[0.7rem] leading-relaxed text-brand">
                    {site.productionNote}
                  </p>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Subtotal</span>
                    <span className="font-display text-xl font-bold">{formatPrice(cartSubtotal)}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={() => setCartOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_34px_-12px_rgba(229,9,20,0.8)] transition hover:bg-brand-bright"
                  >
                    Finalizar compra <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-2 w-full rounded-full px-6 py-2.5 text-sm text-ink-muted transition hover:text-ink"
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
