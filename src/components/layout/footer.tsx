"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { site } from "@/data/site";
import { socialItems } from "@/components/icons/social-icons";
import { useStore } from "@/providers/store-provider";
import { useEditor } from "@/providers/editor-provider";
import { useDrops } from "@/providers/drops-provider";

export function Footer() {
  const { setClubOpen } = useStore();
  const { logoSrc } = useEditor();
  const drops = useDrops();
  const liveDrops = drops.filter((drop) => drop.live);

  return (
    <footer className="relative mt-24 border-t border-line bg-bg-soft">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={site.logo.alt} className="h-8 w-auto" />
            ) : (
              <Image
                src={site.logo.src}
                alt={site.logo.alt}
                width={site.logo.width}
                height={42}
                className="h-8 w-auto"
              />
            )}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              {site.tagline}. Diseñado y producido bajo pedido en {site.city}, {site.country}.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {socialItems.map(({ key, label, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Tienda / Drops */}
          <FooterCol title="Tienda">
            <Link href="/tienda" className="footer-link">Ver todo</Link>
            {liveDrops.slice(0, 5).map((d) => (
              <Link key={d.slug} href={`/drop/${d.slug}`} className="footer-link">
                {d.name}
              </Link>
            ))}
          </FooterCol>

          {/* Ayuda */}
          <FooterCol title="Ayuda">
            <a href={site.social.whatsapp} target="_blank" rel="noopener noreferrer" className="footer-link">
              Contacto WhatsApp
            </a>
            <Link href="/tienda" className="footer-link">Guía de tallas</Link>
            <span className="footer-link cursor-default">Envíos a todo El Salvador</span>
            <span className="footer-link cursor-default">Entregas En 48 Horas</span>
          </FooterCol>

          {/* Marca */}
          <FooterCol title="Marca">
            <button onClick={() => setClubOpen(true)} className="footer-link text-left">
              Club CYMT
            </button>
            <Link href="/cuenta" className="footer-link">Mi cuenta</Link>
            <Link href="/favoritos" className="footer-link">Favoritos</Link>
            <Link href="/admin" className="footer-link">Admin</Link>
          </FooterCol>
        </div>

        {/* Club band */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-surface px-6 py-5 md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-brand" /> Únete al Club CYMT
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Acceso anticipado a drops exclusivos y promociones. Sin spam.
            </p>
          </div>
          <button
            onClick={() => setClubOpen(true)}
            className="shrink-0 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-bright"
          >
            Quiero unirme
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-ink-faint sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} {site.legalName} · {site.city}, {site.country} · Todos los derechos reservados.</p>
          <p className="uppercase tracking-[0.16em]">Producción Alta Calidad</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">{title}</h3>
      <div className="flex flex-col gap-2.5 text-sm text-ink-muted [&_.footer-link]:text-ink-soft [&_.footer-link]:transition-colors [&_.footer-link:hover]:text-ink">
        {children}
      </div>
    </div>
  );
}
