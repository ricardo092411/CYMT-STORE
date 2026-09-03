"use client";

/**
 * MODO EDITOR — Panel lateral derecho.
 *
 * Reutiliza el patrón visual y de animación del CartDrawer existente
 * (backdrop + aside deslizante con el mismo easing). No navega, no abre
 * ventanas emergentes y no toca el diseño principal de la tienda.
 *
 * Solo se renderiza cuando el contexto habilita edición en /admin.
 */
import {
  getProductImagePublicUrl,
  uploadImages,
  uploadProductImages,
} from "@/lib/storage";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Images, Pencil, Star, Trash2, X } from "lucide-react";
import { useEditor } from "@/providers/editor-provider";
import { cn } from "@/lib/utils";
import { hasCompositeColorName } from "@/lib/suspicious-variants";
import type { Product } from "@/data/catalog";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none transition focus:border-brand placeholder:text-ink-faint";
const labelClass = "mb-1.5 block text-xs uppercase tracking-wider text-ink-muted";

type ProductVariantColorStatus = "confirmed" | "requires_user_input";

type ProductVariantImageDraft = {
  id?: number;
  storageKey: string | null;
  legacyUrl: string | null;
  originalFilename: string;
  originalSourcePath: string | null;
  position: number;
  isCover: boolean;
};

/** Forma completa que acepta replaceProductVariants sin inventar un productId. */
type ProductVariantTreeDraft = {
  id: number;
  colorName: string | null;
  colorHex: string | null;
  colorStatus: ProductVariantColorStatus;
  position: number;
  isDefault: boolean;
  images: ProductVariantImageDraft[];
};

/**
 * Estado de edición que hace que la galería sea el único lugar para asociar
 * cada imagen a un color. No se persiste hasta guardar.
 */
type ImageVariantDraft = {
  key: string;
  variantId?: number;
  imageId?: number;
  previewUrl: string;
  storageKey: string | null;
  legacyUrl: string | null;
  originalFilename: string;
  originalSourcePath: string | null;
  position: number;
  isCover: boolean;
  colorName: string;
  sourceColorName: string | null;
  colorHex: string | null;
  variantIsDefault: boolean;
};

type EmptyProductVariantDraft = Omit<ProductVariantTreeDraft, "images"> & {
  images: [];
};

function normalizeColorName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function colorKey(value: string): string {
  return normalizeColorName(value).toLocaleLowerCase();
}

