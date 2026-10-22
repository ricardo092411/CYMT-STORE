export type CymtMode = "camisas" | "maquinas" | "confeccion" | "descargas";

export type CymtSection = "camisas" | "maquinas" | "tintas" | "confeccion" | "descargas";

type CymtModeConfig = {
  entryPath: string;
  navigation: readonly {
    section: CymtSection;
    href: string;
  }[];
};

export const CYMT_MODE_CONFIG: Record<CymtMode, CymtModeConfig> = {
  camisas: {
    entryPath: "/camisas",
    navigation: [
      { section: "camisas", href: "/camisas" },
      { section: "tintas", href: "/camisas/tintas" },
    ],
  },
  maquinas: {
    entryPath: "/maquinas",
    navigation: [
      { section: "maquinas", href: "/maquinas" },
      { section: "tintas", href: "/maquinas/tintas" },
    ],
  },
  confeccion: {
    entryPath: "/confeccion",
    navigation: [
      { section: "confeccion", href: "/confeccion" },
      { section: "maquinas", href: "/confeccion/maquinas" },
    ],
  },
  descargas: {
    entryPath: "/descargas",
    navigation: [{ section: "descargas", href: "/descargas" }],
  },
};

export const CYMT_SECTION_CONFIG: Record<
  CymtSection,
  { label: string; title: string; description: string; futureCategories?: readonly string[] }
> = {
  camisas: {
    label: "Camisas",
    title: "Camisas CYMT",
    description: "Streetwear, anime, cultura pop y diseños exclusivos de CYMT Store.",
  },
  maquinas: {
    label: "Máquinas",
    title: "Máquinas Serigráficas",
    description: "Equipos para producción serigráfica fabricados y respaldados por CYMT.",
  },
  tintas: {
    label: "Tintas",
    title: "CMT Ink",
    description: "Tintas y soluciones para producción serigráfica.",
  },
  confeccion: {
    label: "Confección",
    title: "Confección de Prendas",
    description: "Producción y confección de prendas personalizadas para negocios, marcas y proyectos.",
  },
  descargas: {
    label: "Descargas",
    title: "Descargas Digitales",
    description: "Archivos profesionales para producción gráfica, serigrafía y DTF.",
    futureCategories: ["Separaciones", "Semitonos", "Packs DTF", "Editables", "Mockups"],
  },
};

export function getModeFromPathname(pathname: string): CymtMode | null {
  return (Object.keys(CYMT_MODE_CONFIG) as CymtMode[]).find(
    (mode) =>
      pathname === CYMT_MODE_CONFIG[mode].entryPath ||
      pathname.startsWith(`${CYMT_MODE_CONFIG[mode].entryPath}/`),
  ) ?? null;
}

export function getAllowedSections(mode: CymtMode): readonly CymtSection[] {
  return CYMT_MODE_CONFIG[mode].navigation.map(({ section }) => section);
}

export function isSectionAllowed(mode: CymtMode, section: CymtSection): boolean {
  return getAllowedSections(mode).includes(section);
}

export function getModeEntryPath(mode: CymtMode): string {
  return CYMT_MODE_CONFIG[mode].entryPath;
}

export function getSectionHref(mode: CymtMode, section: CymtSection): string {
  return (
    CYMT_MODE_CONFIG[mode].navigation.find((item) => item.section === section)?.href ??
    getModeEntryPath(mode)
  );
}
