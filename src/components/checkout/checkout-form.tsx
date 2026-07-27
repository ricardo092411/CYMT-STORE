"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight, ShoppingBag, Info } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { buildOrderMessage, whatsappOrderUrl, type OrderCustomer } from "@/lib/whatsapp";
import { site } from "@/data/site";
import { formatPrice } from "@/lib/utils";
import { Container, buttonVariants } from "@/components/ui";

const DEPARTMENTS = [
  "Ahuachapán", "Santa Ana", "Sonsonate", "Chalatenango", "La Libertad",
  "San Salvador", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
  "Usulután", "San Miguel", "Morazán", "La Unión",
];

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none transition focus:border-brand placeholder:text-ink-faint";
const labelClass = "mb-1.5 block text-xs uppercase tracking-wider text-ink-muted";

export function CheckoutForm() {
  const { cart, cartSubtotal, clearCart } = useStore();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<OrderCustomer>({
    name: "",
    department: "",
    municipality: "",
    address: "",
    reference: "",
  });

  function set<K extends keyof OrderCustomer>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    const lines = cart.map((i) => ({
      name: i.name,
      type: i.type,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
      price: i.price,
    }));
    const message = buildOrderMessage(lines, form, cartSubtotal);
    const url = whatsappOrderUrl(message);
    window.open(url, "_blank");
    setSubmitted(true);
    clearCart();
  }

  // Success state
  if (submitted) {
    return (
      <Container className="py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">¡Pedido enviado!</h1>
          <p className="mt-3 text-ink-muted">
            Abrimos WhatsApp con tu pedido completo. Presiona enviar para que nuestro equipo lo
            reciba y te confirme el total y los datos de transferencia.
          </p>
          <div className="mt-6 w-full rounded-2xl border border-brand/20 bg-brand-soft px-5 py-4 text-left text-sm leading-relaxed text-brand">
            <strong className="font-semibold">Importante:</strong> {site.productionNote}
          </div>
          <Link href="/tienda" className={`${buttonVariants({ variant: "primary" })} mt-8`}>
            Seguir comprando <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    );
  }

  // Empty cart
  if (cart.length === 0) {
    return (
      <Container className="py-24">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="h-7 w-7 text-ink-faint" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Tu carrito está vacío</h1>
          <p className="mt-2 text-ink-muted">Agrega productos para finalizar tu compra.</p>
          <Link href="/tienda" className={`${buttonVariants({ variant: "primary" })} mt-6`}>
            Explorar tienda
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Finalizar compra</h1>
      <p className="mt-2 text-ink-muted">
        Completa tus datos y enviaremos el pedido por WhatsApp. Pago por transferencia bancaria.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
            <h2 className="font-display text-lg font-semibold">Datos de envío</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>Nombre completo *</label>
                <input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Tu nombre" className={inputClass} />
              </div>
              <div>
                <label htmlFor="department" className={labelClass}>Departamento *</label>
                <select id="department" required value={form.department} onChange={(e) => set("department", e.target.value)} className={inputClass}>
                  <option value="" disabled>Selecciona</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="municipality" className={labelClass}>Municipio *</label>
                <input id="municipality" required value={form.municipality} onChange={(e) => set("municipality", e.target.value)} placeholder="Municipio" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>Dirección *</label>
                <input id="address" required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Calle, casa, número" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="reference" className={labelClass}>
                  Referencia <span className="normal-case text-ink-faint">(opcional)</span>
                </label>
                <input id="reference" value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Punto de referencia, landmarks…" className={inputClass} />
              </div>
            </div>
          </div>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_rgba(229,9,20,0.85)] transition hover:bg-brand-bright">
            <WhatsAppIconInline className="h-5 w-5" /> Enviar pedido por WhatsApp
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
            <Info className="h-3.5 w-3.5" /> Se abrirá WhatsApp con tu pedido listo para enviar.
          </p>
        </form>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
            <h2 className="font-display text-lg font-semibold">Tu pedido</h2>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {cart.map((item) => (
                <li key={item.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-bg font-display text-lg font-bold text-ink/80">
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-ink-faint">{item.color} · {item.size} · ×{item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-ink-muted">Total</span>
              <span className="font-display text-xl font-bold">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="mt-4 rounded-xl bg-brand-soft px-3 py-2.5 text-[0.72rem] leading-relaxed text-brand">
              {site.productionNote}
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function WhatsAppIconInline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}
