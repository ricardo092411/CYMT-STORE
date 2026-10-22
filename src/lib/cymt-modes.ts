export type CymtMode = "camisas" | "maquinas" | "confeccion" | "descargas";

export type CymtSection = "camisas" | "maquinas" | "tintas" | "confeccion" | "descargas";

type CymtModeConfig = {
  allowedSections: readonly CymtSection[];
  entryPath: string;
};

export const CYMT_MODE_CONFIG: Record<CymtMode, CymtModeConfig> = {
  camisas: {
    allowedSections: ["camisas", "tintas"],
    entryPath: "/camisas",
  },
  maquinas: {
    allowedSections: ["maquinas", "tintas"],
    entryPath: "/maquinas",
  },
  confeccion: {
    allowedSections: ["confeccion", "maquinas"],
    entryPath: "/confeccion",
  },
  descargas: {
    allowedSections: ["descargas"],
    entryPath: "/descargas",
  },
};

export const CYMT_SECTION_CONFIG: Record<CymtSection, { label: string; path: string }> = {
  camisas: { label: "Camisas", path: "/camisas" },
  maquinas: { label: "Máquinas", path: "/maquinas" },
  tintas: { label: "Tintas", path: "/tintas" },
  confeccion: { label: "Confección", path: "/confeccion" },
  descargas: { label: "Descargas", path: "/descargas" },
};

export function getModeFromPathname(pathname: string): CymtMode | null {
  return (Object.keys(CYMT_MODE_CONFIG) as CymtMode[]).find(
    (mode) => pathname === CYMT_MODE_CONFIG[mode].entryPath,
  ) ?? null;
}

export function getAllowedSections(mode: CymtMode): readonly CymtSection[] {
  return CYMT_MODE_CONFIG[mode].allowedSections;
}

export function isSectionAllowed(mode: CymtMode, section: CymtSection): boolean {
  return getAllowedSections(mode).includes(section);
}

export function getModeEntryPath(mode: CymtMode): string {
  return CYMT_MODE_CONFIG[mode].entryPath;
}
