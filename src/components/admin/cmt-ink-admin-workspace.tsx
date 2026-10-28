"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getInkImagePublicUrl, uploadInkImage } from "@/lib/ink-storage";
import type {
  InkImagePayload,
  InkMetrics,
  InkProduct,
  InkProductPayload,
  InkSpecification,
} from "@/lib/ink-types";

type PublicationFilter = "all" | "published" | "draft";
type ProductEditorTarget = InkProduct | null | undefined;

const EMPTY_METRICS: InkMetrics = { productCount: 0, publishedCount: 0, draftCount: 0 };

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function productPayload(product: InkProduct | null): InkProductPayload {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? null,
    specifications: product?.specifications ?? [],
    priceNote: product?.priceNote ?? null,
    sortOrder: product?.sortOrder ?? 0,
    isPublished: product?.isPublished ?? false,
  };
}

function imagePayload(images: InkProduct["images"]): InkImagePayload[] {
  return images.map((image, sortOrder) => ({ ...(image.id > 0 ? { id: image.id } : {}), storagePath: image.storagePath, altText: image.altText, sortOrder, isPrimary: image.isPrimary }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // The safe fallback is returned below.
  }
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(await responseError(response, "No fue posible completar la solicitud"));
  return response.json() as Promise<T>;
}

function StatusBadge({ published }: { published: boolean }) {
  return <span className={published ? "border border-[#b8f36b]/35 bg-[#b8f36b]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#b8f36b]" : "border border-white/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-zinc-500"}>{published ? "Publicado" : "Borrador"}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-400">{label}</span>{children}</label>;
}

function PublishToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center justify-between gap-4 border border-white/10 bg-white/[0.025] px-4 py-3"><span><span className="block text-sm font-medium text-zinc-100">Publicado</span><span className="mt-1 block text-xs text-zinc-500">Solo los productos publicados aparecen en /tintas.</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4 accent-[#b8f36b] disabled:opacity-40" /></label>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Package }) {
  return <article className="border border-white/10 bg-[#17181c] p-4"><Icon className="h-4 w-4 text-[#b8f36b]" /><p className="mt-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p><p className="mt-2 font-display text-3xl font-bold text-white">{value}</p></article>;
}

function SpecificationsEditor({ value, onChange }: { value: InkSpecification[]; onChange: (value: InkSpecification[]) => void }) {
  function update(index: number, field: keyof InkSpecification, fieldValue: string) {
    onChange(value.map((specification, current) => current === index ? { ...specification, [field]: fieldValue } : specification));
  }
  return <div><p className="text-sm leading-relaxed text-zinc-500">Agregá únicamente información técnica que esté verificada para esta presentación. No incluyas fórmulas internas.</p><div className="mt-4 space-y-3">{value.map((specification, index) => <div key={`${index}-${specification.label}`} className="grid gap-2 border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[1fr_1fr_auto]"><input value={specification.label} onChange={(event) => update(index, "label", event.target.value)} className="admin-input" placeholder="Etiqueta" /><input value={specification.value} onChange={(event) => update(index, "value", event.target.value)} className="admin-input" placeholder="Valor" /><button type="button" onClick={() => onChange(value.filter((_, current) => current !== index))} className="grid h-10 w-10 place-items-center border border-white/10 text-zinc-400 transition hover:border-red-300/50 hover:text-red-300" aria-label="Eliminar especificación"><Trash2 className="h-4 w-4" /></button></div>)}</div><button type="button" onClick={() => onChange([...value, { label: "", value: "" }])} className="mt-4 inline-flex items-center gap-2 border border-white/15 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#b8f36b]/60"><Plus className="h-4 w-4" />Añadir especificación</button></div>;
}

