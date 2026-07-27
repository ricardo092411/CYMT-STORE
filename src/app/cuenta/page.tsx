import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Heart, MapPin, History, Lock } from "lucide-react";
import { Container, buttonVariants } from "@/components/ui";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Gestiona pedidos, favoritos y direcciones.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cuenta" },
};

/**
 * Account page — ARCHITECTURE READY (not enforced).
 * The store works fully without an account; these modules are placeholders
 * for the future authenticated experience.
 */
export default function AccountPage() {
  const sections = [
    { icon: ShoppingBag, title: "Pedidos", desc: "Rastrea y revisa tus pedidos.", enabled: false },
    { icon: Heart, title: "Favoritos", desc: "Tus productos guardados.", enabled: true, href: "/favoritos" },
    { icon: MapPin, title: "Direcciones", desc: "Guarda tus direcciones de envío.", enabled: false },
    { icon: History, title: "Historial", desc: "Tu actividad y compras pasadas.", enabled: false },
  ];

  return (
    <Container className="py-16">
      <p className="eyebrow mb-3">Cuenta</p>
      <h1 className="font-display text-3xl font-bold md:text-4xl">Mi cuenta</h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        No necesitas una cuenta para comprar en CYMT STORE. Pronto podrás iniciar sesión para
        gestionar pedidos, favoritos y direcciones.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map(({ icon: Icon, title, desc, enabled, href }) => {
          const content = (
            <div className="group relative h-full rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong">
              <Icon className="h-6 w-6 text-brand" />
              <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{desc}</p>
              {!enabled && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-faint">
                  <Lock className="h-3 w-3" /> Próximamente
                </span>
              )}
            </div>
          );
          return enabled && href ? (
            <Link key={title} href={href} className="block">
              {content}
            </Link>
          ) : (
            <div key={title}>{content}</div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-bg-soft p-6">
        <h2 className="font-display text-lg font-semibold">¿Compraste sin cuenta?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tu carrito y favoritos se guardan en este dispositivo. Para finalizar una compra solo
          completa el formulario y envía tu pedido por WhatsApp.
        </p>
        <Link href="/tienda" className={`${buttonVariants({ variant: "secondary", size: "sm" })} mt-4`}>
          Ir a la tienda
        </Link>
      </div>
    </Container>
  );
}
