"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle } from "lucide-react";
import { useDrops, useDropsRefresh } from "@/providers/drops-provider";
import type { Drop } from "@/types/drop";

type SelectedCover = {
  file: File;
  objectUrl: string;
};

type SavedDropCover = {
  slug: string;
  banner: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" && value.error.trim()
    ? value.error
    : fallback;
}

function toSavedDropCover(value: unknown): SavedDropCover | null {
  if (
    !isRecord(value) ||
    !isRecord(value.drop) ||
    typeof value.drop.slug !== "string" ||
    typeof value.drop.banner !== "string"
  ) {
    return null;
  }

  return { slug: value.drop.slug, banner: value.drop.banner };
}

function DropCoverPreview({
  source,
  name,
  onSourceError,
}: {
  source: string | null;
  name: string;
  onSourceError: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(5) || "D";

  if (source && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt={`Carátula de ${name}`}
        className="h-full w-full object-cover"
        onError={() => {
          setFailed(true);
          onSourceError();
        }}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-surface-2 via-surface to-bg">
      <div className="glow-red absolute -right-10 -top-10 h-32 w-32" />
      <span className="relative font-display text-5xl font-bold text-ink/10">{initial}</span>
    </div>
  );
}

function DropCoverRow({ drop }: { drop: Drop }) {
  const refreshDrops = useDropsRefresh();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCover, setSelectedCover] = useState<SelectedCover | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selectedCover) URL.revokeObjectURL(selectedCover.objectUrl);
    };
  }, [selectedCover]);

  const previewSource = selectedCover?.objectUrl ?? drop.banner;
  const hasConfirmedCover = !selectedCover && Boolean(drop.banner) && !previewFailed;

  function selectCover(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setSelectedCover({ file, objectUrl: URL.createObjectURL(file) });
    setPreviewFailed(false);
    setError(null);
    setNotice(null);
  }

  async function saveCover() {
    if (!selectedCover || isSaving) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("slug", drop.slug);
      formData.set("file", selectedCover.file, selectedCover.file.name);

      const response = await fetch("/api/admin/drops/cover", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(toErrorMessage(payload, "No fue posible guardar la carátula"));
      }

      const savedCover = toSavedDropCover(payload);
      if (!savedCover || savedCover.slug !== drop.slug) {
        throw new Error("La API no confirmó la carátula del Drop esperado");
      }

      const confirmedDrops = await refreshDrops();
      const confirmedDrop = confirmedDrops.find((item) => item.slug === drop.slug);
      if (!confirmedDrop || confirmedDrop.banner !== savedCover.banner) {
        throw new Error("La carátula se guardó, pero no pudo confirmarse al recargar los Drops");
      }

      setSelectedCover(null);
      setPreviewFailed(false);
      setNotice(
        isRecord(payload) && payload.warning === "OLD_COVER_CLEANUP_FAILED"
          ? "Carátula asignada. No fue posible eliminar la anterior."
          : "Carátula asignada.",
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar la carátula");
    } finally {
      setIsSaving(false);
    }
  }

  const status = isSaving
    ? "GUARDANDO..."
    : error
      ? "ERROR"
      : hasConfirmedCover
        ? "CARÁTULA ASIGNADA"
        : "SIN CARÁTULA";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-xl border border-line bg-bg sm:w-28">
        <DropCoverPreview
          key={previewSource ?? drop.slug}
          source={previewSource}
          name={drop.name}
          onSourceError={() => setPreviewFailed(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-ink">{drop.name}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{drop.slug}</p>
        <p
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold tracking-[0.12em] ${
            error
              ? "border-brand/50 bg-brand-soft text-brand"
              : hasConfirmedCover
                ? "border-line bg-surface-2 text-ink-soft"
                : "border-line bg-bg text-ink-muted"
          }`}
        >
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
          {error ? <AlertCircle className="h-3.5 w-3.5" /> : null}
          {!isSaving && !error && hasConfirmedCover ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {status}
        </p>
        {selectedCover && <p className="mt-2 truncate text-xs text-ink-soft">Lista: {selectedCover.file.name}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-brand">{error}</p>}
        {notice && <p role="status" className="mt-2 text-sm text-ink-soft">{notice}</p>}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-44">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            selectCover(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink-soft transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" /> Seleccionar imagen
        </button>
        <button
          type="button"
          onClick={() => void saveCover()}
          disabled={!selectedCover || isSaving}
          className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSaving ? "Guardando..." : "Guardar carátula"}
        </button>
      </div>
    </article>
  );
}

export function DropCoverManager() {
  const drops = useDrops();

  return (
    <section className="mt-12" aria-labelledby="drop-cover-manager-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Media persistente</p>
          <h2 id="drop-cover-manager-title" className="mt-2 font-display text-2xl font-semibold">
            Carátulas de Drops
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Selecciona una imagen y confírmala explícitamente. La vista pública se actualiza solo tras la confirmación del servidor.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-soft">
          Drops: <span className="font-semibold text-ink">{drops.length}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {drops.map((drop) => <DropCoverRow key={drop.slug} drop={drop} />)}
      </div>
    </section>
  );
}
