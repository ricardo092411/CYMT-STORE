"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle } from "lucide-react";
import type { HomeHero, HomeHeroContent, HomeHeroSource } from "@/types/home-hero";

const FALLBACK_IMAGE = "/images/hero/hero-main.jpg";
const FORM_CONTROL_CLASS = "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand";

type HeroRead = {
  hero: HomeHero;
  source: HomeHeroSource;
};

type SelectedImage = {
  file: File;
  objectUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHomeHero(value: unknown): value is HomeHero {
  return (
    isRecord(value) &&
    typeof value.badge === "string" &&
    typeof value.titlePrefix === "string" &&
    typeof value.titleHighlight === "string" &&
    typeof value.description === "string" &&
    typeof value.primaryLabel === "string" &&
    typeof value.primaryHref === "string" &&
    typeof value.secondaryLabel === "string" &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    typeof value.imageAlt === "string"
  );
}

function toHeroRead(value: unknown): HeroRead | null {
  if (
    !isRecord(value) ||
    !isHomeHero(value.hero) ||
    (value.source !== "database" && value.source !== "row-missing" && value.source !== "table-unavailable")
  ) {
    return null;
  }

  return { hero: value.hero, source: value.source };
}

function toErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" && value.error.trim()
    ? value.error
    : fallback;
}

function toContent(hero: HomeHero): HomeHeroContent {
  const { imageUrl: _imageUrl, ...content } = hero;
  return content;
}

function sameHero(left: HomeHero, right: HomeHero): boolean {
  return (
    left.badge === right.badge &&
    left.titlePrefix === right.titlePrefix &&
    left.titleHighlight === right.titleHighlight &&
    left.description === right.description &&
    left.primaryLabel === right.primaryLabel &&
    left.primaryHref === right.primaryHref &&
    left.secondaryLabel === right.secondaryLabel &&
    left.imageUrl === right.imageUrl &&
    left.imageAlt === right.imageAlt
  );
}

async function readHomeHero(): Promise<HeroRead> {
  const response = await fetch("/api/admin/home-hero", { cache: "no-store" });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(toErrorMessage(payload, "No fue posible obtener el Hero"));

  const heroRead = toHeroRead(payload);
  if (!heroRead) throw new Error("La API no confirmó una configuración de Hero válida");
  return heroRead;
}

