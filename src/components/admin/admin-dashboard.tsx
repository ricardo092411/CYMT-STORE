import type { LucideIcon } from "lucide-react";
import { ArrowRight, Factory, FolderDown, Paintbrush, Scissors, Shirt } from "lucide-react";
import Link from "next/link";
import { ADMIN_MODULES, type AdminModuleId } from "@/lib/admin-modules";

const moduleIcons: Record<AdminModuleId, LucideIcon> = {
  camisas: Shirt,
  maquinas: Factory,
  tintas: Paintbrush,
  confeccion: Scissors,
  descargas: FolderDown,
};

export function AdminDashboard() {
  return (
    <div>
      <section className="border-b border-white/10 pb-8 md:pb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">Content & Catalog Management</p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">CYMT Admin</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">Gestión de contenido y catálogo para las distintas ramas de CYMT.</p>
      </section>

      <section className="pt-8 md:pt-10" aria-labelledby="modules-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">Áreas de gestión</p><h3 id="modules-title" className="mt-2 font-display text-2xl font-semibold text-white">Módulos centrales</h3></div>
          <p className="text-sm text-zinc-500">Sin métricas inventadas: cada módulo refleja su estado real.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_MODULES.map((module) => {
            const Icon = moduleIcons[module.id];
            const isActive = module.status === "active";
            return (
              <article key={module.id} className="group flex min-h-64 flex-col border border-white/10 bg-[#17181c] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#1b1c21]">
                <div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center border border-white/10 bg-[#101114] text-brand"><Icon className="h-5 w-5" /></span><span className={isActive ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-emerald-300" : "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-zinc-400"}>{isActive ? "Módulo activo" : "Preparado"}</span></div>
                <h4 className="mt-8 font-display text-2xl font-semibold text-white">{module.title}</h4>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">{module.description}</p>
                <Link href={module.href} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-white transition group-hover:text-brand">Administrar <ArrowRight className="h-4 w-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="mt-8 border border-dashed border-white/15 bg-white/[0.02] p-5 text-sm leading-relaxed text-zinc-400 md:mt-10 md:p-6"><span className="font-semibold text-white">Camisas ya está activo.</span> Sus herramientas existentes de catálogo, variantes, imágenes, drops y portada se mantienen en su propio módulo.</section>
    </div>
  );
}