function legacyFilename(url: string, index: number): string {
  try {
    const pathname = url.split(/[?#]/)[0] ?? "";
    const encodedFilename = pathname.split("/").filter(Boolean).pop();
    if (encodedFilename) {
      const filename = decodeURIComponent(encodedFilename).trim();
      if (filename) return filename;
    }
  } catch {
    // Una ruta legacy no confiable usa un nombre técnico, pero no se descarta.
  }

  return `legacy-image-${index + 1}`;
}

function buildImageDraftState(product: Product): {
  imageDrafts: ImageVariantDraft[];
  emptyVariants: EmptyProductVariantDraft[];
} {
  const relationalVariants = product.productVariants ?? [];

  if (relationalVariants.length > 0) {
    const orderedVariants = [...relationalVariants].sort(
      (left, right) => left.position - right.position,
    );

    return {
      imageDrafts: orderedVariants.flatMap((variant) =>
        [...variant.images]
          .sort((left, right) => left.position - right.position)
          .map((image) => ({
            key: `relational-${variant.id}-${image.id}`,
            variantId: variant.id,
            imageId: image.id,
            previewUrl:
              image.legacyUrl ??
              (image.storageKey ? getProductImagePublicUrl(image.storageKey) : ""),
            storageKey: image.storageKey,
            legacyUrl: image.legacyUrl,
            originalFilename: image.originalFilename,
            originalSourcePath: image.originalSourcePath,
            position: image.position,
            isCover: image.isCover,
            colorName: variant.colorName ?? "",
            sourceColorName: variant.colorName,
            colorHex: variant.colorHex,
            variantIsDefault: variant.isDefault,
          })),
      ),
      emptyVariants: orderedVariants
        .filter((variant) => variant.images.length === 0)
        .map((variant) => ({
          id: variant.id,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          colorStatus:
            variant.colorStatus === "confirmed" ? "confirmed" : "requires_user_input",
          position: variant.position,
          isDefault: variant.isDefault,
          images: [],
        })),
    };
  }

  const hasAlignedLegacyVariants = product.variants?.length === product.images.length;

  return {
    imageDrafts: product.images.map((legacyUrl, index) => ({
      key: `legacy-${index}-${legacyUrl}`,
      previewUrl: legacyUrl,
      storageKey: null,
      legacyUrl,
      originalFilename: legacyFilename(legacyUrl, index),
      originalSourcePath: null,
      position: index,
      isCover: index === 0,
      colorName: hasAlignedLegacyVariants ? product.variants?.[index] ?? "" : "",
      sourceColorName: hasAlignedLegacyVariants ? product.variants?.[index] ?? null : null,
      colorHex: null,
      variantIsDefault: index === 0,
    })),
    emptyVariants: [],
  };
}

function buildProductVariantTree(
  imageDrafts: ImageVariantDraft[],
  emptyVariants: EmptyProductVariantDraft[],
  nextTemporaryVariantId: () => number,
): ProductVariantTreeDraft[] {
  if (imageDrafts.some((image) => normalizeColorName(image.colorName) === "")) {
    throw new Error("Asigna un color a cada mockup antes de guardar.");
  }

  const groups = new Map<string, ImageVariantDraft[]>();
  for (const image of imageDrafts) {
    const normalizedColorKey = colorKey(image.colorName);
    const group = groups.get(normalizedColorKey) ?? [];
    group.push(image);
    groups.set(normalizedColorKey, group);
  }

  const groupEntries = [...groups.entries()];
  const assignedVariantIds = new Set<number>();
  const variantIdByColorKey = new Map<string, number>();

  for (const [normalizedColorKey, group] of groupEntries) {
    const matchingVariantId = group.find(
      (image) =>
        image.variantId !== undefined &&
        image.sourceColorName !== null &&
        colorKey(image.sourceColorName) === normalizedColorKey,
    )?.variantId;

    if (matchingVariantId !== undefined && !assignedVariantIds.has(matchingVariantId)) {
      assignedVariantIds.add(matchingVariantId);
      variantIdByColorKey.set(normalizedColorKey, matchingVariantId);
    }
  }

  for (const [normalizedColorKey, group] of groupEntries) {
    if (variantIdByColorKey.has(normalizedColorKey)) continue;

    const reusableVariantId = group.find(
      (image) => image.variantId !== undefined && !assignedVariantIds.has(image.variantId),
    )?.variantId;

    if (reusableVariantId !== undefined) {
      assignedVariantIds.add(reusableVariantId);
      variantIdByColorKey.set(normalizedColorKey, reusableVariantId);
    }
  }

  const variantsFromImages = groupEntries.map(([normalizedColorKey, group]) => {
    const existingVariantId = variantIdByColorKey.get(normalizedColorKey);
    const selectedCoverIndex = group.findIndex((image) => image.isCover);
    const coverIndex = selectedCoverIndex === -1 ? 0 : selectedCoverIndex;

    return {
      id: existingVariantId ?? nextTemporaryVariantId(),
      colorName: normalizeColorName(group[0]?.colorName ?? ""),
      colorHex: group.find((image) => image.colorHex !== null)?.colorHex ?? null,
      colorStatus: "confirmed" as const,
      position: 0,
      isDefault: group.some((image) => image.variantIsDefault),
      images: group.map((image, position) => ({
        ...(image.imageId === undefined ? {} : { id: image.imageId }),
        storageKey: image.storageKey,
        legacyUrl: image.legacyUrl,
        originalFilename: image.originalFilename,
        originalSourcePath: image.originalSourcePath,
        position,
        isCover: position === coverIndex,
      })),
    } satisfies ProductVariantTreeDraft;
  });

  const variants = [...variantsFromImages, ...emptyVariants.map((variant) => ({ ...variant }))];
  const existingDefaultIndex = variants.findIndex((variant) => variant.isDefault);
  const defaultIndex =
    existingDefaultIndex === -1 && variants.length > 0 ? 0 : existingDefaultIndex;

  return variants.map((variant, position) => {
    const existingCoverIndex = variant.images.findIndex((image) => image.isCover);
    const coverIndex = existingCoverIndex === -1 ? 0 : existingCoverIndex;

    return {
      ...variant,
      position,
      isDefault: position === defaultIndex,
      images: variant.images.map((image, imagePosition) => ({
        ...image,
        position: imagePosition,
        isCover: imagePosition === coverIndex,
      })),
    };
  });
}

function validateProductVariantTree(variants: ProductVariantTreeDraft[]): void {
  const variantIds = new Set<number>();
  let defaultCount = 0;

  for (const variant of variants) {
    if (!Number.isInteger(variant.id)) {
      throw new Error("Cada variante debe tener un ID entero válido.");
    }
    if (variantIds.has(variant.id)) {
      throw new Error("Los IDs de las variantes deben ser únicos.");
    }
    variantIds.add(variant.id);

    if (
      (variant.colorName !== null && typeof variant.colorName !== "string") ||
      (variant.colorHex !== null && typeof variant.colorHex !== "string") ||
      (variant.colorStatus !== "confirmed" && variant.colorStatus !== "requires_user_input") ||
      typeof variant.isDefault !== "boolean" ||
      !Number.isInteger(variant.position) ||
      !Array.isArray(variant.images)
    ) {
      throw new Error("Hay datos de variante inválidos. Revisa los campos antes de guardar.");
    }

    if (variant.isDefault) defaultCount += 1;
    let coverCount = 0;

    for (const image of variant.images) {
      if (
        (image.id !== undefined && (!Number.isInteger(image.id) || image.id <= 0)) ||
        !Number.isInteger(image.position) ||
        typeof image.isCover !== "boolean" ||
        typeof image.originalFilename !== "string" ||
        image.originalFilename.trim() === "" ||
        (image.storageKey === null && image.legacyUrl === null)
      ) {
        throw new Error("Una imagen de variante contiene datos inválidos.");
      }
      if (image.isCover) coverCount += 1;
    }

    if (coverCount > 1) {
      throw new Error("Cada variante puede tener una sola portada.");
    }
  }

  if (defaultCount > 1) {
    throw new Error("Solo una variante puede ser predeterminada.");
  }
}

export function EditorPanel() {
  const {
    enabled,
    activeId,
    closeEditor,
    getLiveProduct,
    updateOverride,
    replaceProductVariants,
    deleteProduct,
  } = useEditor();

  const product = activeId ? getLiveProduct(activeId) : undefined;
  const images = product?.images ?? [];
  const name = product?.name ?? "";
  const price = product?.price ?? 0;
  const description = product?.description ?? "";
  const type = product?.type ?? "";
  const status = product?.status ?? "nuevo";
  const hasCompositeOriginalColor =
    product?.productVariants?.some((variant) => hasCompositeColorName(variant.colorName)) ?? false;

  const [priceText, setPriceText] = useState("");
  useEffect(() => {
    if (product) setPriceText(String(product.price));
    // Solo re-sincronizar cuando cambia el producto abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const [imageDrafts, setImageDrafts] = useState<ImageVariantDraft[]>([]);
  const [emptyVariants, setEmptyVariants] = useState<EmptyProductVariantDraft[]>([]);
  const [imageDraftProductId, setImageDraftProductId] = useState<string | null>(null);
  const [variantSaveError, setVariantSaveError] = useState<string | null>(null);
  const [isSavingVariants, setIsSavingVariants] = useState(false);
  const [isUploadingMockups, setIsUploadingMockups] = useState(false);
  const nextTemporaryVariantId = useRef(-1);
  const confirmedVariantsAwaitingSync = useRef<string | null>(null);

  useEffect(() => {
    if (!product) {
      if (imageDraftProductId !== null) {
        setImageDraftProductId(null);
        setImageDrafts([]);
        setEmptyVariants([]);
        setVariantSaveError(null);
      }
      return;
    }

    if (
      imageDraftProductId !== product.id ||
      confirmedVariantsAwaitingSync.current === product.id
    ) {
      const nextDraft = buildImageDraftState(product);
      setImageDrafts(nextDraft.imageDrafts);
      setEmptyVariants(nextDraft.emptyVariants);
      setImageDraftProductId(product.id);
      setVariantSaveError(null);
      confirmedVariantsAwaitingSync.current = null;
    }
  }, [imageDraftProductId, product]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const mockupsInputRef = useRef<HTMLInputElement>(null);

  if (!enabled) return null;

  async function handleChangeCover(fileList: FileList | null) {
    if (!product || !fileList || fileList.length === 0) return;

    try {
      const urls = await uploadImages(fileList);
      const nextImages = [...images];

      if (nextImages.length === 0) {
        nextImages.push(urls[0] ?? "");
      } else {
        nextImages[0] = urls[0] ?? nextImages[0] ?? "";
      }

      updateOverride(product.id, { images: nextImages });

      if ((product.productVariants ?? []).length === 0 && urls[0]) {
        setImageDrafts((current) => {
          const replacement = {
            key: current[0]?.key ?? `legacy-cover-${urls[0]}`,
            previewUrl: urls[0],
            storageKey: null,
            legacyUrl: urls[0],
            originalFilename: legacyFilename(urls[0], 0),
            originalSourcePath: null,
            position: 0,
            isCover: true,
            colorName: current[0]?.colorName ?? "",
            sourceColorName: null,
            colorHex: null,
            variantIsDefault: true,
          } satisfies ImageVariantDraft;

          return current.length === 0
            ? [replacement]
            : [replacement, ...current.slice(1).map((image) => ({ ...image, isCover: false }))];
        });
      }
    } catch (error) {
      console.error("Error al subir portada:", error);
      alert("Error al subir la portada.");
    }
  }

  async function handleAddMockups(fileList: FileList | null) {
    if (!product || !fileList || fileList.length === 0 || isUploadingMockups) return;

    try {
      setIsUploadingMockups(true);
      const uploadedImages = await uploadProductImages(fileList);
      setImageDrafts((current) => [
        ...current,
        ...uploadedImages.map((image, index) => ({
          key: `uploaded-${image.storageKey}`,
          previewUrl: image.publicUrl,
          storageKey: image.storageKey,
          legacyUrl: null,
          originalFilename: image.originalFilename,
          originalSourcePath: null,
          position: current.length + index,
          isCover: false,
          colorName: "",
          sourceColorName: null,
          colorHex: null,
          variantIsDefault: false,
        })),
      ]);
      setVariantSaveError(null);
    } catch (error) {
      console.error("Error al subir mockups:", error);
      setVariantSaveError("No fue posible subir los mockups a Supabase.");
    } finally {
      setIsUploadingMockups(false);
    }
  }

  function coverScope(image: ImageVariantDraft): string {
    const normalizedColorKey = colorKey(image.colorName);
    return normalizedColorKey === "" ? image.key : `color-${normalizedColorKey}`;
  }

  function handleSetImageCover(key: string) {
    setImageDrafts((current) => {
      const selectedImage = current.find((image) => image.key === key);
      if (!selectedImage) return current;

      const selectedScope = coverScope(selectedImage);
      return current.map((image) =>
        coverScope(image) === selectedScope
          ? { ...image, isCover: image.key === key }
          : image,
      );
    });
    setVariantSaveError(null);
  }

  function handleRemoveMockup(key: string) {
    setImageDrafts((current) => current.filter((image) => image.key !== key));
    setVariantSaveError(null);
  }

  function handleMockupColorChange(key: string, colorName: string) {
    setImageDrafts((current) =>
      current.map((image) => (image.key === key ? { ...image, colorName } : image)),
    );
    setVariantSaveError(null);
  }

  async function handleSaveProductVariants() {
    if (!product || isSavingVariants) return;

    let nextProductVariants: ProductVariantTreeDraft[];
    try {
      nextProductVariants = buildProductVariantTree(
        imageDrafts,
        emptyVariants,
        () => nextTemporaryVariantId.current--,
      );
      validateProductVariantTree(nextProductVariants);
    } catch (error) {
      console.error("No fue posible preparar las variantes de color:", error);
      setVariantSaveError(
        error instanceof Error
          ? error.message
          : "No fue posible preparar los colores y mockups.",
      );
      return;
    }

    try {
      setIsSavingVariants(true);
      setVariantSaveError(null);
      await replaceProductVariants(product.id, nextProductVariants);
      confirmedVariantsAwaitingSync.current = product.id;
    } catch (error) {
      console.error("No fue posible guardar las variantes de color:", error);
      setVariantSaveError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar los colores y mockups. Inténtalo de nuevo.",
      );
      const confirmedDraft = buildImageDraftState(product);
      setImageDrafts(confirmedDraft.imageDrafts);
      setEmptyVariants(confirmedDraft.emptyVariants);
      setImageDraftProductId(product.id);
    } finally {
      setIsSavingVariants(false);
    }
  }

  const visibleImageDrafts = imageDraftProductId === product?.id ? imageDrafts : [];
  const primaryImage =
    visibleImageDrafts.find((image) => image.isCover)?.previewUrl ??
    visibleImageDrafts[0]?.previewUrl ??
    images[0];

  return (
    <AnimatePresence>
      {product && (
        <div
          className="fixed inset-0 z-[85]"
          role="dialog"
          aria-modal="true"
          aria-label="Editor de producto"
        >
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

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className={labelClass}>Imagen principal</p>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
                {primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryImage}
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

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-3"
                >
                  <ImagePlus className="h-4 w-4" /> Cambiar portada
                </button>
                <button
                  type="button"
                  onClick={() => mockupsInputRef.current?.click()}
                  disabled={isUploadingMockups || isSavingVariants}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Images className="h-4 w-4" />
                  {isUploadingMockups ? "Subiendo…" : "Agregar Mockups"}
                </button>
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleChangeCover(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                ref={mockupsInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  void handleAddMockups(event.target.files);
                  event.target.value = "";
                }}
              />

              <div className="mt-5">
                <p className={labelClass}>
                  Galería{" "}
                  <span className="normal-case text-ink-faint">
                    ({visibleImageDrafts.length})
                  </span>
                </p>
                <p className="mb-3 text-xs leading-relaxed text-ink-faint">
                  Sube un mockup y escribe su color aquí. Los mockups con el mismo color se
                  guardan dentro de una sola variante.
                </p>

                {hasCompositeOriginalColor && (
                  <p className="mb-3 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand">
                    Esta variante contiene varios colores. Asigna el color correcto a cada mockup
                    antes de guardar.
                  </p>
                )}

                {visibleImageDrafts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {visibleImageDrafts.map((image, index) => (
                      <div
                        key={image.key}
                        className={cn(
                          "flex gap-3 rounded-xl border bg-surface p-2 transition",
                          image.isCover ? "border-brand" : "border-line",
                        )}
                      >
                        <div className="group/thumb relative aspect-square h-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                          {image.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.previewUrl}
                              alt={`${name} — imagen ${index + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-xs text-ink-faint">
                              Sin vista previa
                            </div>
                          )}
                          {image.isCover && (
                            <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-full bg-brand/90 py-0.5 text-[0.52rem] font-semibold uppercase tracking-wider text-white">
                              <Star className="h-2.5 w-2.5 fill-white" /> Portada
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-1.5">
                          <div>
                            <label
                              htmlFor={`editor-mockup-color-${image.key}`}
                              className="mb-1 block text-[0.62rem] uppercase tracking-wider text-ink-faint"
                            >
                              Variante / color
                            </label>
                            <input
                              id={`editor-mockup-color-${image.key}`}
                              type="text"
                              value={image.colorName}
                              onChange={(event) =>
                                handleMockupColorChange(image.key, event.target.value)
                              }
                              disabled={isSavingVariants}
                              placeholder="Ej: Negro, Blanco, Gris…"
                              className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {!image.isCover && (
                              <button
                                type="button"
                                onClick={() => handleSetImageCover(image.key)}
                                disabled={isSavingVariants}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] text-ink-muted transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Star className="h-3 w-3" /> Portada
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMockup(image.key)}
                              disabled={isSavingVariants}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] text-ink-muted transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-ink-faint">
                    Agrega mockups para asignarles un color.
                  </p>
                )}
              </div>

              {variantSaveError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand"
                >
                  {variantSaveError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSaveProductVariants()}
                disabled={isSavingVariants || isUploadingMockups}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingVariants ? "Guardando colores y mockups…" : "Guardar colores y mockups"}
              </button>

              <div className="mt-6 space-y-4 border-t border-line pt-5">
                <div>
                  <label htmlFor="editor-name" className={labelClass}>Nombre</label>
                  <input
                    id="editor-name"
                    value={name}
                    onChange={(event) => updateOverride(product.id, { name: event.target.value })}
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
                      onChange={(event) => {
                        setPriceText(event.target.value);
                        const nextPrice = parseFloat(event.target.value);
                        if (Number.isFinite(nextPrice) && nextPrice >= 0) {
                          updateOverride(product.id, { price: nextPrice });
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
                      onChange={(event) => updateOverride(product.id, { type: event.target.value })}
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
                    onChange={(event) =>
                      updateOverride(product.id, {
                        status: event.target.value as typeof status,
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
                    onChange={(event) =>
                      updateOverride(product.id, { description: event.target.value })
                    }
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

            <div className="border-t border-line px-5 py-4">
              <p className="text-center text-[0.7rem] leading-relaxed text-ink-faint">
                Los cambios generales se guardan automáticamente. Los colores y mockups requieren
                guardar.
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
