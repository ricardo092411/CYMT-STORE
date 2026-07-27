"use client";

/**
 * MODO EDITOR — Panel lateral derecho.
 *
 * Reutiliza el patrón visual y de animación del CartDrawer existente
 * (backdrop + aside deslizante con el mismo easing). No navega, no abre
 * ventanas emergentes y no toca el diseño principal de la tienda.
 *
 * Solo se renderiza cuando EDIT_MODE = true y hay un producto activo.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil, ImagePlus, Star, Images, Trash2 } from "lucide-react";
import { useEditor } from "@/providers/editor-provider";
import { EDIT_MODE } from "@/config/edit-mode";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none transition focus:border-brand placeholder:text-ink-faint";
const labelClass = "mb-1.5 block text-xs uppercase tracking-wider text-ink-muted";

/** Convierte archivos seleccionados a data URLs persistibles. */
function filesToDataUrls(files: FileList): Promise<string[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function EditorPanel() {
  const { enabled, activeId, closeEditor, getLiveProduct, updateOverride, deleteProduct } =
    useEditor();

  /* Catálogo vivo: incluye productos base + creados dinámicamente */
  const product = activeId ? getLiveProduct(activeId) : undefined;

  /* Estado fusionado que se muestra en el panel */
  const images = product?.images ?? [];
  const variants = product?.variants ?? [];
  const name = product?.name ?? "";
  const price = product?.price ?? 0;
  const description = product?.description ?? "";
  const type = product?.type ?? "";
  const status = product?.status ?? "nuevo";

  /* El precio se edita como texto para permitir decimales a medio escribir */
  const [priceText, setPriceText] = useState("");
  useEffect(() => {
    if (product) setPriceText(String(product.price));
    // Solo re-sincronizar cuando cambia el producto abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const mockupsInputRef = useRef<HTMLInputElement>(null);

  if (!EDIT_MODE || !enabled) return null;

  /* -------- acciones de imágenes (la portada SIEMPRE es el índice 0) ------- */

  async function handleChangeCover(fileList: FileList | null) {
    if (!product || !fileList || fileList.length === 0) return;
    const [dataUrl] = await filesToDataUrls(fileList);
    const next = [...images];
    if (next.length === 0) next.push(dataUrl);
    else next[0] = dataUrl;
    updateOverride(product.id, { images: next });
  }

  async function handleAddMockups(fileList: FileList | null) {
    if (!product || !fileList || fileList.length === 0) return;
    const dataUrls = await filesToDataUrls(fileList);
    // Se agregan al final: NUNCA se cambia la portada automáticamente.
    // Variantes nuevas inician vacías.
    const nextVariants = [...variants, ...Array(dataUrls.length).fill("")];
    updateOverride(product.id, { images: [...images, ...dataUrls], variants: nextVariants });
  }

  function handleSetCover(index: number) {
    if (!product || index === 0) return;
    const next = [...images];
    const nextVariants = [...variants];
    const [chosen] = next.splice(index, 1);
    const [chosenVariant] = nextVariants.splice(index, 1);
    next.unshift(chosen);
    nextVariants.unshift(chosenVariant);
    updateOverride(product.id, { images: next, variants: nextVariants });
  }

  function handleRemoveImage(index: number) {
    if (!product) return;
    const next = [...images];
    const nextVariants = [...variants];
    next.splice(index, 1);
    nextVariants.splice(index, 1);
    updateOverride(product.id, { images: next, variants: nextVariants });
  }

  function handleVariantChange(index: number, value: string) {
    if (!product) return;
    const nextVariants = [...variants];
    nextVariants[index] = value;
    updateOverride(product.id, { variants: nextVariants });
  }

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Editor de producto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeEditor}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-bg-soft"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand" />
                <h2 className="font-display text-lg font-semibold">Editar producto</h2>
              </div>
              <button
                onClick={closeEditor}
                aria-label="Cerrar editor"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Imagen principal (portada) */}
              <p className={labelClass}>Imagen principal</p>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[0]}
                    alt={name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-bg">
                    <span className="font-display text-6xl font-bold text-ink/80">
                      {name.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">
                  Portada
                </span>
              </div>

              {/* Acciones de imagen */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-3"
                >
                  <ImagePlus className="h-4 w-4" /> Cambiar imagen
                </button>
                <button
                  type="button"
                  onClick={() => mockupsInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-bright"
                >
                  <Images className="h-4 w-4" /> Agregar Mockups
                </button>
              </div>

              {/* Inputs de archivo ocultos */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleChangeCover(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={mockupsInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleAddMockups(e.target.files);
                  e.target.value = "";
                }}
              />

              {/* Galería de miniaturas */}
              {images.length > 0 && (
                <div className="mt-5">
                  <p className={labelClass}>
                    Galería <span className="normal-case text-ink-faint">({images.length})</span>
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {images.map((img, i) => (
                      <div
                        key={`${i}-${img.slice(0, 32)}`}
                        className={cn(
                          "flex gap-3 rounded-xl border bg-surface p-2 transition",
                          i === 0 ? "border-brand" : "border-line",
                        )}
                      >
                        {/* Miniatura */}
                        <div className="group/thumb relative aspect-square h-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`${name} — imagen ${i + 1}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          {i === 0 ? (
                            <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-full bg-brand/90 py-0.5 text-[0.52rem] font-semibold uppercase tracking-wider text-white">
                              <Star className="h-2.5 w-2.5 fill-white" /> Portada
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCover(i)}
                              className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-full bg-black/70 py-0.5 text-[0.52rem] font-semibold uppercase tracking-wider text-ink-soft opacity-0 backdrop-blur transition-opacity duration-300 hover:text-white group-hover/thumb:opacity-100"
                            >
                              <Star className="h-2.5 w-2.5" /> Portada
                            </button>
                          )}
                        </div>

                        {/* Variante + acciones */}
                        <div className="flex flex-1 flex-col gap-1.5">
                          <div>
                            <label className="mb-1 block text-[0.62rem] uppercase tracking-wider text-ink-faint">
                              Variante
                            </label>
                            <input
                              type="text"
                              value={variants[i] ?? ""}
                              onChange={(e) => handleVariantChange(i, e.target.value)}
                              placeholder="Ej: Negro, Rojo, Blanco…"
                              className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand placeholder:text-ink-faint"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {i !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetCover(i)}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] text-ink-muted transition hover:text-brand"
                              >
                                <Star className="h-3 w-3" /> Portada
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(i)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] text-ink-muted transition hover:text-brand"
                            >
                              <Trash2 className="h-3 w-3" /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos del producto */}
              <div className="mt-6 space-y-4 border-t border-line pt-5">
                <div>
                  <label htmlFor="editor-name" className={labelClass}>Nombre</label>
                  <input
                    id="editor-name"
                    value={name}
                    onChange={(e) => updateOverride(product.id, { name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="editor-price" className={labelClass}>Precio (USD)</label>
                    <input
                      id="editor-price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={priceText}
                      onChange={(e) => {
                        setPriceText(e.target.value);
                        const n = parseFloat(e.target.value);
                        if (Number.isFinite(n) && n >= 0) {
                          updateOverride(product.id, { price: n });
                        }
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="editor-type" className={labelClass}>Tipo</label>
                    <input
                      id="editor-type"
                      value={type}
                      onChange={(e) => updateOverride(product.id, { type: e.target.value })}
                      placeholder="Camiseta, Hoodie…"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="editor-status" className={labelClass}>Estado</label>
                  <select
                    id="editor-status"
                    value={status}
                    onChange={(e) =>
                      updateOverride(product.id, {
                        status: e.target.value as typeof status,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="oferta">Oferta</option>
                    <option value="limitada">Edición Limitada</option>
                    <option value="agotado">Agotado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="editor-description" className={labelClass}>Descripción</label>
                  <textarea
                    id="editor-description"
                    rows={4}
                    value={description}
                    onChange={(e) => updateOverride(product.id, { description: e.target.value })}
                    className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand placeholder:text-ink-faint"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este producto de la colección?")) {
                      deleteProduct(product.id);
                    }
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-3 text-sm font-medium text-brand transition hover:bg-brand hover:text-white"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar producto
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line px-5 py-4">
              <p className="text-center text-[0.7rem] leading-relaxed text-ink-faint">
                Los cambios se guardan automáticamente en este dispositivo (Modo Editor).
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