function ImageManager({ images, isSaving, onUpload, onReplace, onSave }: { images: InkProduct["images"]; isSaving: boolean; onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; onReplace: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void; onSave: (images: InkProduct["images"]) => void }) {
  function update(index: number, changes: Partial<InkProduct["images"][number]>) {
    onSave(images.map((image, current) => current === index ? { ...image, ...changes } : image));
  }
  function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onSave(next.map((image, sortOrder) => ({ ...image, sortOrder })));
  }
  function remove(index: number) {
    const image = images[index];
    if (!image || !window.confirm("¿Eliminar esta imagen? Se borrará únicamente su registro y archivo de CMT Ink.")) return;
    const remaining = images.filter((_, current) => current !== index).map((current, sortOrder) => ({ ...current, sortOrder }));
    if (image.isPrimary && remaining[0]) remaining[0] = { ...remaining[0], isPrimary: true };
    onSave(remaining);
  }
  return <div><div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-sm text-sm leading-relaxed text-zinc-500">La imagen principal será la vista de catálogo y de detalle pública.</p><span className="text-xs text-zinc-600">JPG, PNG o WEBP · hasta 10 MB</span></div><label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-sm font-medium text-zinc-300 transition hover:border-[#b8f36b]/60 hover:bg-[#b8f36b]/5"><Upload className="h-4 w-4" />{images.length === 0 ? "Subir primera imagen" : "Subir imágenes"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onUpload} disabled={isSaving} className="sr-only" /></label><div className="mt-4 grid gap-3 sm:grid-cols-2">{images.map((image, index) => <article key={image.storagePath} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 border border-white/10 bg-white/[0.025] p-3"><img src={getInkImagePublicUrl(image.storagePath)} alt={image.altText ?? "Vista previa CMT Ink"} className="h-20 w-[4.75rem] object-cover" /><div className="min-w-0"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-zinc-300">Imagen {index + 1}</span><StatusBadge published={image.isPrimary} /></div><p className="mt-1 truncate text-[0.68rem] text-zinc-600">{image.storagePath.split("/").pop()}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => reorder(index, -1)} disabled={isSaving || index === 0} className="image-action" aria-label="Subir imagen"><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => reorder(index, 1)} disabled={isSaving || index === images.length - 1} className="image-action" aria-label="Bajar imagen"><ChevronDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => remove(index)} disabled={isSaving} className="image-action hover:border-red-300/50 hover:text-red-300" aria-label="Eliminar imagen"><Trash2 className="h-3.5 w-3.5" /></button></div></div><input defaultValue={image.altText ?? ""} onBlur={(event) => { const altText = event.target.value || null; if (altText !== image.altText) update(index, { altText }); }} className="admin-input mt-3 h-9 text-xs" placeholder="Texto alternativo opcional" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="radio" name="ink-primary-image" checked={image.isPrimary} onChange={() => onSave(images.map((current, currentIndex) => ({ ...current, isPrimary: currentIndex === index })))} disabled={isSaving} className="accent-[#b8f36b]" />Imagen principal</label><label className="cursor-pointer text-xs font-medium text-[#b8f36b] hover:text-[#d7ff9f]">Reemplazar<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onReplace(index, event)} disabled={isSaving} className="sr-only" /></label></div></div></article>)}</div>{images.length === 0 && <div className="mt-4 border border-dashed border-white/15 px-4 py-6 text-center"><p className="text-sm text-zinc-400">Este producto todavía no tiene imágenes.</p></div>}</div>;
}

