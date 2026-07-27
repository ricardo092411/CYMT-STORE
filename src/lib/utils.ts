import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely (resolves conflicts, supports conditionals).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a USD amount for El Salvador locale (es-SV).
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert any string into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Build a stable cart line key from product + chosen variant.
 */
export function cartKey(productId: string, color: string, size: string): string {
  return `${productId}::${color}::${size}`;
}

/**
 * Clamp helper.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Cart line images must be paths servible by next/image.
 * Data/blob URLs (imágenes locales del Modo Editor) no son compatibles con
 * next/image en el carrito, así que caen al tile de marca existente.
 */
export function safeCartImage(src: string | undefined): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return "";
  return src;
}
