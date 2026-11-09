"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Container } from "@/components/ui";

export type InkShowcaseItem = {
  id: number;
  mediaType: "image" | "video";
  src: string;
  title: string | null;
  caption: string | null;
  alt: string;
};

export function InkShowcaseMedia({ media, productName }: { media: InkShowcaseItem[]; productName: string }) {
  const images = useMemo(() => media.filter((item) => item.mediaType === "image"), [media]);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const selectedImage = images.find((item) => item.id === selectedImageId) ?? null;

  useEffect(() => {
    if (!selectedImage) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedImageId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  if (media.length === 0) return null;

  return (
    <>
      <section className="border-t border-line bg-[#101412] py-16 md:py-20">
        <Container>
          <p className="eyebrow text-[#b8f36b]">Aplicaciones reales</p>
          <h2 className="mt-4 text-balance text-3xl font-bold md:text-4xl">Resultados con esta tinta</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
            Muestras visuales públicas de aplicaciones realizadas con {productName}.
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#17181c]">
                {item.mediaType === "image" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedImageId(item.id)}
                    className="group relative block w-full cursor-zoom-in overflow-hidden bg-[#111412] text-left"
                    aria-label={`Ampliar muestra de ${productName}`}
                  >
                    <img src={item.src} alt={item.alt} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100">
                      <ZoomIn className="h-3.5 w-3.5" /> Ampliar
                    </span>
                  </button>
                ) : (
                  <video
                    src={item.src}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[4/3] w-full bg-black object-contain"
                    aria-label={item.alt}
                  />
                )}
                {(item.title || item.caption) && (
                  <div className="p-5">
                    {item.title && <h3 className="font-semibold text-ink">{item.title}</h3>}
                    {item.caption && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.caption}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </Container>
      </section>

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Muestra ampliada de ${productName}`}
          onClick={() => setSelectedImageId(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
        >
          <div
            className="relative flex h-[90vh] w-[90vw] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={selectedImage.src} alt={selectedImage.alt} className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => setSelectedImageId(null)}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85"
              aria-label="Cerrar muestra ampliada"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
