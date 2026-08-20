/**
 * CYMT STORE — CATALOG (Single source of truth)
 * ==================================================================
 *
 *  ADDING PRODUCTS IS TRIVIAL:
 *  1. Copy a product object below.
 *  2. Edit its fields (name, price, drop, sizes, colors, images...).
 *  3. Drop the mockup images in /public/images/products/ and reference them.
 *
 *  No database, no migration, no rebuild of other components required.
 *  The same model works for tees, hoodies, caps, stickers, mugs, posters…
 *
 *  STATUS VALUES: "nuevo" | "oferta" | "limitada" | "agotado"
 */

export type ProductStatus = "nuevo" | "oferta" | "limitada" | "agotado";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariantImage {
  id: number;
  productVariantId: number;
  storageKey: string | null;
  legacyUrl: string | null;
  originalFilename: string;
  originalSourcePath: string | null;
  position: number;
  isCover: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  colorName: string | null;
  colorHex: string | null;
  colorStatus: string;
  position: number;
  isDefault: boolean;
  createdAt: string;
  images: ProductVariantImage[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Category/type — not a traditional category, just a label (Camiseta, Hoodie…). */
  type: string;
  price: number;
  /** Original price when on sale (status "oferta"). */
  compareAtPrice?: number;
  description: string;
  details?: string[];
  dropSlug: string;
  sizes: string[];
  colors: ProductColor[];
  /** Present for architecture; not enforced in checkout yet. */
  stock: number;
  /** Local image paths under /public. Empty array → elegant branded tile. */
  images: string[];
  /** Persisted relational variants received from the product API. */
  productVariants?: ProductVariant[];
  /**
   * Variantes por mockup (array paralelo a `images`).
   * Cada mockup puede tener su propia variante editable (ej: "Negro", "Rojo").
   * El editor permite gestionarlas por mockup; el cliente selecciona al hacer clic.
   */
  variants?: string[];
  status: ProductStatus;
  featured?: boolean;
  bestSeller?: boolean;
  tags?: string[];
  /** ISO date — used to compute "new arrivals". */
  createdAt: string;
}

export type { Drop, DropTheme } from "@/types/drop";

/* ------------------------- Shared palette ------------------------- */

export const COLORS = {
  onyx: { name: "Onyx", hex: "#0c0c0f" },
  black: { name: "Negro", hex: "#0a0a0a" },
  white: { name: "Blanco", hex: "#eef0f2" },
  ash: { name: "Gris", hex: "#9a9aa2" },
  graphite: { name: "Grafito", hex: "#3b3b42" },
  sand: { name: "Arena", hex: "#cdb79a" },
  crimson: { name: "Carmesí", hex: "#e50914" },
} satisfies Record<string, ProductColor>;

const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];
const ONE_SIZE = ["Única"];

/* ---------------------------- PRODUCTS ---------------------------- */

