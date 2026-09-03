"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Heart, User, ShoppingBag, Menu, X, ChevronDown, Sparkles, Pencil } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { useEditor } from "@/providers/editor-provider";
import { site } from "@/data/site";
import { useDrops } from "@/providers/drops-provider";
import { socialItems } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function BrandLogo({
  src,
  className,
  priority = false,
}: {
  src: string | null;
  className: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={site.logo.alt} className={className} />
    );
  }
  return (
    <Image
      src={site.logo.src}
      alt={site.logo.alt}
      width={site.logo.width}
      height={42}
      priority={priority}
      className={className}
    />
  );
}

export function Header() {
  const { cartCount, favorites, hydrated, setCartOpen, setSearchOpen, setClubOpen, menuOpen, setMenuOpen } =
    useStore();
  const { enabled: editorEnabled, logoSrc, updateLogo } = useEditor();
  const drops = useDrops();
  const liveDrops = drops.filter((drop) => drop.live);
  const [scrolled, setScrolled] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  function handleLogoChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, setMenuOpen]);

  const navLinkClass =
    "text-sm font-medium text-ink-soft transition-colors hover:text-ink link-underline";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[55] border-b transition-all duration-300",
          scrolled ? "glass border-line" : "border-transparent bg-bg/0",
        )}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* Left: mobile menu + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative flex items-center">
              <Link href="/" aria-label={site.name} className="flex items-center">
                <BrandLogo src={logoSrc} priority className="h-7 w-auto md:h-8" />
              </Link>
              {editorEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    aria-label="Editar logo"
                    title="Editar logo"
                    className="absolute -right-9 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-ink-muted transition hover:border-line-strong hover:text-brand"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      handleLogoChange(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/tienda" className={navLinkClass}>
              Tienda
            </Link>

            {/* Drops dropdown */}
            <div className="group/drops relative">
              <button className={cn(navLinkClass, "inline-flex items-center gap-1")}>
                Drops
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover/drops:rotate-180" />
              </button>
              <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-300 group-hover/drops:visible group-hover/drops:translate-y-0 group-hover/drops:opacity-100">
                <div className="overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-2xl">
                  {liveDrops.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/drop/${d.slug}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-surface-2"
                    >
                      <span className="text-sm font-medium text-ink">{d.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-wider text-ink-faint">
                        {d.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/favoritos" className={navLinkClass}>
              Producción De Alta Calidad
            </Link>
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
              className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              href="/favoritos"
              aria-label="Favoritos"
              className="relative hidden h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 sm:grid"
            >
              <Heart className="h-5 w-5" />
              {hydrated && favorites.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/cuenta"
              aria-label="Cuenta"
              className="hidden h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 sm:grid"
            >
              <User className="h-5 w-5" />
            </Link>

            <button
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
              className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2"
            >
              <ShoppingBag className="h-5 w-5" />
              {hydrated && cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setClubOpen(true)}
              className="ml-1 hidden items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_28px_-12px_rgba(229,9,20,0.8)] transition hover:bg-brand-bright md:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Únete al Club
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-bg-soft"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <BrandLogo src={logoSrc} className="h-7 w-auto" />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6">
                <Link href="/tienda" className="block py-3 font-display text-2xl font-bold text-ink">
                  Tienda
                </Link>
                <p className="mt-4 mb-1 text-xs uppercase tracking-[0.2em] text-ink-faint">Drops</p>
                <div className="flex flex-col">
                  {liveDrops.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/drop/${d.slug}`}
                      className="flex items-center justify-between border-b border-line py-3"
                    >
                      <span className="font-medium text-ink">{d.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-wider text-ink-faint">
                        {d.title}
                      </span>
                    </Link>
                  ))}
                </div>

                <Link href="/favoritos" className="mt-4 block py-3 font-display text-xl font-bold text-ink">
                  Favoritos
                </Link>
                <Link href="/cuenta" className="block py-3 font-display text-xl font-bold text-ink">
                  Mi cuenta
                </Link>
              </div>

              <div className="border-t border-line px-5 py-5">
                <button
                  onClick={() => setClubOpen(true)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-bright"
                >
                  <Sparkles className="h-4 w-4" /> Únete al Club CYMT
                </button>
                <div className="flex items-center justify-center gap-3">
                  {socialItems.map(({ key, label, href, Icon }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:border-line-strong hover:text-ink"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
