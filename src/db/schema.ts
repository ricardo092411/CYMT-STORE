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

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
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
