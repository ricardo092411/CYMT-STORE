"use client";

import { AlertTriangle, ScanSearch } from "lucide-react";
import type { Product } from "@/data/catalog";
import { useEditor, useLiveProducts } from "@/providers/editor-provider";
import { getSuspiciousVariants } from "@/lib/suspicious-variants";

function suspiciousColorText(product: Product): string {
  const labels = getSuspiciousVariants(product).map(
    (variant) => variant.colorName?.trim() || "Sin color (requiere revisión)",
  );
  return labels.join(" · ");
}

export function SuspiciousVariantsReview() {
  const products = useLiveProducts();
  const { openEditor } = useEditor();
  const suspiciousProducts = products.filter((product) => getSuspiciousVariants(product).length > 0);

  return (
    <section className="mt-12 rounded-2xl border border-brand/30 bg-brand-soft/40 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Variantes por revisar</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Productos cuyo color requiere revisión manual. No se modifica ningún dato hasta
              guardar desde el editor.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-brand/30 bg-surface px-3 py-1 text-sm font-semibold text-brand">
          {suspiciousProducts.length} {suspiciousProducts.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      {suspiciousProducts.length === 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface/50 px-4 py-4 text-sm text-ink-muted">
          <ScanSearch className="h-4 w-4 text-brand" />
          No hay variantes sospechosas pendientes.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Color actual</th>
                <th className="px-4 py-3 font-medium">Variantes</th>
                <th className="px-4 py-3 font-medium">Imágenes</th>
                <th className="px-4 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {suspiciousProducts.map((product) => {
                const variants = product.productVariants ?? [];
                const imageCount = variants.reduce((total, variant) => total + variant.images.length, 0);

                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{product.slug}</td>
                    <td className="max-w-xs px-4 py-3 text-ink-muted">{suspiciousColorText(product)}</td>
                    <td className="px-4 py-3 text-ink-muted">{variants.length}</td>
                    <td className="px-4 py-3 text-ink-muted">{imageCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditor(product.id)}
                        className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-bright"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
