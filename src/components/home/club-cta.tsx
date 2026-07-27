"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { site } from "@/data/site";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";

export function ClubCta() {
  const { setClubOpen } = useStore();

  return (
    <section className="py-16 md:py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 text-center md:px-12">
            <div className="glow-red absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Club CYMT
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-bold leading-tight md:text-5xl">
                Sé el primero en entrar a cada Drop.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-ink-muted md:text-lg">
                Acceso anticipado, ediciones limitadas y promociones exclusivas. Sin spam, solo lo
                importante.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2">
                {site.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-xs text-ink-soft"
                  >
                    {interest}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setClubOpen(true)}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_rgba(229,9,20,0.85)] transition hover:bg-brand-bright"
              >
                Quiero unirme <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
