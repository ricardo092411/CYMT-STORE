"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { useLiveProducts } from "@/providers/editor-provider";
import { Price } from "@/components/ui";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const products = useLiveProducts();
  const [query, setQuery] = useState("");

  // Reset the query each time the overlay opens
  useEffect(() => {
    if (searchOpen) setQuery("");
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        [p.name, p.type, p.description, p.dropSlug, ...(p.tags ?? []), ...(p.variants ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [query, products]);

  const popular = ["Anime", "Hoodie", "Rock", "Retro", "Cap"].filter((t) =>
    t.toLowerCase().includes(query.trim().toLowerCase()) || !query.trim(),
  );

  return (
    <AnimatePresence>
      {searchOpen && (
        <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="Buscar">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSearchOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute inset-x-0 top-0 mx-auto w-full max-w-3xl px-4 pt-[12vh]"
          >
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search className="h-5 w-5 shrink-0 text-ink-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, drops, estilos…"
                  className="h-16 w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-faint"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  aria-label="Cerrar búsqueda"
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-3">
                {!query.trim() && (
                  <div className="px-2 py-3">
                    <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">Sugerencias</p>
                    <div className="flex flex-wrap gap-2">
                      {popular.map((t) => (
                        <button
                          key={t}
                          onClick={() => setQuery(t)}
                          className="rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-line-strong hover:text-ink"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query.trim() && results.length === 0 && (
                  <p className="px-2 py-8 text-center text-sm text-ink-muted">
                    No encontramos resultados para “{query}”. Prueba con otro término.
                  </p>
                )}

                {results.length > 0 && (
                  <ul className="flex flex-col">
                    {results.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/producto/${p.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-4 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
                        >
                          <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                            {p.images[0] ? (
                              <Image src={p.images[0]} alt={p.name} fill sizes="56px" className="object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-bg font-display text-xl font-bold text-ink/80">
                                {p.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-ink">{p.name}</p>
                            <p className="text-xs uppercase tracking-wider text-ink-faint">{p.type}</p>
                          </div>
                          <Price price={p.price} compareAtPrice={p.compareAtPrice} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