function ProductEditor({ product, onClose, onSaved, onDeleted }: { product: InkProduct | null; onClose: () => void; onSaved: (product: InkProduct) => void; onDeleted: (id: number) => void }) {
  const [form, setForm] = useState<InkProductPayload>(() => productPayload(product));
  const [images, setImages] = useState(product?.images ?? []);
  const [activeTab, setActiveTab] = useState<"info" | "specifications" | "images">("info");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedProduct = product;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true); setError(null);
    try {
      const response = await requestJson<{ product: InkProduct }>(savedProduct ? `/api/admin/inks/products/${savedProduct.id}` : "/api/admin/inks/products", { method: savedProduct ? "PATCH" : "POST", body: JSON.stringify(form) });
      onSaved(response.product);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar CMT Ink");
    } finally { setIsSaving(false); }
  }

  async function persistImages(nextImages: InkProduct["images"]) {
    if (!savedProduct) return;
    setIsSaving(true); setError(null);
    try {
      const response = await requestJson<{ product: InkProduct }>(`/api/admin/inks/products/${savedProduct.id}/images`, { method: "PATCH", body: JSON.stringify({ images: imagePayload(nextImages) }) });
      setImages(response.product.images); onSaved(response.product);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No fue posible guardar las imágenes"); }
    finally { setIsSaving(false); }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    if (!savedProduct || files.length === 0) return;
    setIsSaving(true); setError(null);
    try {
      const uploaded = [] as InkProduct["images"];
      for (const file of files) {
        const result = await uploadInkImage(file);
        uploaded.push({ id: 0, productId: savedProduct.id, storagePath: result.storagePath, altText: null, sortOrder: images.length + uploaded.length, isPrimary: images.length + uploaded.length === 0, createdAt: new Date().toISOString() });
      }
      await persistImages([...images, ...uploaded]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "No fue posible subir la imagen"); }
    finally { setIsSaving(false); }
  }

  async function replaceImage(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!savedProduct || !file) return;
    setIsSaving(true); setError(null);
    try {
      const result = await uploadInkImage(file);
      await persistImages(images.map((image, current) => current === index ? { ...image, id: 0, storagePath: result.storagePath } : image));
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "No fue posible reemplazar la imagen"); }
    finally { setIsSaving(false); }
  }

  async function remove() {
    if (!savedProduct || !window.confirm("¿Eliminar este producto CMT Ink y sus imágenes?")) return;
    setIsSaving(true); setError(null);
    try { await requestJson(`/api/admin/inks/products/${savedProduct.id}`, { method: "DELETE" }); onDeleted(savedProduct.id); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el producto"); }
    finally { setIsSaving(false); }
  }

  return <aside className="border border-white/10 bg-[#17181c] p-5 xl:sticky xl:top-6 xl:self-start"><div className="flex items-start justify-between gap-4"><div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b8f36b]">{savedProduct ? "Editar CMT Ink" : "Nuevo CMT Ink"}</p><h3 className="mt-2 font-display text-2xl font-bold text-white">{savedProduct ? form.name || "Producto CMT Ink" : "Producto Glow"}</h3></div><button type="button" onClick={onClose} className="image-action" aria-label="Cerrar editor"><X className="h-4 w-4" /></button></div><div className="mt-6 flex border-b border-white/10">{([['info', 'Información'], ['specifications', 'Especificaciones'], ['images', 'Imágenes']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? "border-b-2 border-[#b8f36b] px-3 py-3 text-xs font-semibold text-[#b8f36b]" : "px-3 py-3 text-xs font-medium text-zinc-500 hover:text-zinc-200"}>{label}</button>)}</div>{error && <p className="mt-5 border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-200">{error}</p>}<form onSubmit={save} className="mt-6">{activeTab === "info" && <div className="space-y-4"><Field label="Nombre"><input required value={form.name} onChange={(event) => setForm((current) => { const value = event.target.value; const shouldSuggestSlug = !savedProduct && (!current.slug || current.slug === slugify(current.name)); return { ...current, name: value, slug: shouldSuggestSlug ? slugify(value) : current.slug }; })} className="admin-input" placeholder="Nombre de la presentación Glow" /></Field><Field label="Slug"><input required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="admin-input" placeholder="glow-in-the-dark" /></Field><Field label="Descripción corta"><textarea required value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} className="admin-input min-h-20 resize-y" placeholder="Resumen claro para el catálogo" /></Field><Field label="Descripción completa"><textarea value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} className="admin-input min-h-32 resize-y" placeholder="Información pública verificada del producto" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Nota de precio"><input value={form.priceNote ?? ""} onChange={(event) => setForm((current) => ({ ...current, priceNote: event.target.value || null }))} className="admin-input" placeholder="Consultar" /></Field><Field label="Orden"><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="admin-input" /></Field></div>{savedProduct ? <PublishToggle checked={form.isPublished} onChange={(isPublished) => setForm((current) => ({ ...current, isPublished }))} /> : <div className="border border-white/10 bg-white/[0.025] px-4 py-3"><span className="block text-sm font-medium text-zinc-100">Borrador inicial</span><span className="mt-1 block text-xs text-zinc-500">El producto se crea como borrador; podés publicarlo después de guardarlo.</span></div>}</div>}{activeTab === "specifications" && <SpecificationsEditor value={form.specifications} onChange={(specifications) => setForm((current) => ({ ...current, specifications }))} />}{activeTab === "images" && (savedProduct ? <ImageManager images={images} isSaving={isSaving} onUpload={upload} onReplace={replaceImage} onSave={persistImages} /> : <section className="border border-dashed border-white/15 bg-white/[0.02] px-4 py-9 text-center"><ImagePlus className="mx-auto h-6 w-6 text-zinc-600" /><h4 className="mt-4 font-display text-lg font-semibold text-zinc-100">Imágenes del producto</h4><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">Guardá el producto primero para poder subir imágenes.</p></section>)}{activeTab !== "images" && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">{savedProduct ? <button type="button" onClick={remove} disabled={isSaving} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />Eliminar</button> : <span />}<button type="submit" disabled={isSaving} className="admin-button-primary">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{savedProduct ? "Guardar" : "Crear borrador"}</button></div>}</form></aside>;
}

