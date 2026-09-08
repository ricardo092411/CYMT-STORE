"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, Search, X, Plus } from "lucide-react";
import { ProductCard } from "./product-card";
import { Container } from "@/components/ui";
import { useEditor, useLiveProducts } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";
import type { Drop } from "@/types/drop";
import { cn } from "@/lib/utils";
import { getStorefrontProductMedia } from "@/lib/product-media";

type SortKey = "featured" | "new" | "price-asc" | "price-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Destacados" },
  { key: "new", label: "Novedades" },
  { key: "price-asc", label: "Precio: menor a mayor" },
  { key: "price-desc", label: "Precio: mayor a menor" },
];

const PRICE_RANGES: { key: string; label: string; test: (p: number) => boolean }[] = [
  { key: "all", label: "Cualquiera", test: () => true },
  { key: "lt25", label: "Menos de $25", test: (p) => p < 25 },
  { key: "25-50", label: "$25 – $50", test: (p) => p >= 25 && p <= 50 },
  { key: "gt50", label: "Más de $50", test: (p) => p > 50 },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Navegador de productos.
 * Usa el catálogo vivo (base + productos creados en el editor, sin límite).
 * Si se pasa `scopedDrop`, solo muestra productos de esa colección.
 */
export function ProductBrowser({
  scopedDrop,
}: {
  scopedDrop?: Drop;
}) {
  const liveProducts = useLiveProducts();
  const { createProduct, enabled } = useEditor();
  const drops = useDrops();
  const liveDrops = drops.filter((drop) => drop.live);

  const products = useMemo(() => {
    return scopedDrop ? liveProducts.filter((p) => p.dropSlug === scopedDrop.slug) : liveProducts;
  }, [liveProducts, scopedDrop]);

  const [query, setQuery] = useState("");
  const [dropsSel, setDropsSel] = useState<string[]>([]);
  const [typesSel, setTypesSel] = useState<string[]>([]);
  const [variantsSel, setVariantsSel] = useState<string[]>([]);
  const [sizesSel, setSizesSel] = useState<string[]>([]);
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [priceKey, setPriceKey] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [mobileOpen, setMobileOpen] = useState(false);

  const availableVariants = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const color of getStorefrontProductMedia(p).filterColors) {
        set.add(color);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.type)));
  }, [products]);

  const availableSizes = useMemo(() => {
    return Array.from(new Set(products.flatMap((p) => p.sizes)));
  }, [products]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, arr: string[], v: string) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const priceTest = PRICE_RANGES.find((r) => r.key === priceKey)?.test ?? (() => true);
    const list = products.filter((p) => {
      if (
        q &&
        [p.name, p.type, p.description, p.dropSlug, ...(p.tags ?? []), ...getStorefrontProductMedia(p).filterColors]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (!scopedDrop && dropsSel.length > 0 && !dropsSel.includes(p.dropSlug)) return false;
      if (typesSel.length > 0 && !typesSel.includes(p.type)) return false;
      if (
        variantsSel.length > 0 &&
        !getStorefrontProductMedia(p).filterColors.some((color) => variantsSel.includes(color))
      )
        return false;
      if (sizesSel.length > 0 && !p.sizes.some((s) => sizesSel.includes(s))) return false;
      if (onlyAvail && p.status === "agotado") return false;
      if (!priceTest(p.price)) return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "new":
        return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      default:
        return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
  }, [products, query, dropsSel, typesSel, variantsSel, sizesSel, onlyAvail, priceKey, sort, scopedDrop]);

  const activeCount =
    dropsSel.length +
    typesSel.length +
    variantsSel.length +
    sizesSel.length +
    (onlyAvail ? 1 : 0) +
    (priceKey !== "all" ? 1 : 0);

  function clearAll() {
    setDropsSel([]);
    setTypesSel([]);
    setVariantsSel([]);
    setSizesSel([]);
    setOnlyAvail(false);
    setPriceKey("all");
    setQuery("");
  }

  const FilterGroup = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{title}</h3>
      {children}
    </div>
  );

  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );

  const FiltersBody = (
    <div>
      <div className="relative lg:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          className="h-10 w-full rounded-full border border-line bg-bg pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      {!scopedDrop && (
        <FilterGroup title="Drop">
          <div className="flex flex-wrap gap-2">
            {liveDrops.map((d) => (
              <Chip key={d.slug} active={dropsSel.includes(d.slug)} onClick={() => toggle(setDropsSel, dropsSel, d.slug)}>
                {d.name}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Tipo">
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((t) => (
            <Chip key={t} active={typesSel.includes(t)} onClick={() => toggle(setTypesSel, typesSel, t)}>
              {t}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      {availableVariants.length > 0 && (
        <FilterGroup title="Variante">
          <div className="flex flex-wrap gap-2">
            {availableVariants.map((v) => (
              <Chip key={v} active={variantsSel.includes(v)} onClick={() => toggle(setVariantsSel, variantsSel, v)}>
                {v}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Talla">
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((s) => (
            <Chip key={s} active={sizesSel.includes(s)} onClick={() => toggle(setSizesSel, sizesSel, s)}>
              {s}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Precio">
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((r) => (
            <label key={r.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="radio"
                name="price"
                checked={priceKey === r.key}
                onChange={() => setPriceKey(r.key)}
                className="accent-brand"
              />
              {r.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Disponibilidad">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={onlyAvail}
            onChange={(e) => setOnlyAvail(e.target.checked)}
            className="accent-brand"
          />
          Solo disponibles
        </label>
      </FilterGroup>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="mt-2 text-xs font-medium text-brand underline-offset-4 hover:underline"
        >
          Limpiar filtros ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <Container className="py-10 md:py-14">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "producto" : "productos"}
          {scopedDrop ? (
            <span className="text-ink-faint"> · lista dinámica sin límite</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* MODO EDITOR — crear producto en esta colección */}
          {enabled && scopedDrop && (
            <button
              type="button"
              onClick={() => createProduct(scopedDrop.slug)}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(229,9,20,0.8)] transition hover:bg-brand-bright"
            >
              <Plus className="h-4 w-4" /> Nuevo Producto
            </button>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 text-sm text-ink lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[0.65rem] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          <label className="relative hidden items-center sm:flex">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-10 w-48 rounded-full border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink outline-none transition-all focus:w-60 focus:border-brand"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Ordenar"
            className="h-10 rounded-full border border-line bg-surface-2 px-4 text-sm text-ink outline-none focus:border-brand"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{FiltersBody}</div>
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-line py-24 text-center">
              <p className="font-display text-lg font-semibold">Sin resultados</p>
              <p className="mt-1 text-sm text-ink-muted">Prueba ajustar los filtros o la búsqueda.</p>
              {enabled && scopedDrop ? (
                <button
                  type="button"
                  onClick={() => createProduct(scopedDrop.slug)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Nuevo Producto
                </button>
              ) : (
                <button onClick={clearAll} className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-line bg-bg-soft p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Filtros</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {FiltersBody}
              <button
                onClick={() => setMobileOpen(false)}
                className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white"
              >
                Ver {filtered.length} productos
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Container>
  );
}
