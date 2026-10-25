export type AdminModuleId = "camisas" | "maquinas" | "tintas" | "confeccion" | "descargas";

export type AdminModuleDefinition = {
  id: AdminModuleId;
  title: string;
  navigationLabel: string;
  description: string;
  href: string;
  status: "active" | "planned";
  futureAreas: readonly string[];
};

/** Shared source of truth for the central CMS navigation and module cards. */
export const ADMIN_MODULES: readonly AdminModuleDefinition[] = [
  {
    id: "camisas",
    title: "Camisas",
    navigationLabel: "Camisas",
    description: "Productos, variantes, imágenes, drops y contenido del storefront.",
    href: "/admin/camisas",
    status: "active",
    futureAreas: ["Catálogo", "Drops", "Hero", "Contenido"],
  },
  {
    id: "maquinas",
    title: "Máquinas",
    navigationLabel: "Máquinas",
    description: "Catálogo de maquinaria, categorías, imágenes y contenido técnico.",
    href: "/admin/maquinas",
    status: "planned",
    futureAreas: ["Contenido", "Categorías", "Productos", "Imágenes", "Información técnica"],
  },
  {
    id: "tintas",
    title: "CMT Ink",
    navigationLabel: "Tintas",
    description: "Productos Glow, presentaciones, imágenes e información técnica.",
    href: "/admin/tintas",
    status: "planned",
    futureAreas: ["Contenido", "Categorías", "Productos", "Imágenes", "Información técnica"],
  },
  {
    id: "confeccion",
    title: "Confección",
    navigationLabel: "Confección",
    description: "Categorías, líneas de producto, imágenes y contenido textil.",
    href: "/admin/confeccion",
    status: "planned",
    futureAreas: ["Contenido", "Categorías", "Líneas de producto", "Imágenes"],
  },
  {
    id: "descargas",
    title: "Descargas",
    navigationLabel: "Descargas",
    description: "Productos digitales, categorías, previews, precios y archivos.",
    href: "/admin/descargas",
    status: "planned",
    futureAreas: ["Contenido", "Categorías", "Productos digitales", "Previews", "Archivos"],
  },
] as const;

export function getAdminModule(id: string): AdminModuleDefinition | undefined {
  return ADMIN_MODULES.find((module) => module.id === id);
}

export function isAdminModuleId(id: string): id is AdminModuleId {
  return getAdminModule(id) !== undefined;
}