export function CmtInkAdminWorkspace() {
  const [products, setProducts] = useState<InkProduct[]>([]);
  const [metrics, setMetrics] = useState<InkMetrics>(EMPTY_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>("all");
  const [productEditor, setProductEditor] = useState<ProductEditorTarget>(undefined);

  async function refresh() {
    setIsLoading(true); setError(null);
    try { const data = await requestJson<{ products: InkProduct[]; metrics: InkMetrics }>("/api/admin/inks/products"); setProducts(data.products); setMetrics(data.metrics); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No fue posible cargar CMT Ink"); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesPublication = publicationFilter === "all" || (publicationFilter === "published" ? product.isPublished : !product.isPublished);
    return matchesSearch && matchesPublication;
  }), [products, search, publicationFilter]);

  function upsertProduct(product: InkProduct) {
    setProducts((current) => [...current.filter((candidate) => candidate.id !== product.id), product].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
    setProductEditor(product); void refresh();
  }

  return <div><section className="border-b border-white/10 pb-8 md:pb-10"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b8f36b]">Módulo activo</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">CMT Ink</h2><p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">Productos Glow in the Dark, información técnica pública e imágenes para el catálogo de CMT Ink.</p></div><button type="button" onClick={() => setProductEditor(null)} className="admin-button-primary"><Plus className="h-4 w-4" />Nuevo producto</button></div></section><section className="mt-8 grid grid-cols-3 gap-4"><StatCard label="Productos" value={metrics.productCount} icon={Package} /><StatCard label="Publicados" value={metrics.publishedCount} icon={Check} /><StatCard label="Borradores" value={metrics.draftCount} icon={FileText} /></section>{error && <p className="mt-6 border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p>}<section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.92fr)]"><section className="min-w-0 border border-white/10 bg-[#17181c]"><div className="border-b border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-white">Productos Glow</h3><span className="text-sm text-zinc-500">{filteredProducts.length} visibles</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input pl-9" placeholder="Buscar por nombre" /></label><select value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value as PublicationFilter)} className="admin-input"><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option></select></div></div><div className="divide-y divide-white/10">{isLoading ? <LoadingRows /> : filteredProducts.length === 0 ? <div className="p-5"><EmptyCopy text={products.length === 0 ? "Aún no hay productos Glow registrados" : "No hay resultados para estos filtros"} action={products.length === 0 ? "Crear primer producto" : undefined} onClick={() => setProductEditor(null)} /></div> : filteredProducts.map((product) => <button key={product.id} type="button" onClick={() => setProductEditor(product)} className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-3 p-4 text-left transition hover:bg-white/[0.03]"><div className="h-14 w-14 overflow-hidden border border-white/10 bg-black/20">{product.images[0] ? <img src={getInkImagePublicUrl(product.images[0].storagePath)} alt="" className="h-full w-full object-cover" /> : <Sparkles className="m-4 h-6 w-6 text-[#b8f36b]/30" />}</div><div className="min-w-0"><p className="truncate font-medium text-zinc-100">{product.name}</p><p className="mt-1 truncate text-xs text-zinc-500">{product.slug}</p></div><div className="flex flex-col items-end gap-2"><StatusBadge published={product.isPublished} /><Pencil className="h-3.5 w-3.5 text-zinc-500" /></div></button>)}</div></section>{productEditor !== undefined ? <ProductEditor product={productEditor} onClose={() => setProductEditor(undefined)} onSaved={upsertProduct} onDeleted={(id) => { setProducts((current) => current.filter((product) => product.id !== id)); setProductEditor(undefined); void refresh(); }} /> : <section className="hidden min-h-72 place-items-center border border-dashed border-white/15 bg-white/[0.015] p-8 text-center xl:grid"><div><Sparkles className="mx-auto h-6 w-6 text-[#b8f36b]/35" /><h3 className="mt-4 font-display text-lg font-semibold text-zinc-200">Seleccioná un producto Glow</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">Creá o editá una ficha para gestionar su publicación, especificaciones e imágenes.</p><button type="button" onClick={() => setProductEditor(null)} className="admin-button-secondary mt-5"><Plus className="h-4 w-4" />Nuevo producto</button></div></section>}</section></div>;
}

function LoadingRows() { return <div className="space-y-3 p-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse bg-white/[0.04]" />)}</div>; }

function EmptyCopy({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) { return <div className="border border-dashed border-white/15 p-5 text-center"><p className="text-sm text-zinc-500">{text}</p>{action && onClick && <button type="button" onClick={onClick} className="mt-3 text-sm font-medium text-[#b8f36b] transition hover:text-[#d7ff9f]">{action}</button>}</div>; }
