"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useDrops, useDropsRefresh } from "@/providers/drops-provider";
import type { Drop } from "@/types/drop";

type DropFormValues = {
  name: string;
  slug: string;
  title: string;
  description: string;
  theme: string;
  releaseDate: string;
  live: boolean;
};

const EMPTY_FORM: DropFormValues = {
  name: "",
  slug: "",
  title: "",
  description: "",
  theme: "",
  releaseDate: "",
  live: false,
};

const FORM_CONTROL_CLASS = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand";

function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toFormValues(drop: Drop): DropFormValues {
  return {
    name: drop.name,
    slug: drop.slug,
    title: drop.title ?? "",
    description: drop.description ?? "",
    theme: drop.theme ?? "",
    releaseDate: drop.releaseDate ?? "",
    live: drop.live,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDrop(value: unknown): value is Drop {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    isNullableString(value.title) &&
    isNullableString(value.description) &&
    isNullableString(value.banner) &&
    isNullableString(value.image) &&
    isNullableString(value.theme) &&
    typeof value.live === "boolean" &&
    isNullableString(value.releaseDate)
  );
}

function sameDrop(left: Drop, right: Drop): boolean {
  return (
    left.slug === right.slug &&
    left.name === right.name &&
    left.title === right.title &&
    left.description === right.description &&
    left.banner === right.banner &&
    left.image === right.image &&
    left.theme === right.theme &&
    left.live === right.live &&
    left.releaseDate === right.releaseDate
  );
}

async function responseError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // Fall through to the generic response message.
  }
  return "No fue posible guardar el Drop";
}

export function DropManager() {
  const drops = useDrops();
  const refreshDrops = useDropsRefresh();
  const [form, setForm] = useState<DropFormValues>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function closeForm() {
    if (isSaving) return;
    setIsOpen(false);
    setError(null);
  }

  function openCreate() {
    setEditingSlug(null);
    setSlugEdited(false);
    setForm(EMPTY_FORM);
    setError(null);
    setNotice(null);
    setIsOpen(true);
  }

  function openEdit(drop: Drop) {
    setEditingSlug(drop.slug);
    setSlugEdited(true);
    setForm(toFormValues(drop));
    setError(null);
    setNotice(null);
    setIsOpen(true);
  }

  function updateForm<K extends keyof DropFormValues>(field: K, value: DropFormValues[K]) {
    setForm((current) => {
      if (field === "name" && !editingSlug && !slugEdited) {
        return { ...current, name: value as string, slug: slugFromName(value as string) };
      }
      return { ...current, [field]: value };
    });
  }

  async function saveDrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      ...(editingSlug ? { currentSlug: editingSlug } : {}),
      name: form.name,
      slug: form.slug,
      title: form.title || null,
      description: form.description || null,
      theme: form.theme || null,
      live: form.live,
      releaseDate: form.releaseDate || null,
    };

    try {
      const response = await fetch("/api/admin/drops", {
        method: editingSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));

      const data: unknown = await response.json();
      if (!isRecord(data) || !isDrop(data.drop)) {
        throw new Error("La API no confirmó el Drop guardado");
      }
      const savedDrop = data.drop;

      const confirmedDrops = await refreshDrops();
      const confirmedDrop = confirmedDrops.find((drop) => drop.slug === savedDrop.slug);
      if (!confirmedDrop || !sameDrop(confirmedDrop, savedDrop)) {
        throw new Error("El Drop se guardó, pero no pudo confirmarse al recargar");
      }

      setIsOpen(false);
      setNotice(editingSlug ? "Drop actualizado." : "Drop creado. Ya puedes asignarle una carátula.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar el Drop");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-xl font-semibold">Gestión de Drops</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Crea, edita, publica u oculta Drops. Las carátulas se administran en el módulo separado.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-bright"
        >
          <Plus className="h-4 w-4" /> Nuevo Drop
        </button>
      </div>

      {notice && <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

      <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-bg-soft">
        {drops.map((drop) => {
          const cover = drop.banner || drop.image;
          return (
            <li key={drop.slug} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="grid h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={`Carátula de ${drop.name}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid place-items-center font-display text-lg font-bold text-ink-faint">
                    {drop.name.charAt(0).toUpperCase() || "D"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium text-ink">{drop.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${drop.live ? "bg-emerald-500/10 text-emerald-300" : "bg-surface-2 text-ink-faint"}`}>
                    {drop.live ? "Publicado" : "Oculto"}
                  </span>
                </div>
                <p className="truncate text-xs text-ink-faint">/{drop.slug}</p>
                <p className="mt-1 text-xs text-ink-muted">{drop.releaseDate ?? "Sin fecha de lanzamiento"}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(drop)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-muted transition hover:border-brand/40 hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </li>
          );
        })}
      </ul>

      {isOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="drop-form-title">
          <form onSubmit={saveDrop} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-bg p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="drop-form-title" className="font-display text-2xl font-bold">
                  {editingSlug ? "Editar Drop" : "Nuevo Drop"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">La carátula se asigna después desde el gestor de carátulas.</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Cerrar" className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} maxLength={120} required className={FORM_CONTROL_CLASS} />
              </Field>
              <Field label="Slug">
                <input value={form.slug} onChange={(event) => { setSlugEdited(true); updateForm("slug", event.target.value); }} maxLength={120} required className={FORM_CONTROL_CLASS} />
              </Field>
              <Field label="Título">
                <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} maxLength={200} className={FORM_CONTROL_CLASS} />
              </Field>
              <Field label="Tema">
                <input value={form.theme} onChange={(event) => updateForm("theme", event.target.value)} maxLength={40} className={FORM_CONTROL_CLASS} />
              </Field>
              <Field label="Fecha de lanzamiento">
                <input type="date" value={form.releaseDate} onChange={(event) => updateForm("releaseDate", event.target.value)} className={FORM_CONTROL_CLASS} />
              </Field>
              <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink">
                <input type="checkbox" checked={form.live} onChange={(event) => updateForm("live", event.target.checked)} className="h-4 w-4 accent-brand" />
                Publicado
              </label>
            </div>

            <Field label="Descripción" className="mt-4">
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} maxLength={5000} rows={5} className={`${FORM_CONTROL_CLASS} resize-y`} />
            </Field>

            {error && <p className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-bright">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeForm} disabled={isSaving} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:text-ink disabled:opacity-60">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-bright disabled:opacity-60">
                {isSaving ? "Guardando…" : "Guardar Drop"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium text-ink ${className}`}>
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