export function HomeHeroManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hero, setHero] = useState<HomeHero | null>(null);
  const [source, setSource] = useState<HomeHeroSource | null>(null);
  const [form, setForm] = useState<HomeHeroContent | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContentSaving, setIsContentSaving] = useState(false);
  const [isImageSaving, setIsImageSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshHero = useCallback(async (): Promise<HeroRead> => {
    const confirmed = await readHomeHero();
    setHero(confirmed.hero);
    setSource(confirmed.source);
    setForm(toContent(confirmed.hero));
    return confirmed;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshHero();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No fue posible obtener el Hero");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshHero]);

  useEffect(() => {
    return () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage.objectUrl);
    };
  }, [selectedImage]);

  const isSaving = isContentSaving || isImageSaving;

  function updateForm<K extends keyof HomeHeroContent>(field: K, value: HomeHeroContent[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function selectImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setSelectedImage({ file, objectUrl: URL.createObjectURL(file) });
    setError(null);
    setNotice(null);
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || isSaving) return;

    setIsContentSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/home-hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toErrorMessage(payload, "No fue posible guardar el Hero"));

      const saved = toHeroRead(payload);
      if (!saved) throw new Error("La API no confirmó el Hero guardado");

      const confirmed = await refreshHero();
      if (!sameHero(saved.hero, confirmed.hero)) {
        throw new Error("El Hero se guardó, pero no pudo confirmarse al recargar");
      }

      setNotice("Hero actualizado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar el Hero");
    } finally {
      setIsContentSaving(false);
    }
  }

  async function saveImage() {
    if (!selectedImage || isSaving) return;

    setIsImageSaving(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", selectedImage.file, selectedImage.file.name);

      const response = await fetch("/api/admin/home-hero/image", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toErrorMessage(payload, "No fue posible guardar la imagen del Hero"));
      if (!isRecord(payload) || !isHomeHero(payload.hero) || typeof payload.hero.imageUrl !== "string") {
        throw new Error("La API no confirmó la imagen del Hero");
      }

      const confirmed = await refreshHero();
      if (confirmed.hero.imageUrl !== payload.hero.imageUrl) {
        throw new Error("La imagen se guardó, pero no pudo confirmarse al recargar");
      }

      setSelectedImage(null);
      setNotice(
        payload.warning === "OLD_HERO_IMAGE_CLEANUP_FAILED"
          ? "Imagen asignada. No fue posible eliminar la anterior."
          : "Imagen del Hero actualizada.",
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar la imagen del Hero");
    } finally {
      setIsImageSaving(false);
    }
  }

  const previewSource = selectedImage?.objectUrl ?? hero?.imageUrl ?? FALLBACK_IMAGE;

  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="home-hero-manager-title">
      <div>
        <p className="eyebrow text-brand">Portada persistente</p>
        <h2 id="home-hero-manager-title" className="mt-2 font-display text-2xl font-semibold">Hero principal</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">Administra la portada principal del Home.</p>
      </div>

      {source && source !== "database" && (
        <p className="mt-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
          {source === "table-unavailable"
            ? "Usando valores predeterminados. Aplica el SQL de bootstrap antes de guardar cambios."
            : "Usando valores predeterminados. El primer guardado creará la configuración singleton."}
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-bright">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

      {isLoading || !hero || !form ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-2" />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="overflow-hidden rounded-2xl border border-line bg-bg">
            <div className="relative min-h-72 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSource} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-bg/10" />
              <div className="relative z-10 max-w-lg p-6 sm:p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-soft backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  {hero.badge}
                </span>
                <h3 className="mt-5 font-display text-3xl font-bold leading-[0.95] sm:text-4xl">
                  {hero.titlePrefix} <span className="text-brand">{hero.titleHighlight}</span>
                </h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">{hero.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white">{hero.primaryLabel}</span>
                  <span className="rounded-full border border-line-strong bg-surface/50 px-4 py-2 text-xs font-semibold text-ink">{hero.secondaryLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <form onSubmit={saveContent} className="rounded-2xl border border-line bg-bg-soft p-4 sm:p-5">
              <h3 className="font-display text-lg font-semibold">Contenido</h3>
              <div className="mt-4 grid gap-4">
                <Field label="Badge"><input value={form.badge} onChange={(event) => updateForm("badge", event.target.value)} maxLength={160} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="Título"><input value={form.titlePrefix} onChange={(event) => updateForm("titlePrefix", event.target.value)} maxLength={180} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="Texto destacado"><input value={form.titleHighlight} onChange={(event) => updateForm("titleHighlight", event.target.value)} maxLength={180} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="Descripción"><textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} maxLength={1000} rows={4} required disabled={isSaving} className={`${FORM_CONTROL_CLASS} resize-y`} /></Field>
                <Field label="Texto botón principal"><input value={form.primaryLabel} onChange={(event) => updateForm("primaryLabel", event.target.value)} maxLength={80} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="Destino botón principal"><input value={form.primaryHref} onChange={(event) => updateForm("primaryHref", event.target.value)} maxLength={300} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="Texto botón Club"><input value={form.secondaryLabel} onChange={(event) => updateForm("secondaryLabel", event.target.value)} maxLength={80} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
                <Field label="ALT de imagen"><input value={form.imageAlt} onChange={(event) => updateForm("imageAlt", event.target.value)} maxLength={200} required disabled={isSaving} className={FORM_CONTROL_CLASS} /></Field>
              </div>
              <button type="submit" disabled={isSaving} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-50">
                {isContentSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isContentSaving ? "Guardando..." : "Guardar contenido"}
              </button>
            </form>

            <div className="rounded-2xl border border-line bg-bg-soft p-4 sm:p-5">
              <h3 className="font-display text-lg font-semibold">Imagen</h3>
              <p className="mt-1 text-sm text-ink-muted">JPEG, PNG o WebP; máximo 8 MB.</p>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { selectImage(event.target.files); event.target.value = ""; }} />
              {selectedImage && <p className="mt-3 truncate text-sm text-ink-soft">Lista: {selectedImage.file.name}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink-soft transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
                  <ImagePlus className="h-4 w-4" /> Seleccionar imagen
                </button>
                <button type="button" onClick={() => void saveImage()} disabled={!selectedImage || isSaving} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-50">
                  {isImageSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                  {isImageSaving ? "Guardando..." : "Guardar imagen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
