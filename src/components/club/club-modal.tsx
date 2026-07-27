"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Sparkles, Loader2, Mail } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClubModal() {
  const { clubOpen, setClubOpen } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function reset() {
    setName("");
    setEmail("");
    setInterests([]);
    setStatus("idle");
  }

  function close() {
    setClubOpen(false);
    // delay reset so the exit animation stays clean
    setTimeout(reset, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), interests }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {clubOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Club CYMT">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />

            <button
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative max-h-[88vh] overflow-y-auto px-6 py-8 sm:px-8">
              {status === "success" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold">¡Bienvenido al Club!</h3>
                  <p className="mt-2 max-w-sm text-ink-muted">
                    Te avisaremos primero cuando lancemos nuevos drops y promociones exclusivas.
                    Revisa tu correo para confirmar.
                  </p>
                  <button
                    onClick={close}
                    className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-bright"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                    <Sparkles className="h-3.5 w-3.5" /> CLUB CYMT
                  </div>
                  <h3 className="font-display text-2xl font-bold sm:text-3xl">Únete al Club CYMT</h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    Acceso anticipado a drops exclusivos, ediciones limitadas y promociones.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="club-name" className="mb-1.5 block text-xs uppercase tracking-wider text-ink-muted">
                        Nombre <span className="text-ink-faint normal-case">(opcional)</span>
                      </label>
                      <input
                        id="club-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className="h-11 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none transition focus:border-brand"
                      />
                    </div>

                    <div>
                      <label htmlFor="club-email" className="mb-1.5 block text-xs uppercase tracking-wider text-ink-muted">
                        Correo electrónico <span className="text-brand">*</span>
                      </label>
                      <input
                        id="club-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        placeholder="tu@correo.com"
                        className="h-11 w-full rounded-xl border border-line bg-bg px-4 text-ink outline-none transition focus:border-brand"
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
                        ¿Qué te interesa?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {site.interests.map((interest) => {
                          const active = interests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => toggleInterest(interest)}
                              aria-pressed={active}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                                active
                                  ? "border-brand bg-brand-soft text-brand"
                                  : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
                              )}
                            >
                              {active && <Check className="h-3.5 w-3.5" />}
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {status === "error" && (
                      <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
                        No pudimos registrarte. Verifica tu correo e intenta de nuevo.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_34px_-12px_rgba(229,9,20,0.8)] transition hover:bg-brand-bright disabled:opacity-60"
                    >
                      {status === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Quiero unirme
                    </button>
                  </form>

                  <p className="mt-4 text-center text-xs text-ink-faint">
                    No enviamos spam. Solo avisos de nuevos Drops y promociones.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
