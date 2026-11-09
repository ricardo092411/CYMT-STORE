"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileVideo,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { getInkImagePublicUrl, uploadInkShowcaseMedia } from "@/lib/ink-storage";
import type { InkProduct, InkProductMedia, InkProductMediaPayload } from "@/lib/ink-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const value: unknown = await response.json();
    if (isRecord(value) && typeof value.error === "string" && value.error.trim()) return value.error;
  } catch {
    // Use the contextual fallback below.
  }
  return fallback;
}

function payload(media: InkProductMedia[]): InkProductMediaPayload[] {
  return media.map((item, sortOrder) => ({
    ...(item.id > 0 ? { id: item.id } : {}),
    mediaType: item.mediaType,
    storagePath: item.storagePath,
    title: item.title,
    caption: item.caption,
    altText: item.altText,
    sortOrder,
  }));
}

export function InkShowcaseManager({ product, onSaved }: { product: InkProduct; onSaved: (product: InkProduct) => void }) {
  const [media, setMedia] = useState(product.showcaseMedia);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(nextMedia: InkProductMedia[]) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/inks/products/${product.id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media: payload(nextMedia) }),
      });
      if (!response.ok) throw new Error(await responseError(response, "No fue posible guardar las muestras"));
      const value = await response.json() as { product: InkProduct };
      setMedia(value.product.showcaseMedia);
      onSaved(value.product);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar las muestras");
    } finally {
      setIsSaving(false);
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const uploaded: InkProductMedia[] = [];
      for (const file of files) {
        const result = await uploadInkShowcaseMedia(file);
        uploaded.push({
          id: 0,
          productId: product.id,
          mediaType: result.mediaType,
          storagePath: result.storagePath,
          title: null,
          caption: null,
          altText: null,
          sortOrder: media.length + uploaded.length,
          createdAt: new Date().toISOString(),
        });
      }
      await persist([...media, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible subir la muestra");
      setIsSaving(false);
    }
  }

  function update(index: number, changes: Partial<InkProductMedia>) {
    void persist(media.map((item, current) => (current === index ? { ...item, ...changes } : item)));
  }

  function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next.map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  function remove(index: number) {
    const item = media[index];
    if (!item || !window.confirm("¿Eliminar esta muestra y su archivo público de CMT Ink?")) return;
    void persist(media.filter((_, current) => current !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
          Fotos de estampados y videos cortos públicos. No se mezclan con las imágenes de producto.
        </p>
        <span className="text-xs text-zinc-600">Imágenes hasta 10 MB · videos hasta 25 MB</span>
      </div>
      {error && <p className="mt-4 border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-sm font-medium text-zinc-300 transition hover:border-[#b8f36b]/60 hover:bg-[#b8f36b]/5">
        <Upload className="h-4 w-4" /> Subir imágenes o videos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          multiple
          onChange={upload}
          disabled={isSaving}
          className="sr-only"
        />
      </label>
      <div className="mt-4 space-y-3">
        {media.map((item, index) => (
          <article key={item.storagePath} className="grid gap-3 border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            {item.mediaType === "video" ? (
              <video src={getInkImagePublicUrl(item.storagePath)} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" />
            ) : (
              <img src={getInkImagePublicUrl(item.storagePath)} alt={item.altText ?? item.title ?? "Muestra CMT Ink"} className="aspect-video w-full object-cover" />
            )}
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b8f36b]">
                    {item.mediaType === "video" ? <FileVideo className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {item.mediaType === "video" ? "Video" : "Imagen"}
                  </span>
                  <p className="mt-1 truncate text-[0.68rem] text-zinc-600">{item.storagePath.split("/").pop()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => reorder(index, -1)} disabled={isSaving || index === 0} className="image-action" aria-label="Subir muestra"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => reorder(index, 1)} disabled={isSaving || index === media.length - 1} className="image-action" aria-label="Bajar muestra"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => remove(index)} disabled={isSaving} className="image-action hover:border-red-300/50 hover:text-red-300" aria-label="Eliminar muestra"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input defaultValue={item.title ?? ""} onBlur={(event) => { const title = event.target.value || null; if (title !== item.title) update(index, { title }); }} className="admin-input h-9 text-xs" placeholder="Título opcional" />
                <input defaultValue={item.altText ?? ""} onBlur={(event) => { const altText = event.target.value || null; if (altText !== item.altText) update(index, { altText }); }} className="admin-input h-9 text-xs" placeholder="Texto alternativo opcional" />
              </div>
              <textarea defaultValue={item.caption ?? ""} onBlur={(event) => { const caption = event.target.value || null; if (caption !== item.caption) update(index, { caption }); }} className="admin-input mt-2 min-h-20 resize-y text-xs" placeholder="Caption opcional" />
            </div>
          </article>
        ))}
      </div>
      {media.length === 0 && <div className="mt-4 border border-dashed border-white/15 px-4 py-6 text-center"><p className="text-sm text-zinc-400">Este producto todavía no tiene muestras públicas.</p></div>}
      {isSaving && <p className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Guardando muestras…</p>}
    </div>
  );
}
