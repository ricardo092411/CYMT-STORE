"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { socialItems } from "@/components/icons/social-icons";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Floating contact button (bottom-right). Expands to reveal the official
 * social channels, each opening in a new tab.
 */
export function FloatingSocial() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[65] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open &&
          socialItems.map(({ key, label, href, Icon }, i) => (
            <motion.a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 10 }}
              transition={{ duration: 0.25, ease: EASE, delay: open ? i * 0.05 : 0 }}
              className="group flex items-center gap-2"
            >
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-soft opacity-0 transition-opacity group-hover:opacity-100">
                {label}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg transition hover:border-brand hover:text-brand">
                <Icon className="h-5 w-5" />
              </span>
            </motion.a>
          ))}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar redes sociales" : "Abrir redes sociales"}
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-[0_12px_34px_-8px_rgba(229,9,20,0.8)] transition hover:bg-brand-bright hover:scale-105"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
