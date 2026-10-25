import type { LucideIcon } from "lucide-react";
import { CheckCircle2, FolderCog, Image as ImageIcon, Layers3, Package, Shapes } from "lucide-react";
import { type AdminModuleDefinition } from "@/lib/admin-modules";

const areaIcons: LucideIcon[] = [FolderCog, Layers3, Package, ImageIcon, Shapes];

export function AdminModulePlaceholder({ module }: { module: AdminModuleDefinition }) {
  return (
    <div>
      <section className="max-w-3xl border-b border-white/10 pb-8 md:pb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">Módulo preparado</p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">{module.title}</h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-400 md:text-lg">{module.description}</p>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Áreas futuras de ${module.title}`}>
        {module.futureAreas.map((area, index) => {
          const Icon = areaIcons[index % areaIcons.length] ?? Shapes;
          return <article key={area} className="min-h-44 border border-white/10 bg-[#17181c] p-6"><Icon className="h-5 w-5 text-zinc-500" /><h3 className="mt-7 font-display text-xl font-semibold text-white">{area}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">Configuración pendiente para una próxima fase del CMS.</p></article>;
        })}
      </section>
      <div className="mt-8 flex items-start gap-3 border border-brand/20 bg-brand/5 p-5 text-sm leading-relaxed text-zinc-400"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><p>La estructura del módulo está lista. Esta fase no crea ni modifica contenido, productos, imágenes ni archivos.</p></div>
    </div>
  );
}
