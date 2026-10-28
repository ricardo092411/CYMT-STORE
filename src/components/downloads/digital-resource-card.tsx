import Link from "next/link";
import { ArrowRight, FileCode2, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export type DigitalResourceCardProps = {
  title: string;
  category: string;
  formats?: readonly string[];
  technicalLabels?: readonly string[];
  href?: string;
  previewUrl?: string | null;
  priceCents?: number | null;
  className?: string;
};

export function DigitalResourceCard({
  title,
  category,
  formats = [],
  technicalLabels = [],
  href,
  previewUrl,
  priceCents,
  className,
}: DigitalResourceCardProps) {
  return (
    <article className={cn("group overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-[#101218]">
        {previewUrl ? <img src={previewUrl} alt={title} className="h-full w-full object-cover" /> : <><div className="absolute inset-0 bg-[linear-gradient(rgba(147,197,253,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(147,197,253,0.08)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" /><div className="absolute left-[18%] top-[22%] h-[48%] w-[56%] border border-white/15 bg-surface/80 shadow-2xl" /><div className="absolute left-[23%] top-[30%] h-1.5 w-[33%] bg-brand/80" /><div className="absolute left-[23%] top-[41%] h-1.5 w-[42%] bg-white/15" /><div className="absolute left-[23%] top-[52%] h-1.5 w-[25%] bg-white/10" /></>}
        <span className="absolute bottom-3 left-4 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">{previewUrl ? "Preview del recurso" : "Preview demo"}</span>
      </div>
      <div className="p-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brand">{category}</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">{title}</h3>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {formats.map((format) => (
            <span key={format} className="rounded-md border border-line bg-bg-soft px-2 py-1 text-[0.6rem] font-semibold tracking-[0.1em] text-ink-soft">
              {format}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          {technicalLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-6 flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-lg font-semibold text-ink">{priceCents === undefined || priceCents === null ? "$0.00" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100)}</p>
            <p className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">{priceCents === undefined || priceCents === null ? "Precio demo" : "USD"}</p>
          </div>
          {href ? <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition hover:text-ink"><FileCode2 className="h-4 w-4" /> Ver detalle <ArrowRight className="h-3.5 w-3.5" /></Link> : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted"><FileCode2 className="h-4 w-4" /> Próximamente</span>}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <LockKeyhole className="h-3.5 w-3.5" /> Disponible después del pago
        </p>
      </div>
    </article>
  );
}
