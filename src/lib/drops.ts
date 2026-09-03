import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { drops } from "@/db/schema";
import type { Drop } from "@/types/drop";

type DropRow = typeof drops.$inferSelect;

function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDrop(row: DropRow): Drop {
  return {
    slug: row.slug,
    name: row.name,
    title: row.title,
    description: row.description,
    banner: row.banner,
    image: row.image,
    theme: row.theme,
    live: row.live,
    releaseDate: toDateOnly(row.releaseDate),
  };
}

/** The persistent runtime source for the ordered Drop navigation and pages. */
export async function getDrops(): Promise<Drop[]> {
  const rows = await db.select().from(drops).orderBy(asc(drops.id));
  return rows.map(toDrop);
}

/** Public runtime source: hidden Drops must not be exposed to visitors. */
export async function getLiveDrops(): Promise<Drop[]> {
  const rows = await db
    .select()
    .from(drops)
    .where(eq(drops.live, true))
    .orderBy(asc(drops.id));
  return rows.map(toDrop);
}

export async function getDropBySlug(slug: string): Promise<Drop | null> {
  const rows = await db
    .select()
    .from(drops)
    .where(eq(drops.slug, slug))
    .limit(1);

  return rows[0] ? toDrop(rows[0]) : null;
}
