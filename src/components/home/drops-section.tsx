"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Container, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import { useEditor } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";
import type { Drop } from "@/types/drop";

export function DropsSection() {
  const { productsByDropLive } = useEditor();
  const drops = useDrops();
  const liveDrops = drops.filter((drop) => drop.live);

  return (
    <section className="py-16 md:py-24">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="El corazón de la marca"
            title="Drops"
            description="No hacemos colecciones tradicionales. Lanzamos Drops: ediciones con identidad propia que desaparecen cuando se acaban."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {liveDrops.map((drop, i) => (
            <Reveal key={drop.slug} delay={(i % 3) * 0.08}>
              <DropCard drop={drop} count={productsByDropLive(drop.slug).length} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function DropCard({ drop, count }: { drop: Drop; count: number }) {
  const coverSources = [drop.banner, drop.image]
    .flatMap((source) => {
      const value = source?.trim();
      return value ? [value] : [];
    })
    .filter((source, index, sources) => sources.indexOf(source) === index);
  const [failedCoverCount, setFailedCoverCount] = useState(0);
  const cover = coverSources[failedCoverCount] ?? null;

  return (
    <Link
      href={`/drop/${drop.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div className="relative aspect-[4/5]">
        {cover ? (
          <Image
            src={cover}
            alt={drop.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
            onError={() => setFailedCoverCount((count) => count + 1)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-bg">
            <div className="glow-red absolute -right-12 -top-12 h-52 w-52" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-7xl font-bold text-ink/10">{drop.name.charAt(5) || "D"}</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[0.62rem] uppercase tracking-[0.25em] text-brand">{count} piezas</p>
          <h3 className="mt-1.5 font-display text-2xl font-bold">{drop.name}</h3>
          <p className="text-sm text-ink-soft">{drop.title}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink opacity-0 transition-all duration-300 group-hover:opacity-100">
            Explorar drop <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