export const products: Product[] = [
  /* --------------------------- DROP 001 --------------------------- */
  {
    id: "p-001-essential-tee",
    slug: "essential-tee-onyx",
    name: "Essential Tee — Onyx",
    type: "Camiseta",
    price: 25,
    description:
      "La camiseta fundamental de CYMT. Algodón pesado 240g, corte oversized y caída perfecta. El lienzo base de tu identidad.",
    details: [
      "Algodón peinado 240 g/m²",
      "Corte oversized holgado",
      "Cuello canalé reforzado",
      "Estampado serigráfico de alta densidad",
    ],
    dropSlug: "drop-001",
    sizes: APPAREL_SIZES,
    colors: [COLORS.onyx, COLORS.white],
    stock: 120,
    images: ["/images/products/product-tee-black.jpg"],
    status: "nuevo",
    featured: true,
    bestSeller: true,
    tags: ["básico", "oversized"],
    createdAt: "2026-01-10",
  },
  {
    id: "p-002-heavy-hoodie",
    slug: "heavy-hoodie-onyx",
    name: "Heavy Hoodie — Onyx",
    type: "Hoodie",
    price: 55,
    description:
      "Hoodie pesada de 400g con interior afelpado. Cuello alto, capucha doble y una presencia que se siente.",
    details: [
      "French terry 400 g/m²",
      "Interior afelpado premium",
      "Capucha forrada con cordón",
      "Bolsillo canguro reforzado",
    ],
    dropSlug: "drop-001",
    sizes: APPAREL_SIZES,
    colors: [COLORS.onyx, COLORS.graphite],
    stock: 60,
    images: ["/images/products/product-hoodie-black.jpg"],
    status: "nuevo",
    featured: true,
    bestSeller: true,
    tags: ["heavyweight"],
    createdAt: "2026-01-10",
  },

  /* --------------------------- DROP 002 --------------------------- */
  {
    id: "p-003-signature-cap",
    slug: "signature-cap-onyx",
    name: "Signature Cap — Onyx",
    type: "Gorra",
    price: 30,
    description:
      "Snapback estructurada de 6 paneles con bordado CYMT tono sobre tono. El toque final de cada fit.",
    details: [
      "Algodón chino estructurado",
      "Visera curva precurvada",
      "Cierre snapback ajustable",
      "Bordado tonal CYMT",
    ],
    dropSlug: "drop-002",
    sizes: ["S/M", "L/XL"],
    colors: [COLORS.onyx, COLORS.white, COLORS.crimson],
    stock: 80,
    images: ["/images/products/product-cap-black.jpg"],
    status: "nuevo",
    bestSeller: true,
    tags: ["accesorio"],
    createdAt: "2026-05-02",
  },
  {
    id: "p-004-minimal-tee",
    slug: "minimal-tee-bone",
    name: "Minimal Tee — Bone",
    type: "Camiseta",
    price: 25,
    description:
      "Versión minimalista en blanco roto. Mismo cuerpo esencial, una vibra más limpia y luminosa.",
    details: [
      "Algodón peinado 240 g/m²",
      "Blanco roto (bone)",
      "Corte regular oversize",
      "Etiqueta tejida sin picadura",
    ],
    dropSlug: "drop-002",
    sizes: APPAREL_SIZES,
    colors: [COLORS.white, COLORS.sand],
    stock: 90,
    images: [],
    status: "nuevo",
    createdAt: "2026-05-02",
  },

  /* --------------------------- DROP ROCK -------------------------- */
  {
    id: "p-005-riot-tee",
    slug: "riot-tee",
    name: "Riot Tee",
    type: "Camiseta",
    price: 28,
    description:
      "Distorsión, feedback y actitud. Gráfica de backstage con tinta descargada sobre onyx.",
    details: ["Algodón 230 g/m²", "Gráfica serigráfica a una tinta", "Corte oversized"],
    dropSlug: "drop-rock",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.crimson],
    stock: 50,
    images: [],
    status: "limitada",
    tags: ["gráfica"],
    createdAt: "2026-03-07",
  },
  {
    id: "p-006-amp-hoodie",
    slug: "amp-hoodie",
    name: "Amp Hoodie",
    type: "Hoodie",
    price: 60,
    description:
      "Hoodie con gráfica de amplificador vintage en la espalda. Pesada, cruda y lista para el escenario.",
    details: ["French terry 400 g/m²", "Serigrafía espalda y pecho", "Interior afelpado"],
    dropSlug: "drop-rock",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.graphite],
    stock: 40,
    images: [],
    status: "nuevo",
    createdAt: "2026-03-07",
  },
  {
    id: "p-007-backstage-cap",
    slug: "backstage-cap",
    name: "Backstage Cap",
    type: "Gorra",
    price: 32,
    description: "Gorra con parche bordado 'All Access'. Pase vip para tu día a día.",
    details: ["Algodón estructurado", "Parche bordado", "Snapback"],
    dropSlug: "drop-rock",
    sizes: ["S/M", "L/XL"],
    colors: [COLORS.black, COLORS.crimson],
    stock: 55,
    images: [],
    status: "nuevo",
    createdAt: "2026-03-07",
  },

  /* -------------------------- DROP ANIME ------------------------- */
  {
    id: "p-008-ronin-tee",
    slug: "ronin-tee",
    name: "Ronin Tee",
    type: "Camiseta",
    price: 28,
    description:
      "Samurái sin amo bajo la lluvia neón. Ilustración completa a color sobre algodón premium.",
    details: ["Algodón 230 g/m²", "Impresión DTG full color", "Corte oversized"],
    dropSlug: "drop-anime",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.crimson, COLORS.white],
    stock: 45,
    images: [],
    status: "limitada",
    featured: true,
    tags: ["ilustración"],
    createdAt: "2026-04-18",
  },
  {
    id: "p-009-mecha-hoodie",
    slug: "mecha-hoodie",
    name: "Mecha Hoodie",
    type: "Hoodie",
    price: 62,
    description:
      "Inspirado en los mechas de los 90. Gráfica técnica, paneles y energía cyberpunk.",
    details: ["French terry 400 g/m²", "DTG + serigrafía combinada", "Interior afelpado"],
    dropSlug: "drop-anime",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.crimson],
    stock: 35,
    images: [],
    status: "nuevo",
    bestSeller: true,
    createdAt: "2026-04-18",
  },
  {
    id: "p-010-otaku-stickers",
    slug: "otaku-sticker-pack",
    name: "Otaku Sticker Pack",
    type: "Stickers",
    price: 8,
    description:
      "Pack de 6 stickers vinílicos resistentes al agua con iconografía anime. Para laptop, termo o notebook.",
    details: ["6 stickers", "Vinilo resistente al agua", "Corte de precisión"],
    dropSlug: "drop-anime",
    sizes: ONE_SIZE,
    colors: [COLORS.crimson],
    stock: 200,
    images: [],
    status: "nuevo",
    createdAt: "2026-04-18",
  },
  {
    id: "p-011-kanji-poster",
    slug: "kanji-poster",
    name: "Kanji Poster A3",
    type: "Póster",
    price: 18,
    description:
      "Póster coleccionable A3 con tipografía kanji y composición neón. Impresión mate de grano fino.",
    details: ["A3 (297×420 mm)", "Papel mate 250 g", "Tinta archival"],
    dropSlug: "drop-anime",
    sizes: ONE_SIZE,
    colors: [COLORS.black],
    stock: 150,
    images: [],
    status: "nuevo",
    createdAt: "2026-04-18",
  },

  /* -------------------------- DROP NATURE ------------------------ */
  {
    id: "p-012-wilderness-tee",
    slug: "wilderness-tee",
    name: "Wilderness Tee",
    type: "Camiseta",
    price: 27,
    description:
      "Bosque denso en serigrafía tonal. La calma de lo salvaje sobre onyx.",
    details: ["Algodón 230 g/m²", "Serigrafía tonal", "Corte oversized"],
    dropSlug: "drop-nature",
    sizes: APPAREL_SIZES,
    colors: [COLORS.graphite, COLORS.onyx],
    stock: 60,
    images: [],
    status: "nuevo",
    createdAt: "2026-02-14",
  },
  {
    id: "p-013-forest-hoodie",
    slug: "forest-hoodie",
    name: "Forest Hoodie",
    type: "Hoodie",
    price: 58,
    description:
      "Hoodie en tonos tierra con gráfica de niebla y árboles. Abrigo con alma.",
    details: ["French terry 400 g/m²", "Serigrafía pecho y espalda", "Interior afelpado"],
    dropSlug: "drop-nature",
    sizes: APPAREL_SIZES,
    colors: [COLORS.graphite, COLORS.sand],
    stock: 45,
    images: [],
    status: "nuevo",
    createdAt: "2026-02-14",
  },
  {
    id: "p-014-trail-cap",
    slug: "trail-cap",
    name: "Trail Cap",
    type: "Gorra",
    price: 30,
    description: "Dad hat en tono arena con bordado de cordillera minimalista.",
    details: ["Algodón lavado", "Bordero cordillera", "Cierre metálico"],
    dropSlug: "drop-nature",
    sizes: ["S/M", "L/XL"],
    colors: [COLORS.sand, COLORS.graphite],
    stock: 70,
    images: [],
    status: "nuevo",
    createdAt: "2026-02-14",
  },
  {
    id: "p-015-earth-mug",
    slug: "earth-mug",
    name: "Earth Mug",
    type: "Taza",
    price: 16,
    description:
      "Taza cerámica de 350 ml con esmalte mate y logo CYMT. Para tu café de cada mañana.",
    details: ["Cerámica 350 ml", "Esmalte mate", "Apto lavavajillas y microondas"],
    dropSlug: "drop-nature",
    sizes: ONE_SIZE,
    colors: [COLORS.sand, COLORS.graphite],
    stock: 120,
    images: [],
    status: "nuevo",
    createdAt: "2026-02-14",
  },

  /* -------------------------- DROP RETRO ------------------------- */
  {
    id: "p-016-arcade-tee",
    slug: "arcade-tee",
    name: "Arcade Tee",
    type: "Camiseta",
    price: 28,
    description:
      "Insert coin. Gráfica arcade de 8 bits y neón synthwave sobre onyx.",
    details: ["Algodón 230 g/m²", "DTG full color", "Corte oversized"],
    dropSlug: "drop-retro",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.crimson],
    stock: 55,
    images: [],
    status: "nuevo",
    featured: true,
    tags: ["ilustración"],
    createdAt: "2026-04-18",
  },
  {
    id: "p-017-synthwave-hoodie",
    slug: "synthwave-hoodie",
    name: "Synthwave Hoodie",
    type: "Hoodie",
    price: 60,
    compareAtPrice: 70,
    description:
      "Grid neón infinito en la espalda. Hoodie pesada con descuento de lanzamiento.",
    details: ["French terry 400 g/m²", "DTG espalda full color", "Interior afelpado"],
    dropSlug: "drop-retro",
    sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.crimson],
    stock: 38,
    images: [],
    status: "oferta",
    createdAt: "2026-04-18",
  },
  {
    id: "p-018-retro-stickers",
    slug: "retro-sticker-pack",
    name: "Retro Sticker Pack",
    type: "Stickers",
    price: 8,
    description:
      "6 stickers con iconografía retro gaming y neón. Resistentes al agua.",
    details: ["6 stickers", "Vinilo resistente al agua", "Corte de precisión"],
    dropSlug: "drop-retro",
    sizes: ONE_SIZE,
    colors: [COLORS.crimson],
    stock: 200,
    images: [],
    status: "nuevo",
    createdAt: "2026-04-18",
  },
  {
    id: "p-019-glitch-poster",
    slug: "glitch-poster",
    name: "Glitch Poster A3",
    type: "Póster",
    price: 18,
    description:
      "Póster A3 con efecto glitch y malla synthwave. Pieza de colección retrofuturista.",
    details: ["A3 (297×420 mm)", "Papel mate 250 g", "Tinta archival"],
    dropSlug: "drop-retro",
    sizes: ONE_SIZE,
    colors: [COLORS.black],
    stock: 150,
    images: [],
    status: "nuevo",
    createdAt: "2026-04-18",
  },
];

/* --------------------------- Selectors ---------------------------- */

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const featuredProducts: Product[] = products.filter((p) => p.featured);

export const bestSellers: Product[] = products.filter((p) => p.bestSeller);

/** Most recently created products first. */
export const newArrivals: Product[] = [...products]
  .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  .slice(0, 8);

/** Every distinct color used in the catalog (for filters). */
export const allColors: ProductColor[] = Array.from(
  new Map(products.flatMap((p) => p.colors).map((c) => [c.name, c])).values(),
);

/** Every distinct size used in the catalog (for filters). */
export const allSizes: string[] = Array.from(
  new Set(products.flatMap((p) => p.sizes)),
);

/** Distinct product types (Camiseta, Hoodie, …). */
export const allTypes: string[] = Array.from(new Set(products.map((p) => p.type)));

export const statusLabels: Record<ProductStatus, string> = {
  nuevo: "Nuevo",
  oferta: "Oferta",
  limitada: "Edición Limitada",
  agotado: "Agotado",
};
