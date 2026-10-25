"use client";

import { Boxes, Image as ImageIcon, LayoutGrid, Package, Tag } from "lucide-react";
import { DropsBulkOrganizer } from "@/components/admin/drops-bulk-organizer";
import { DropCoverManager } from "@/components/admin/drop-cover-manager";
import { DropManager } from "@/components/admin/drop-manager";
import { HomeHeroManager } from "@/components/admin/home-hero-manager";
import { SuspiciousVariantsReview } from "@/components/admin/suspicious-variants-review";
import { useLiveProducts } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";
import { allTypes } from "@/data/catalog";

/** Existing Camisas administration, relocated intact beneath the central admin shell. */
export function ShirtsAdminWorkspace() {
  const products = useLiveProducts();
  const drops = useDrops();
  const featuredCount = products.filter((product) => product.featured).length;
  const typesCount = Array.from(new Set(products.map((product) => product.type))).length || allTypes.length;
  const stats = [
    { label: "Productos", value: products.length, icon: Package },
    { label: "Drops", value: drops.length, icon: LayoutGrid },
    { label: "Tipos", value: typesCount, icon: Boxes },
    { label: "Destacados", value: featuredCount, icon: Tag },
  ];

  return (
    <div>
      <section className="border-b border-white/10 pb-8 md:pb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">Módulo activo</p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">Camisas</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">Administración existente de productos, variantes, imágenes, drops y contenido del storefront.</p>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-white/10 bg-[#17181c] p-5">
            <Icon className="h-5 w-5 text-brand" />
            <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <HomeHeroManager />
      <SuspiciousVariantsReview />
      <DropManager />
      <DropsBulkOrganizer />
      <DropCoverManager />

      <section className="mt-12 border border-dashed border-white/15 bg-white/[0.02] p-5"><ImageIcon className="h-5 w-5 text-zinc-500" /><h3 className="mt-4 font-display text-lg font-semibold text-white">Herramientas futuras</h3><p className="mt-2 text-sm text-zinc-500">Precios, ofertas y administración adicional del catálogo se incorporarán sin reemplazar estas herramientas activas.</p></section>
    </div>
  );
}
