"use client";

import { Package, Tag, Image as ImageIcon, LayoutGrid, DollarSign, Boxes, LogOut } from "lucide-react";
import { Container } from "@/components/ui";
import { DropsBulkOrganizer } from "@/components/admin/drops-bulk-organizer";
import { DropCoverManager } from "@/components/admin/drop-cover-manager";
import { DropManager } from "@/components/admin/drop-manager";
import { HomeHeroManager } from "@/components/admin/home-hero-manager";
import { SuspiciousVariantsReview } from "@/components/admin/suspicious-variants-review";
import { allTypes } from "@/data/catalog";
import { useLiveProducts } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";
import { logoutAdmin } from "./actions";

/**
 * Admin — ARCHITECTURE READY (read-only preview + stats del catálogo vivo).
 * No reescribe la tienda; solo refleja el estado actual del catálogo.
 */
export default function AdminPage() {
  const products = useLiveProducts();
  const drops = useDrops();
  const featuredCount = products.filter((p) => p.featured).length;
  const typesCount = Array.from(new Set(products.map((p) => p.type))).length || allTypes.length;

  const stats = [
    { label: "Productos", value: products.length, icon: Package },
    { label: "Drops", value: drops.length, icon: LayoutGrid },
    { label: "Tipos", value: typesCount, icon: Boxes },
    { label: "Destacados", value: featuredCount, icon: Tag },
  ];

  const modules = [
    { icon: Package, title: "Productos", desc: "Crear, editar y despublicar productos." },
    { icon: DollarSign, title: "Precios y ofertas", desc: "Ajustar precios, compare-at y estados." },
    { icon: ImageIcon, title: "Imágenes", desc: "Subir y ordenar mockups por producto." },
  ];

  return (
    <Container className="py-16">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
        Panel de administración
      </span>
      <div className="flex justify-end">
  <form action={logoutAdmin}>
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-brand/40 hover:text-brand"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  </form>
</div>
      <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">CYMT Admin</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        El catálogo vivo ya permite crear productos ilimitados por colección desde cada Drop
        (botón “Nuevo Producto” con Modo Editor activo). Esta vista resume el estado actual.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5">
            <Icon className="h-5 w-5 text-brand" />
            <p className="mt-3 font-display text-3xl font-bold">{value}</p>
            <p className="text-sm text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <HomeHeroManager />
      <SuspiciousVariantsReview />
      <DropManager />
      <DropsBulkOrganizer />
      <DropCoverManager />

      <h2 className="mt-12 font-display text-xl font-semibold">Módulos planificados</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="pointer-events-none cursor-not-allowed rounded-2xl border border-dashed border-line bg-bg-soft p-5 opacity-80"
          >
            <Icon className="h-5 w-5 text-ink-muted" />
            <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{desc}</p>
            <span className="mt-3 inline-block text-xs text-ink-faint">Próximamente</span>
          </div>
        ))}
      </div>
    </Container>
  );
}
