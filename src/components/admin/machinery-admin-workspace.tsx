"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderPlus,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getMachineryImagePublicUrl, uploadMachineryImage } from "@/lib/machinery-storage";
import type {
  MachineryCategory,
  MachineryCategoryPayload,
  MachineryImagePayload,
  MachineryMetrics,
  MachineryProduct,
  MachineryProductPayload,
  MachinerySpecification,
} from "@/lib/machinery-types";

type PublicationFilter = "all" | "published" | "draft";
type ProductEditorTarget = MachineryProduct | null | undefined;

const EMPTY_METRICS: MachineryMetrics = {
  categoryCount: 0,
  productCount: 0,
  publishedCount: 0,
  draftCount: 0,
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryPayload(category?: MachineryCategory): MachineryCategoryPayload {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? null,
    sortOrder: category?.sortOrder ?? 0,
    isPublished: category?.isPublished ?? false,
  };
}

function productPayload(product: MachineryProduct | null, defaultCategoryId: number): MachineryProductPayload {
  return {
    categoryId: product?.categoryId ?? defaultCategoryId,
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

function imagePayload(images: MachineryProduct["images"]): MachineryImagePayload[] {
  return images.map((image, index) => ({
    ...(image.id > 0 ? { id: image.id } : {}),
    storagePath: image.storagePath,
    altText: image.altText,
    sortOrder: index,
    isPrimary: image.isPrimary,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // The status fallback is safer than exposing an unexpected response.
  }
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await responseError(response, "No fue posible completar la acción"));
  return (await response.json()) as T;
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={
        published
          ? "inline-flex items-center gap-1.5 border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.12em] text-emerald-300"
          : "inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.12em] text-zinc-400"
      }
    >
      <span className={published ? "h-1.5 w-1.5 rounded-full bg-emerald-300" : "h-1.5 w-1.5 rounded-full bg-zinc-500"} />
      {published ? "Publicado" : "Borrador"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Package }) {
  return (
    <div className="border border-white/10 bg-[#17181c] p-4 sm:p-5">
      <Icon className="h-5 w-5 text-brand" />
      <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

type CategoryEditorProps = {
  category: MachineryCategory | null;
  onClose: () => void;
  onSaved: (category: MachineryCategory) => void;
  onDeleted: (id: number) => void;
};

function CategoryEditor({ category, onClose, onSaved, onDeleted }: CategoryEditorProps) {
  const [form, setForm] = useState<MachineryCategoryPayload>(() => categoryPayload(category ?? undefined));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(categoryPayload(category ?? undefined));
    setError(null);
  }, [category]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const data = await requestJson<{ category: MachineryCategory }>(
        category ? `/api/admin/machinery/categories/${category.id}` : "/api/admin/machinery/categories",
        {
          method: category ? "PATCH" : "POST",
          body: JSON.stringify(form),
        },
      );
      onSaved(data.category);
      if (!category) onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar la categoría");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!category || !window.confirm("¿Eliminar esta categoría? Solo es posible si no tiene productos.")) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/machinery/categories/${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response, "No fue posible eliminar la categoría"));
      onDeleted(category.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar la categoría");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-labelledby="machinery-category-editor-title">
      <form onSubmit={save} className="mx-auto my-6 w-full max-w-xl border border-white/15 bg-[#15161a] shadow-2xl sm:my-12">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">Catálogo de maquinaria</p>
            <h3 id="machinery-category-editor-title" className="mt-2 font-display text-2xl font-bold text-white">{category ? "Editar categoría" : "Nueva categoría"}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          {error && <p className="border border-brand/35 bg-brand/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <Field label="Nombre"><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} onBlur={() => setForm((current) => ({ ...current, slug: current.slug || slugify(current.name) }))} className="admin-input" placeholder="Ej. Pulpos serigráficos" /></Field>
          <Field label="Slug"><input required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="admin-input" placeholder="pulpos-serigraficos" /></Field>
          <Field label="Descripción"><textarea value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} className="admin-input min-h-24 resize-y" placeholder="Descripción opcional para la categoría" /></Field>
          <div className="grid gap-4 sm:grid-cols-[0.65fr_1fr]"><Field label="Orden"><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="admin-input" /></Field><PublishToggle checked={form.isPublished} onChange={(isPublished) => setForm((current) => ({ ...current, isPublished }))} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-5 sm:p-6">
          {category ? <button type="button" onClick={remove} disabled={isSaving} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />Eliminar</button> : <span />}
          <div className="flex gap-3"><button type="button" onClick={onClose} disabled={isSaving} className="admin-button-secondary">Cancelar</button><button type="submit" disabled={isSaving} className="admin-button-primary">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{category ? "Guardar cambios" : "Crear categoría"}</button></div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-zinc-300"><span className="mb-2 block">{label}</span>{children}</label>;
}

function PublishToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.025] px-3 py-2.5 text-sm text-zinc-300">
      <span><span className="block font-medium text-zinc-100">Visibilidad</span><span className="text-xs text-zinc-500">{checked ? "Publicado" : "Borrador"}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#e50914]" />
    </label>
  );
}

type ProductEditorProps = {
  product: MachineryProduct | null;
  categories: MachineryCategory[];
  onClose: () => void;
  onSaved: (product: MachineryProduct) => void;
  onDeleted: (id: number) => void;
};

function ProductEditor({ product, categories, onClose, onSaved, onDeleted }: ProductEditorProps) {
  const [form, setForm] = useState<MachineryProductPayload>(() => productPayload(product, categories[0]?.id ?? 0));
  const [images, setImages] = useState(product?.images ?? []);
  const [activeTab, setActiveTab] = useState<"info" | "specs" | "images">("info");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(productPayload(product, categories[0]?.id ?? 0));
    setImages(product?.images ?? []);
    setActiveTab("info");
    setError(null);
  }, [product, categories]);

  async function saveProduct(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const data = await requestJson<{ product: MachineryProduct }>(
        product ? `/api/admin/machinery/products/${product.id}` : "/api/admin/machinery/products",
        { method: product ? "PATCH" : "POST", body: JSON.stringify(form) },
      );
      onSaved(data.product);
      return data.product;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar el producto");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function persistImages(nextImages: MachineryProduct["images"]) {
    if (!product) return;
    setIsSaving(true);
    setError(null);
    try {
      const data = await requestJson<{ product: MachineryProduct }>(`/api/admin/machinery/products/${product.id}/images`, {
        method: "PATCH",
        body: JSON.stringify({ images: imagePayload(nextImages) }),
      });
      setImages(data.product.images);
      onSaved(data.product);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar las imágenes");
    } finally {
      setIsSaving(false);
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!product || files.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const uploaded = [] as MachineryProduct["images"];
      for (const file of files) {
        const result = await uploadMachineryImage(file);
        uploaded.push({
          id: 0,
          productId: product.id,
          storagePath: result.storagePath,
          altText: null,
          sortOrder: images.length + uploaded.length,
          isPrimary: images.length + uploaded.length === 0,
          createdAt: new Date().toISOString(),
        });
      }
      await persistImages([...images, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible subir la imagen");
      setIsSaving(false);
    }
  }

  async function replaceImage(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!product || !file) return;
    setIsSaving(true);
    setError(null);
    try {
      const uploaded = await uploadMachineryImage(file);
      await persistImages(
        images.map((image, current) =>
          current === index ? { ...image, storagePath: uploaded.storagePath } : image,
        ),
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible reemplazar la imagen");
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!product || !window.confirm("¿Eliminar esta máquina y sus imágenes asociadas?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/machinery/products/${product.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response, "No fue posible eliminar el producto"));
      onDeleted(product.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el producto");
    } finally {
      setIsSaving(false);
    }
  }

  const savedProduct = product !== null;
  return (
    <aside className="border border-white/10 bg-[#17181c] xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto" aria-label="Editor de maquinaria">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">{savedProduct ? "Editar maquinaria" : "Nueva maquinaria"}</p><h3 className="mt-2 font-display text-2xl font-bold text-white">{savedProduct ? product.name : "Producto de maquinaria"}</h3></div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white" aria-label="Cerrar editor"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 border-b border-white/10">
        {([ ["info", "Información"], ["specs", "Especificaciones"], ["images", "Imágenes"] ] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? "border-b-2 border-brand px-2 py-3 text-xs font-semibold text-white" : "border-b-2 border-transparent px-2 py-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"}>{label}</button>)}
      </div>
      <form onSubmit={saveProduct} className="p-5">
        {error && <p className="mb-4 border border-brand/35 bg-brand/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {activeTab === "info" && <div className="space-y-4">
          <Field label="Nombre"><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} onBlur={() => setForm((current) => ({ ...current, slug: current.slug || slugify(current.name) }))} className="admin-input" placeholder="Nombre de la máquina" /></Field>
          <Field label="Slug"><input required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="admin-input" placeholder="nombre-de-la-maquina" /></Field>
          <Field label="Categoría"><select required value={form.categoryId || ""} onChange={(event) => setForm((current) => ({ ...current, categoryId: Number(event.target.value) }))} className="admin-input"><option value="" disabled>Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Descripción corta"><textarea required value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} className="admin-input min-h-20 resize-y" placeholder="Resumen claro para el catálogo" /></Field>
          <Field label="Descripción completa"><textarea value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} className="admin-input min-h-32 resize-y" placeholder="Información técnica y comercial opcional" /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Nota de precio"><input value={form.priceNote ?? ""} onChange={(event) => setForm((current) => ({ ...current, priceNote: event.target.value || null }))} className="admin-input" placeholder="Consultar" /></Field><Field label="Orden"><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="admin-input" /></Field></div>
          <PublishToggle checked={form.isPublished} onChange={(isPublished) => setForm((current) => ({ ...current, isPublished }))} />
        </div>}
        {activeTab === "specs" && <SpecificationsEditor value={form.specifications} onChange={(specifications) => setForm((current) => ({ ...current, specifications }))} />}
        {activeTab === "images" && (savedProduct ? <ImageManager images={images} isSaving={isSaving} onUpload={upload} onReplace={replaceImage} onSave={persistImages} /> : <section className="border border-dashed border-white/15 bg-white/[0.02] px-4 py-9 text-center"><ImagePlus className="mx-auto h-6 w-6 text-zinc-600" /><h4 className="mt-4 font-display text-lg font-semibold text-zinc-100">Imágenes del producto</h4><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">Guardá el producto primero para poder subir imágenes.</p></section>)}
        {activeTab !== "images" && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><>{savedProduct ? <button type="button" onClick={remove} disabled={isSaving} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />Eliminar</button> : <span />}</><button type="submit" disabled={isSaving || categories.length === 0} className="admin-button-primary">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{savedProduct ? "Guardar" : "Crear producto"}</button></div>}
      </form>
    </aside>
  );
}

function SpecificationsEditor({ value, onChange }: { value: MachinerySpecification[]; onChange: (value: MachinerySpecification[]) => void }) {
  function update(index: number, field: keyof MachinerySpecification, fieldValue: string) { onChange(value.map((specification, current) => current === index ? { ...specification, [field]: fieldValue } : specification)); }
  return <div><p className="text-sm leading-relaxed text-zinc-500">Agrega solamente los campos técnicos que apliquen a esta máquina.</p><div className="mt-4 space-y-3">{value.map((specification, index) => <div key={`${index}-${specification.label}`} className="grid gap-2 border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[1fr_1fr_auto]"><input value={specification.label} onChange={(event) => update(index, "label", event.target.value)} className="admin-input" placeholder="Campo" /><input value={specification.value} onChange={(event) => update(index, "value", event.target.value)} className="admin-input" placeholder="Valor" /><button type="button" onClick={() => onChange(value.filter((_, current) => current !== index))} className="grid h-10 w-10 place-items-center border border-white/10 text-zinc-400 transition hover:border-red-300/50 hover:text-red-300" aria-label="Eliminar especificación"><Trash2 className="h-4 w-4" /></button></div>)}</div><button type="button" onClick={() => onChange([...value, { label: "", value: "" }])} className="mt-4 inline-flex items-center gap-2 border border-white/15 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/35"><Plus className="h-4 w-4" />Añadir especificación</button></div>;
}

function ImageManager({
  images,
  isSaving,
  onUpload,
  onReplace,
  onSave,
}: {
  images: MachineryProduct["images"];
  isSaving: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReplace: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (images: MachineryProduct["images"]) => void;
}) {
  function update(index: number, changes: Partial<MachineryProduct["images"][number]>) {
    onSave(images.map((image, current) => (current === index ? { ...image, ...changes } : image)));
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
    if (!image || !window.confirm("¿Eliminar esta imagen? Se borrará únicamente su registro y el archivo asociado de Maquinaria.")) return;
    const remaining = images
      .filter((_, current) => current !== index)
      .map((current, sortOrder) => ({ ...current, sortOrder }));
    if (image.isPrimary && remaining[0]) remaining[0] = { ...remaining[0], isPrimary: true };
    onSave(remaining);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
          La imagen principal será la referencia para la futura integración pública.
        </p>
        <span className="text-xs text-zinc-600">JPG, PNG o WEBP · hasta 10 MB</span>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-sm font-medium text-zinc-300 transition hover:border-brand/70 hover:bg-brand/5">
        <Upload className="h-4 w-4" />
        {images.length === 0 ? "Subir primera imagen" : "Subir imágenes"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onUpload} disabled={isSaving} className="sr-only" />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <article key={image.storagePath} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 border border-white/10 bg-white/[0.025] p-3">
            <img src={getMachineryImagePublicUrl(image.storagePath)} alt={image.altText ?? "Vista previa de maquinaria"} className="h-20 w-[4.75rem] object-cover" />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-300">Imagen {index + 1}</span>
                    <span className={image.isPrimary ? "border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-red-200" : "border border-white/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-zinc-500"}>
                      {image.isPrimary ? "Principal" : "Secundaria"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[0.68rem] text-zinc-600">{image.storagePath.split("/").pop()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => reorder(index, -1)} disabled={isSaving || index === 0} className="image-action" aria-label="Subir imagen"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => reorder(index, 1)} disabled={isSaving || index === images.length - 1} className="image-action" aria-label="Bajar imagen"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => remove(index)} disabled={isSaving} className="image-action hover:border-red-300/50 hover:text-red-300" aria-label="Eliminar imagen"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <input defaultValue={image.altText ?? ""} onBlur={(event) => { const altText = event.target.value || null; if (altText !== image.altText) update(index, { altText }); }} className="admin-input mt-3 h-9 text-xs" placeholder="Texto alternativo opcional" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="radio" name="machinery-primary-image" checked={image.isPrimary} onChange={() => onSave(images.map((current, currentIndex) => ({ ...current, isPrimary: currentIndex === index })))} disabled={isSaving} className="accent-[#e50914]" />Imagen principal</label>
                <label className="cursor-pointer text-xs font-medium text-brand hover:text-red-300">Reemplazar<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onReplace(index, event)} disabled={isSaving} className="sr-only" /></label>
              </div>
            </div>
          </article>
        ))}
      </div>

      {images.length === 0 && <div className="mt-4 border border-dashed border-white/15 px-4 py-6 text-center"><p className="text-sm text-zinc-400">Este producto todavía no tiene imágenes.</p><p className="mt-1 text-xs text-zinc-600">Usá “Subir primera imagen” para iniciar la galería.</p></div>}
    </div>
  );
}

export function MachineryAdminWorkspace() {
  const [categories, setCategories] = useState<MachineryCategory[]>([]);
  const [products, setProducts] = useState<MachineryProduct[]>([]);
  const [metrics, setMetrics] = useState<MachineryMetrics>(EMPTY_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>("all");
  const [categoryEditor, setCategoryEditor] = useState<MachineryCategory | null | undefined>(undefined);
  const [productEditor, setProductEditor] = useState<ProductEditorTarget>(undefined);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [categoryData, productData] = await Promise.all([
        requestJson<{ categories: MachineryCategory[] }>("/api/admin/machinery/categories"),
        requestJson<{ products: MachineryProduct[]; metrics: MachineryMetrics }>("/api/admin/machinery/products"),
      ]);
      setCategories(categoryData.categories);
      setProducts(productData.products);
      setMetrics(productData.metrics);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Maquinaria");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesCategory = categoryFilter === "all" || product.categoryId === Number(categoryFilter);
    const matchesPublication = publicationFilter === "all" || (publicationFilter === "published" ? product.isPublished : !product.isPublished);
    return matchesSearch && matchesCategory && matchesPublication;
  }), [products, search, categoryFilter, publicationFilter]);

  function upsertCategory(category: MachineryCategory) { setCategories((current) => [...current.filter((candidate) => candidate.id !== category.id), category].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))); void refresh(); }
  function upsertProduct(product: MachineryProduct) { setProducts((current) => [...current.filter((candidate) => candidate.id !== product.id), product].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))); setProductEditor(product); void refresh(); }

  return (
    <div>
      <section className="border-b border-white/10 pb-8 md:pb-10"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">Módulo activo</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">Maquinaria</h2><p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">Categorías, fichas técnicas e imágenes para el catálogo industrial de CYMT.</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setCategoryEditor(null)} className="admin-button-secondary"><FolderPlus className="h-4 w-4" />Nueva categoría</button><button type="button" onClick={() => setProductEditor(null)} disabled={categories.length === 0} className="admin-button-primary"><Plus className="h-4 w-4" />Nuevo producto</button></div></div></section>
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard label="Categorías" value={metrics.categoryCount} icon={FolderPlus} /><StatCard label="Productos" value={metrics.productCount} icon={Package} /><StatCard label="Publicados" value={metrics.publishedCount} icon={Check} /><StatCard label="Borradores" value={metrics.draftCount} icon={FileText} /></section>
      {error && <p className="mt-6 border border-brand/35 bg-brand/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <section className="mt-8 grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(22rem,0.92fr)]">
        <aside className="border border-white/10 bg-[#17181c] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-white">Categorías</h3><button type="button" onClick={() => setCategoryEditor(null)} className="grid h-8 w-8 place-items-center border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white" aria-label="Nueva categoría"><Plus className="h-4 w-4" /></button></div><div className="mt-4 space-y-2">{isLoading ? <LoadingRows /> : categories.length === 0 ? <EmptyCopy text="Aún no hay categorías" action="Crear categoría" onClick={() => setCategoryEditor(null)} /> : categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryEditor(category)} className="w-full border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-white/25 hover:bg-white/[0.04]"><div className="flex items-start justify-between gap-2"><span className="font-medium text-zinc-100">{category.name}</span><Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-500" /></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-zinc-500">{category.productCount} {category.productCount === 1 ? "producto" : "productos"}</span><StatusBadge published={category.isPublished} /></div></button>)}</div></aside>
        <section className="min-w-0 border border-white/10 bg-[#17181c]"><div className="border-b border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-white">Productos</h3><span className="text-sm text-zinc-500">{filteredProducts.length} visibles</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input pl-9" placeholder="Buscar por nombre" /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="admin-input"><option value="all">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value as PublicationFilter)} className="admin-input"><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option></select></div></div><div className="divide-y divide-white/10">{isLoading ? <LoadingRows /> : filteredProducts.length === 0 ? <div className="p-5"><EmptyCopy text={products.length === 0 ? "Aún no hay maquinaria registrada" : "No hay resultados para estos filtros"} action={products.length === 0 && categories.length > 0 ? "Crear primer producto" : undefined} onClick={() => setProductEditor(null)} /></div> : filteredProducts.map((product) => <button key={product.id} type="button" onClick={() => setProductEditor(product)} className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-3 p-4 text-left transition hover:bg-white/[0.03]"><div className="h-14 w-14 overflow-hidden border border-white/10 bg-black/20">{product.images[0] ? <img src={getMachineryImagePublicUrl(product.images[0].storagePath)} alt="" className="h-full w-full object-cover" /> : <Settings2 className="m-4 h-6 w-6 text-zinc-700" />}</div><div className="min-w-0"><p className="truncate font-medium text-zinc-100">{product.name}</p><p className="mt-1 truncate text-xs text-zinc-500">{product.categoryName} · {product.slug}</p></div><div className="flex flex-col items-end gap-2"><StatusBadge published={product.isPublished} /><Pencil className="h-3.5 w-3.5 text-zinc-500" /></div></button>)}</div></section>
        {productEditor !== undefined ? <ProductEditor product={productEditor} categories={categories} onClose={() => setProductEditor(undefined)} onSaved={upsertProduct} onDeleted={(id) => { setProducts((current) => current.filter((product) => product.id !== id)); setProductEditor(undefined); void refresh(); }} /> : <section className="hidden min-h-72 place-items-center border border-dashed border-white/15 bg-white/[0.015] p-8 text-center xl:grid"><div><Settings2 className="mx-auto h-6 w-6 text-zinc-600" /><h3 className="mt-4 font-display text-lg font-semibold text-zinc-200">Selecciona una máquina</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">Abrí un producto para editar su información, especificaciones e imágenes.</p>{categories.length > 0 && <button type="button" onClick={() => setProductEditor(null)} className="admin-button-secondary mt-5"><Plus className="h-4 w-4" />Nuevo producto</button>}</div></section>}
      </section>
      {categoryEditor !== undefined && <CategoryEditor category={categoryEditor} onClose={() => setCategoryEditor(undefined)} onSaved={upsertCategory} onDeleted={(id) => { setCategories((current) => current.filter((category) => category.id !== id)); void refresh(); }} />}
    </div>
  );
}

function LoadingRows() { return <div className="space-y-3 p-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse bg-white/[0.04]" />)}</div>; }

function EmptyCopy({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) { return <div className="border border-dashed border-white/15 p-5 text-center"><p className="text-sm text-zinc-500">{text}</p>{action && onClick && <button type="button" onClick={onClick} className="mt-3 text-sm font-medium text-brand transition hover:text-red-300">{action}</button>}</div>; }
