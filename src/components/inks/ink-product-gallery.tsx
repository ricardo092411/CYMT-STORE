"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

export type InkGalleryImage = {
  id: number;
  src: string;
  alt: string;
  isPrimary: boolean;
};

function InkImagePlaceholder({ name }: { name: string }) {
  return (
    <div className="relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-[#111412]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_66%_35%,rgba(184,243,107,0.22),transparent_28%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[auto,2rem_2rem,2rem_2rem]" />
      <Sparkles className="relative h-12 w-12 text-[#b8f36b]/45" />
      <span className="absolute bottom-4 left-4 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        Imagen pendiente · {name}
      </span>
    </div>
  );
}

export function InkProductGallery({ name, images }: { name: string; images: InkGalleryImage[] }) {
  const initialIndex = Math.max(0, images.findIndex((image) => image.isPrimary));
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const selectedImage = images[selectedIndex] ?? images[0];

  useEffect(() => {
    if (!isLightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (images.length > 1 && event.key === "ArrowLeft") {
        setSelectedIndex((index) => (index - 1 + images.length) % images.length);
      }
      if (images.length > 1 && event.key === "ArrowRight") {
        setSelectedIndex((index) => (index + 1) % images.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, isLightboxOpen]);

  function showPreviousImage() {
    setSelectedIndex((index) => (index - 1 + images.length) % images.length);
  }

  function showNextImage() {
    setSelectedIndex((index) => (index + 1) % images.length);
  }

  return (
    <>
      <section>
        <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-line bg-[#111412] p-3 sm:p-5">
          {selectedImage ? (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="group relative flex h-full w-full cursor-zoom-in items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8f36b]"
              aria-label={`Ampliar imagen de ${name}`}
            >
              <img src={selectedImage.src} alt={selectedImage.alt} className="h-full w-full object-contain" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" /> Ampliar
              </span>
            </button>
          ) : (
            <InkImagePlaceholder name={name} />
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Ver imagen ${index + 1} de ${name}`}
                aria-pressed={selectedIndex === index}
                className={cn(
                  "overflow-hidden rounded-xl border bg-[#111412] p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8f36b]",
                  selectedIndex === index
                    ? "border-[#b8f36b]"
                    : "border-white/10 hover:border-[#b8f36b]/60",
                )}
              >
                <img src={image.src} alt={image.alt} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {isLightboxOpen && selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visor de imágenes de ${name}`}
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
        >
          <div
            className="relative flex h-[90vh] w-[90vw] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={selectedImage.src} alt={selectedImage.alt} className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Cerrar imagen ampliada"
            >
              <X className="h-5 w-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  className="absolute left-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Ver imagen anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-0 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Ver imagen siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
