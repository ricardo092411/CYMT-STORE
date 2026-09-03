import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { homeHero } from "@/db/schema";
import type { HomeHero, HomeHeroContent, HomeHeroSource } from "@/types/home-hero";

const HOME_HERO_ID = 1;

/** Exact current Home Hero values used until the singleton table is bootstrapped. */
export const DEFAULT_HOME_HERO: HomeHero = {
  badge: "El Salvador · Entregas en 48 Horas",
  titlePrefix: "Tu Personalidad Merece",
  titleHighlight: "Diseños Exclusivos.",
  description:
    "CYMT STORE — streetwear premium diseñado en El Salvador. Drops exclusivos de Anime, Rock, Naturaleza, Retro y Mas. Entregas En 48 Horas.",
  primaryLabel: "Explorar Drops",
  primaryHref: "/tienda",
  secondaryLabel: "Únete al Club",
  imageUrl: null,
  imageAlt: "CYMT STORE — streetwear premium",
};

export type HomeHeroRead = {
  hero: HomeHero;
  source: HomeHeroSource;
};

export class HomeHeroTableUnavailableError extends Error {
  constructor() {
    super("Home Hero table is not available");
  }
}

function isUndefinedTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  );
}

function toHomeHero(row: typeof homeHero.$inferSelect): HomeHero {
  return {
    badge: row.badge,
    titlePrefix: row.titlePrefix,
    titleHighlight: row.titleHighlight,
    description: row.description,
    primaryLabel: row.primaryLabel,
    primaryHref: row.primaryHref,
    secondaryLabel: row.secondaryLabel,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
  };
}

function defaultHomeHeroRow() {
  return {
    id: HOME_HERO_ID,
    ...DEFAULT_HOME_HERO,
    updatedAt: new Date(),
  };
}

/**
 * Reads the singleton without requiring the bootstrap SQL to have run.
 * A missing row and a missing table both preserve the existing public Hero.
 */
export async function getHomeHeroRead(): Promise<HomeHeroRead> {
  try {
    const rows = await db
      .select()
      .from(homeHero)
      .where(eq(homeHero.id, HOME_HERO_ID))
      .limit(1);
    const row = rows[0];

    return row
      ? { hero: toHomeHero(row), source: "database" }
      : { hero: DEFAULT_HOME_HERO, source: "row-missing" };
  } catch (error) {
    if (isUndefinedTable(error)) {
      console.warn("[home-hero] table unavailable; using defaults");
      return { hero: DEFAULT_HOME_HERO, source: "table-unavailable" };
    }
    throw error;
  }
}

/** Public server read used by the Home page. */
export async function getHomeHero(): Promise<HomeHero> {
  return (await getHomeHeroRead()).hero;
}

type HomeHeroUpdate = Partial<HomeHeroContent> & { imageUrl?: string | null };

async function updateHomeHeroSingleton(values: HomeHeroUpdate): Promise<HomeHero> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: homeHero.id })
        .from(homeHero)
        .where(eq(homeHero.id, HOME_HERO_ID))
        .limit(1);

      if (!existing[0]) {
        await tx.insert(homeHero).values(defaultHomeHeroRow());
      }

      const [updated] = await tx
        .update(homeHero)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(homeHero.id, HOME_HERO_ID))
        .returning();
      if (!updated) throw new Error("Home Hero singleton was not updated");

      return toHomeHero(updated);
    });
  } catch (error) {
    if (isUndefinedTable(error)) throw new HomeHeroTableUnavailableError();
    throw error;
  }
}

/** Updates only textual Home Hero fields. */
export async function updateHomeHeroContent(values: HomeHeroContent): Promise<HomeHero> {
  return updateHomeHeroSingleton(values);
}

/** Updates the stored image URL after a verified administrative upload. */
export async function updateHomeHeroImage(imageUrl: string): Promise<HomeHero> {
  return updateHomeHeroSingleton({ imageUrl });
}
