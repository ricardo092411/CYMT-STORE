import "server-only";

import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { drops, products } from "@/db/schema";

export type AdminDropWriteValues = {
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  theme: string | null;
  live: boolean;
  releaseDate: Date | null;
};

export type UpdatedAdminDrop = {
  id: number;
  slug: string;
  previousSlug: string | null;
};

export class AdminDropNotFoundError extends Error {}
export class AdminDropSlugConflictError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function createAdminDrop(values: AdminDropWriteValues): Promise<UpdatedAdminDrop> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: drops.id })
        .from(drops)
        .where(eq(drops.slug, values.slug))
        .limit(1);
      if (existing[0]) throw new AdminDropSlugConflictError();

      const [created] = await tx
        .insert(drops)
        .values(values)
        .returning({ id: drops.id, slug: drops.slug });
      if (!created) throw new Error("Drop creation did not return a row");

      return { ...created, previousSlug: null };
    });
  } catch (error) {
    if (error instanceof AdminDropSlugConflictError || isUniqueViolation(error)) {
      throw new AdminDropSlugConflictError();
    }
    throw error;
  }
}

export async function updateAdminDrop(
  currentSlug: string,
  values: AdminDropWriteValues,
): Promise<UpdatedAdminDrop> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: drops.id, slug: drops.slug })
        .from(drops)
        .where(eq(drops.slug, currentSlug))
        .limit(1);
      const currentDrop = existing[0];
      if (!currentDrop) throw new AdminDropNotFoundError();

      const slugChanged = currentDrop.slug !== values.slug;
      if (slugChanged) {
        const conflicting = await tx
          .select({ id: drops.id })
          .from(drops)
          .where(eq(drops.slug, values.slug))
          .limit(1);
        if (conflicting[0]) throw new AdminDropSlugConflictError();
      }

      const [updated] = await tx
        .update(drops)
        .set(values)
        .where(eq(drops.id, currentDrop.id))
        .returning({ id: drops.id, slug: drops.slug });
      if (!updated) throw new Error("Drop update did not return a row");

      if (slugChanged) {
        await tx
          .update(products)
          .set({ dropId: currentDrop.id, dropSlug: updated.slug })
          .where(
            or(
              eq(products.dropId, currentDrop.id),
              eq(products.dropSlug, currentDrop.slug),
            ),
          );
      }

      return {
        ...updated,
        previousSlug: slugChanged ? currentDrop.slug : null,
      };
    });
  } catch (error) {
    if (error instanceof AdminDropNotFoundError || error instanceof AdminDropSlugConflictError || isUniqueViolation(error)) {
      if (isUniqueViolation(error)) throw new AdminDropSlugConflictError();
      throw error;
    }
    throw error;
  }
}
