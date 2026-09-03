/**
 * CYMT STORE — Database schema (Drizzle ORM / PostgreSQL)
 * ------------------------------------------------------------------
 *
 * CURRENT ARCHITECTURE
 *  The live catalog (products + drops) is authored in a single,
 *  easy-to-edit TypeScript file: `src/data/catalog.ts`. The storefront
 *  reads directly from it — no migration needed to add products.
 *
 * FUTURE — ADMIN PANEL
 *  The tables below mirror that catalog model so a future admin panel
 *  can CRUD products, drops and banners against PostgreSQL without
 *  touching the storefront code. Until then they are available and ready.
 *
 * USED TODAY
 *  - `clubMembers`  → persists Club CYMT signups from /api/club
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ----------------------------- Drops ----------------------------- */

export const drops = pgTable("drops", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  banner: text("banner"),
  image: text("image"),
  theme: varchar("theme", { length: 40 }),
  live: boolean("live").default(true).notNull(),
  releaseDate: timestamp("release_date", { mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --------------------------- Home hero --------------------------- */

/** Singleton configuration for the public Home Hero. The app always uses id=1. */
export const homeHero = pgTable(
  "home_hero",
  {
    id: integer("id").primaryKey(),
    badge: varchar("badge", { length: 160 }).notNull(),
    titlePrefix: varchar("title_prefix", { length: 180 }).notNull(),
    titleHighlight: varchar("title_highlight", { length: 180 }).notNull(),
    description: text("description").notNull(),
    primaryLabel: varchar("primary_label", { length: 80 }).notNull(),
    primaryHref: varchar("primary_href", { length: 300 }).notNull(),
    secondaryLabel: varchar("secondary_label", { length: 80 }).notNull(),
    imageUrl: text("image_url"),
    imageAlt: varchar("image_alt", { length: 200 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("home_hero_singleton_id_check", sql`${table.id} = 1`)],
);

/* ---------------------------- Products --------------------------- */

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  description: text("description"),
  details: jsonb("details").$type<string[]>(),
  dropId: integer("drop_id").references(() => drops.id),
  dropSlug: varchar("drop_slug", { length: 120 }),
  sizes: jsonb("sizes").$type<string[]>(),
  colors: jsonb("colors").$type<{ name: string; hex: string }[]>(),
  stock: integer("stock").default(0).notNull(),
  images: jsonb("images").$type<string[]>(),
  status: varchar("status", { length: 40 }).default("nuevo").notNull(),
  featured: boolean("featured").default(false).notNull(),
  bestSeller: boolean("best_seller").default(false).notNull(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------ Product variants ----------------------- */

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorName: varchar("color_name", { length: 80 }),
    colorHex: varchar("color_hex", { length: 16 }),
    colorStatus: varchar("color_status", { length: 40 }).default("requires_user_input").notNull(),
    position: integer("position").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_variants_product_id_position_unique").on(table.productId, table.position),
    uniqueIndex("product_variants_default_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isDefault} = true`),
  ],
);

/* ------------------------- Product images ------------------------ */

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productVariantId: integer("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    storageKey: text("storage_key"),
    legacyUrl: text("legacy_url"),
    originalFilename: text("original_filename").notNull(),
    originalSourcePath: text("original_source_path"),
    position: integer("position").notNull(),
    isCover: boolean("is_cover").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_images_variant_id_position_unique").on(table.productVariantId, table.position),
    uniqueIndex("product_images_cover_per_variant_unique")
      .on(table.productVariantId)
      .where(sql`${table.isCover} = true`),
  ],
);

/* --------------------------- Club CYMT --------------------------- */

export const clubMembers = pgTable("club_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }),
  email: varchar("email", { length: 200 }).notNull().unique(),
  interests: jsonb("interests").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ClubMember = typeof clubMembers.$inferSelect;
export type NewClubMember = typeof clubMembers.$inferInsert;
