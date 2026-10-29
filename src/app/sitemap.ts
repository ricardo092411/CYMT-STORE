import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { getLiveDrops } from "@/lib/drops";
import { getPublicConfectionCatalog } from "@/lib/public-confection";
import { getPublicDigitalCatalog } from "@/lib/public-downloads";
import { getPublicInkCatalog } from "@/lib/public-inks";
import { getPublicMachineryCatalog } from "@/lib/public-machinery";
import { getPublicProductsWithVariants } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();
  const [drops, products, machineryCatalog, inkCatalog, confectionCatalog, downloadsCatalog] = await Promise.all([
    getLiveDrops(),
    getPublicProductsWithVariants(),
    getPublicMachineryCatalog(),
    getPublicInkCatalog(),
    getPublicConfectionCatalog(),
    getPublicDigitalCatalog(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tienda`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/favoritos`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/maquinas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/tintas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/confeccion`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/descargas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
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

  const machineryRoutes: MetadataRoute.Sitemap = machineryCatalog.products.map((product) => ({
    url: `${base}/maquinas/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const inkRoutes: MetadataRoute.Sitemap = inkCatalog.products.map((product) => ({
    url: `${base}/tintas/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const confectionRoutes: MetadataRoute.Sitemap = confectionCatalog.products.map((product) => ({
    url: `${base}/confeccion/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const downloadRoutes: MetadataRoute.Sitemap = downloadsCatalog.products.map((product) => ({
    url: `${base}/descargas/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...dropRoutes,
    ...productRoutes,
    ...machineryRoutes,
    ...inkRoutes,
    ...confectionRoutes,
    ...downloadRoutes,
  ];
}
