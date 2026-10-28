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
    status: "active",
    futureAreas: ["Contenido", "Categorías", "Productos", "Imágenes", "Información técnica"],
  },
  {
    id: "tintas",
    title: "CMT Ink",
    navigationLabel: "Tintas",
    description: "Productos Glow, presentaciones, imágenes e información técnica.",
    href: "/admin/tintas",
    status: "active",
    futureAreas: ["Productos Glow", "Imágenes", "Información técnica"],
  },
  {
    id: "confeccion",
    title: "Confección",
    navigationLabel: "Confección",
    description: "Catálogo textil, categorías, productos, especificaciones e imágenes.",
    href: "/admin/confeccion",
    status: "active",
    futureAreas: ["Categorías", "Productos", "Especificaciones", "Imágenes"],
  },
  {
    id: "descargas",
    title: "Descargas",
    navigationLabel: "Descargas",
    description: "Marketplace digital, archivos privados, pagos y acceso autorizado.",
    href: "/admin/descargas",
    status: "active",
    futureAreas: ["Categorías", "Productos digitales", "Previews", "Archivos privados", "Órdenes"],
  },
] as const;

export function getAdminModule(id: string): AdminModuleDefinition | undefined {
  return ADMIN_MODULES.find((module) => module.id === id);
}

export function isAdminModuleId(id: string): id is AdminModuleId {
  return getAdminModule(id) !== undefined;
}
