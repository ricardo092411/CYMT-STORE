import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export async function getProducts() {
  return await db.select().from(products);
}

export async function getProductBySlug(slug: string) {
  const result = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));

  return result[0] ?? null;
}