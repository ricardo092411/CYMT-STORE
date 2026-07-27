"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Elegant scroll-reveal wrapper used across marketing sections.
 * Animates opacity + translate once when scrolled into view.
 */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
