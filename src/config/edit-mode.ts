/**
 * CYMT STORE — MODO EDITOR
 * ------------------------------------------------------------------
 * Interruptor de compatibilidad del modo administración.
 *
 *   EDIT_MODE = true   → permite que EditorProvider habilite controles
 *                        únicamente bajo /admin.
 *
 *   EDIT_MODE = false  → la tienda se ve EXACTAMENTE igual que siempre.
 *                        Cero botones extra, cero herramientas, cero cambios.
 *
 * La visibilidad real siempre depende de `enabled` en EditorProvider;
 * este valor por sí solo nunca expone controles en el storefront público.
 */
export const EDIT_MODE = true;
