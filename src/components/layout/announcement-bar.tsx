"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/data/site";

/** Thin rotating top bar with brand announcements. */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((p) => (p + 1) % site.announcements.length),
      4600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-[60] overflow-hidden border-b border-line bg-black">
      <div className="container-x flex h-9 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-center text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ink-soft"
          >
            {site.announcements[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
