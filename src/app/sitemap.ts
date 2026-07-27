import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { products, drops } from "@/data/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tienda`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/favoritos`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const dropRoutes: MetadataRoute.Sitemap = drops.map((d) => ({
    url: `${base}/drop/${d.slug}`,
    lastModified: new Date(d.releaseDate),
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
