import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { getDrops } from "@/lib/drops";
import { getProductsWithVariants } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();
  const [drops, products] = await Promise.all([
    getDrops(),
    getProductsWithVariants(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tienda`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/favoritos`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const dropRoutes: MetadataRoute.Sitemap = drops.map((d) => ({
    url: `${base}/drop/${d.slug}`,
    lastModified: d.releaseDate ? new Date(`${d.releaseDate}T00:00:00.000Z`) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/producto/${p.slug}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...dropRoutes, ...productRoutes];
}
