"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "@/providers/store-provider";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export function Hero() {
  const { setClubOpen } = useStore();

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Background */}
      <Image
        src="/images/hero/hero-main.jpg"
        alt="CYMT STORE — streetwear premium "
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-bg/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/20" />

      {/* Content */}
      <div className="container-x relative z-10 py-24">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              El Salvador · Entregas en 48 Horas
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-display text-5xl font-bold leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            Tu Personalidad Merece <span className="text-brand">Diseños Exclusivos.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            CYMT STORE — streetwear premium diseñado en El Salvador. Drops exclusivos de Anime,
            Rock, Naturaleza, Retro y Mas. Entregas En 48 Horas.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/tienda"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_rgba(229,9,20,0.85)] transition hover:bg-brand-bright"
            >
              Explorar Drops
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => setClubOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/50 px-7 py-3.5 text-sm font-semibold text-ink backdrop-blur transition hover:bg-surface-2"
            >
              <Sparkles className="h-4 w-4 text-brand" />
              Únete al Club
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink-faint md:flex">
        <span className="text-[0.6rem] uppercase tracking-[0.3em]">Scroll</span>
        <span className="h-10 w-px bg-gradient-to-b from-line-strong to-transparent" />
      </div>
    </section>
  );
}
