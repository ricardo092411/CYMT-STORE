"use client";

import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { getInkImagePublicUrl, uploadInkLandingImage } from "@/lib/ink-storage";
import type { InkLandingSettings } from "@/lib/ink-types";

const EMPTY_SETTINGS: InkLandingSettings = {
  heroStoragePath: null,
  heroAltText: null,
  updatedAt: null,
};

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(await responseError(response, "No fue posible completar la solicitud"));
  return response.json() as Promise<T>;
}

export function InkLandingEditor() {
  const [settings, setSettings] = useState<InkLandingSettings>(EMPTY_SETTINGS);
  const [altText, setAltText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await requestJson<{ settings: InkLandingSettings }>("/api/admin/inks/landing");
        if (!active) return;
        setSettings(response.settings);
        setAltText(response.settings.heroAltText ?? "");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No fue posible cargar la portada");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setError(null);
    setPendingFile(file);
    setPendingPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      const upload = pendingFile ? await uploadInkLandingImage(pendingFile) : null;
      const response = await requestJson<{ settings: InkLandingSettings }>("/api/admin/inks/landing", {
        method: "PATCH",
        body: JSON.stringify({
          heroStoragePath: upload?.storagePath ?? settings.heroStoragePath,
          heroAltText: altText || null,
        }),
      });
      setSettings(response.settings);
      setAltText(response.settings.heroAltText ?? "");
      setPendingFile(null);
      setPendingPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar la portada");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeHero() {
    if (!settings.heroStoragePath || !window.confirm("¿Eliminar la portada actual de CMT Ink?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await requestJson<{ settings: InkLandingSettings }>("/api/admin/inks/landing", {
        method: "PATCH",
        body: JSON.stringify({ heroStoragePath: null, heroAltText: null }),
      });
      setSettings(response.settings);
      setAltText("");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No fue posible eliminar la portada");
    } finally {
      setIsSaving(false);
    }
  }

  const currentPreview = pendingPreview ?? (settings.heroStoragePath ? getInkImagePublicUrl(settings.heroStoragePath) : null);

  return (
    <section className="mt-8 border border-white/10 bg-[#17181c] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b8f36b]">Portada</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-white">Hero de CMT Ink</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Esta imagen se usa en la portada pública de CMT Ink. Si no configurás una, se mantiene el placeholder actual.
          </p>
        </div>
        <span className="text-xs text-zinc-600">JPG, PNG o WEBP · hasta 10 MB</span>
      </div>

      {error && <p className="mt-5 border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.72fr)]">
        <div className="aspect-[5/4] overflow-hidden border border-white/10 bg-[#111412]">
          {isLoading ? (
            <div className="grid h-full place-items-center text-sm text-zinc-500">Cargando portada…</div>
          ) : currentPreview ? (
            <img src={currentPreview} alt={altText || "Vista previa de portada CMT Ink"} className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-sm leading-relaxed text-zinc-500">
              <ImagePlus className="mb-3 h-6 w-6 text-[#b8f36b]/45" />
              Aún no hay portada configurada. La landing pública conservará su placeholder Glow.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-white/[0.02] px-4 py-7 text-sm font-medium text-zinc-300 transition hover:border-[#b8f36b]/60 hover:bg-[#b8f36b]/5">
            <Upload className="h-4 w-4" /> {pendingFile ? "Reemplazar selección" : "Seleccionar imagen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectFile}
              disabled={isSaving || isLoading}
              className="sr-only"
            />
          </label>
          {pendingFile && <p className="text-xs text-[#b8f36b]">Vista previa antes de guardar: {pendingFile.name}</p>}
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-zinc-400">Texto alternativo</span>
            <textarea
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              maxLength={300}
              className="admin-input min-h-24 resize-y"
              placeholder="Descripción breve de la portada"
              disabled={isSaving || isLoading}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void save()} disabled={isSaving || isLoading} className="admin-button-primary">
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />} Guardar portada
            </button>
            {settings.heroStoragePath && (
              <button type="button" onClick={() => void removeHero()} disabled={isSaving} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-red-300 transition hover:bg-red-400/10">
                <Trash2 className="h-4 w-4" /> Eliminar imagen
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
