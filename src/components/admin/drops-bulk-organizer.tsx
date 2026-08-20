"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/ui";
import { useEditor, useLiveProducts } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";
import { cn } from "@/lib/utils";

type VisibilityFilter = "all" | "without-drop" | "with-drop";

type Confirmation =
  | { action: "assign"; dropSlug: string }
  | { action: "remove" };

function hasDrop(dropSlug: string): boolean {
  return dropSlug.trim().length > 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible actualizar los Drops";
}

/**
 * Herramienta administrativa para curar manualmente la pertenencia de los
 * productos a los Drops existentes. ProductImage usa el helper relacional de
 * media centralizado, por lo que esta vista no duplica lógica de imágenes.
 */
export function DropsBulkOrganizer() {
  const products = useLiveProducts();
  const { assignProductsToDrop } = useEditor();
  const drops = useDrops();
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [currentDrop, setCurrentDrop] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [targetDrop, setTargetDrop] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dropsBySlug = useMemo(() => new Map(drops.map((drop) => [drop.slug, drop])), [drops]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-SV");

    return products.filter((product) => {
      const productHasDrop = hasDrop(product.dropSlug);
      if (visibility === "without-drop" && productHasDrop) return false;
      if (visibility === "with-drop" && !productHasDrop) return false;
      if (currentDrop && product.dropSlug !== currentDrop) return false;
      if (!normalizedQuery) return true;

      return [product.name, product.slug]
        .join(" ")
        .toLocaleLowerCase("es-SV")
        .includes(normalizedQuery);
    });
  }, [currentDrop, products, query, visibility]);

  const allVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id));

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
    setError(null);
    setNotice(null);
  }

  function selectVisibleProducts() {
    setSelectedIds(new Set(filteredProducts.map((product) => product.id)));
    setError(null);
    setNotice(null);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setError(null);
    setNotice(null);
  }

  function requestAssignment() {
    if (selectedIds.size === 0 || !targetDrop) return;
    setConfirmation({ action: "assign", dropSlug: targetDrop });
    setError(null);
    setNotice(null);
  }

  function requestRemoval() {
    if (selectedIds.size === 0) return;
    setConfirmation({ action: "remove" });
    setError(null);
    setNotice(null);
  }

  async function confirmAssignment() {
    if (!confirmation || selectedIds.size === 0 || isSaving) return;

    const selectedProductIds = products
      .filter((product) => selectedIds.has(product.id))
      .map((product) => product.id);
    if (selectedProductIds.length !== selectedIds.size) {
      setConfirmation(null);
      setError("La selección ya no coincide con el catálogo confirmado. Revisa los productos e inténtalo de nuevo.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const dropSlug = confirmation.action === "assign" ? confirmation.dropSlug : null;
      await assignProductsToDrop(selectedProductIds, dropSlug);
      const count = selectedProductIds.length;
      const assignedDrop = dropSlug ? dropsBySlug.get(dropSlug) : null;
      setSelectedIds(new Set());
      setTargetDrop("");
      setNotice(
        assignedDrop
          ? `${count} ${count === 1 ? "producto fue asignado" : "productos fueron asignados"} a ${assignedDrop.name}.`
          : `Se quitó el Drop de ${count} ${count === 1 ? "producto" : "productos"}.`,
      );
      setConfirmation(null);
    } catch (assignmentError) {
      setError(errorMessage(assignmentError));
      setConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }

  const confirmationText =
    confirmation?.action === "assign"
      ? `Vas a asignar ${selectedIds.size} ${selectedIds.size === 1 ? "producto" : "productos"} al ${
          dropsBySlug.get(confirmation.dropSlug)?.name ?? "Drop seleccionado"
        }.`
      : `Vas a quitar el Drop de ${selectedIds.size} ${selectedIds.size === 1 ? "producto" : "productos"}.`;

  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface p-5 md:p-7" aria-labelledby="organizar-drops-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Curaduría manual</p>
          <h2 id="organizar-drops-title" className="mt-2 font-display text-2xl font-semibold">
            Organizar Drops
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Selecciona productos y confirma una asignación al catálogo real de Drops. Los cambios no alteran variantes, imágenes ni datos comerciales.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-soft">
          Seleccionados: <span className="font-semibold text-ink">{selectedIds.size}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="relative block">
          <span className="sr-only">Buscar por nombre o slug</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">Ver</span>
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="all">Todos</option>
            <option value="without-drop">Sin Drop</option>
            <option value="with-drop">Con Drop</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">Drop actual</span>
          <select
            value={currentDrop}
            onChange={(event) => setCurrentDrop(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Todos los Drops</option>
            {drops.map((drop) => (
              <option key={drop.slug} value={drop.slug}>
                {drop.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line py-4">
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{filteredProducts.length}</span>{" "}
          {filteredProducts.length === 1 ? "producto visible" : "productos visibles"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectVisibleProducts}
            disabled={filteredProducts.length === 0 || allVisibleSelected || isSaving}
            className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            Seleccionar todos los visibles
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={selectedIds.size === 0 || isSaving}
            className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            Deseleccionar todos
          </button>
        </div>
      </div>

      <div className="mt-4 max-h-[42rem] overflow-y-auto rounded-xl border border-line bg-bg">
        {filteredProducts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-display text-lg font-semibold">Sin productos para estos filtros</p>
            <p className="mt-1 text-sm text-ink-muted">Prueba cambiar la búsqueda o el filtro de Drop.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filteredProducts.map((product) => {
              const selected = selectedIds.has(product.id);
              const assignedDrop = dropsBySlug.get(product.dropSlug);
              const currentDropLabel = hasDrop(product.dropSlug)
                ? assignedDrop?.name ?? product.dropSlug
                : "SIN DROP";

              return (
                <li key={product.id} className={cn("transition", selected && "bg-brand-soft/40")}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-3 sm:px-4">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(product.id)}
                      disabled={isSaving}
                      className="h-4 w-4 shrink-0 accent-brand"
                      aria-label={`Seleccionar ${product.name}`}
                    />
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                      <ProductImage product={product} className="h-full w-full" sizes="48px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{product.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{product.slug}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        <span>{product.type}</span>
                        <Price price={product.price} compareAtPrice={product.compareAtPrice} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-ink-muted sm:hidden">
                        {currentDropLabel}
                      </p>
                    </div>
                    <div className="hidden min-w-40 text-right sm:block">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">Drop actual</p>
                      <p className={cn("mt-1 text-sm font-medium", assignedDrop ? "text-ink" : "text-ink-muted")}>
                        {currentDropLabel}
                      </p>
                    </div>
                    {selected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <label>
          <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">Asignar a</span>
          <select
            value={targetDrop}
            onChange={(event) => setTargetDrop(event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Selecciona un Drop existente</option>
            {drops.map((drop) => (
              <option key={drop.slug} value={drop.slug}>
                {drop.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={requestAssignment}
          disabled={selectedIds.size === 0 || !targetDrop || isSaving}
          className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-45"
        >
          Aplicar a seleccionados
        </button>
        <button
          type="button"
          onClick={requestRemoval}
          disabled={selectedIds.size === 0 || isSaving}
          className="h-11 rounded-full border border-line px-5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-45"
        >
          Quitar Drop de seleccionados
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="drop-confirmation-title">
          <button
            type="button"
            aria-label="Cancelar confirmación"
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            onClick={() => !isSaving && setConfirmation(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-bg p-6 shadow-2xl">
            <p className="eyebrow text-brand">Confirmar cambio masivo</p>
            <h3 id="drop-confirmation-title" className="mt-3 font-display text-xl font-semibold">
              Confirmar asignación de Drop
            </h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">{confirmationText}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={isSaving}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmAssignment()}
                disabled={isSaving}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Actualizando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
