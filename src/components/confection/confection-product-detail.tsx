"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Scissors, X, ZoomIn } from "lucide-react";
import { Container, buttonVariants } from "@/components/ui";
import { site } from "@/data/site";
import type { PublicConfectionProductDetail } from "@/lib/public-confection";
import { cn } from "@/lib/utils";

function DetailPlaceholder({ name }: { name: string }) {
  return <div className="relative aspect-[5/4] overflow-hidden border border-[#d2bcab] bg-[#e9ddd0]"><div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.48),transparent_34%,rgba(83,52,39,0.1)_70%),repeating-linear-gradient(90deg,transparent_0,transparent_18px,rgba(95,63,47,0.055)_19px,transparent_20px)]" /><Scissors className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-[#a2745e]" /><span className="absolute bottom-4 left-4 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#735e53]">Imagen pendiente · {name}</span></div>;
}

export function ConfectionProductDetail({ product }: { product: PublicConfectionProductDetail }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const selectedImage = product.images[selectedIndex] ?? product.images[0];

  useEffect(() => {
    if (!isLightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (product.images.length > 1 && event.key === "ArrowLeft") {
        setSelectedIndex((index) => (index - 1 + product.images.length) % product.images.length);
      }
      if (product.images.length > 1 && event.key === "ArrowRight") {
        setSelectedIndex((index) => (index + 1) % product.images.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, product.images.length]);

  function showPreviousImage() {
    setSelectedIndex((index) => (index - 1 + product.images.length) % product.images.length);
  }

  function showNextImage() {
    setSelectedIndex((index) => (index + 1) % product.images.length);
  }

  return <><main className="bg-[#fffaf5] text-[#2b2420]"><Container className="py-10 md:py-14"><Link href="/confeccion" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#735e53] transition hover:text-brand"><ArrowLeft className="h-4 w-4" />Volver a Confección</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14"><section><div className="relative aspect-[5/4] overflow-hidden border border-[#d2bcab] bg-[#eee5dc] p-3 sm:p-5">{selectedImage ? <button type="button" onClick={() => setIsLightboxOpen(true)} className="group relative flex h-full w-full cursor-zoom-in items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a2745e]" aria-label={`Ampliar imagen de ${product.name}`}><img src={selectedImage.src} alt={selectedImage.alt} className="h-full w-full object-contain" /><span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-[#2b2420]/80 px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><ZoomIn className="h-3.5 w-3.5" />Ampliar</span></button> : <DetailPlaceholder name={product.name} />}</div>{product.images.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{product.images.map((image, index) => <button key={image.id} type="button" onClick={() => setSelectedIndex(index)} aria-label={`Ver imagen ${index + 1} de ${product.name}`} aria-pressed={selectedIndex === index} className={cn("overflow-hidden border bg-[#eee5dc] p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a2745e]", selectedIndex === index ? "border-[#a2745e]" : "border-[#d2bcab] hover:border-[#a2745e]")}><img src={image.src} alt={image.alt} className="aspect-square w-full object-cover" /></button>)}</div>}</section><section className="flex flex-col"><p className="eyebrow text-brand">{product.categoryName}</p><h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl">{product.name}</h1><p className="mt-6 text-lg leading-relaxed text-[#59483f]">{product.shortDescription}</p>{product.priceNote && <p className="mt-6 inline-flex w-fit border border-[#be8b73] bg-[#f8f1e9] px-3 py-2 text-sm font-semibold text-[#5d392e]">{product.priceNote}</p>}{product.description && <p className="mt-7 leading-relaxed text-[#735e53]">{product.description}</p>}{product.specifications.length > 0 && <div className="mt-8 border-y border-[#d8c7b8]">{product.specifications.map((specification) => <div key={`${specification.label}-${specification.value}`} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 border-b border-[#d8c7b8] px-1 py-3 text-sm last:border-b-0"><span className="font-semibold text-[#4e352b]">{specification.label}</span><span className="text-[#735e53]">{specification.value}</span></div>)}</div>}<a href={site.whatsapp.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "mt-9 w-fit")}><MessageCircle className="h-4 w-4" />Cotizar por WhatsApp</a></section></div></Container></main>{isLightboxOpen && selectedImage && <div role="dialog" aria-modal="true" aria-label={`Visor de imágenes de ${product.name}`} onClick={() => setIsLightboxOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"><div className="relative flex h-[90vh] w-[90vw] items-center justify-center" onClick={(event) => event.stopPropagation()}><img src={selectedImage.src} alt={selectedImage.alt} className="max-h-full max-w-full object-contain" /><button type="button" onClick={() => setIsLightboxOpen(false)} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Cerrar imagen ampliada"><X className="h-5 w-5" /></button>{product.images.length > 1 && <><button type="button" onClick={showPreviousImage} className="absolute left-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Ver imagen anterior"><ChevronLeft className="h-6 w-6" /></button><button type="button" onClick={showNextImage} className="absolute right-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Ver imagen siguiente"><ChevronRight className="h-6 w-6" /></button></>}</div></div>}</>;
}
