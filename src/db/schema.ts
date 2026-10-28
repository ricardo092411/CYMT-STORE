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
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

/* -------------------------- Machinery CMS ------------------------- */

/** Flexible technical data for a machine, kept intentionally independent of its category. */
export type MachinerySpecification = {
  label: string;
  value: string;
};

export const machineryCategories = pgTable("machinery_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const machineryProducts = pgTable(
  "machinery_products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => machineryCategories.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    shortDescription: varchar("short_description", { length: 500 }).notNull(),
    description: text("description"),
    specifications: jsonb("specifications").$type<MachinerySpecification[]>(),
    priceNote: varchar("price_note", { length: 160 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("machinery_products_category_id_idx").on(table.categoryId)],
);

export const machineryProductImages = pgTable(
  "machinery_product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => machineryProducts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    altText: varchar("alt_text", { length: 300 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("machinery_product_images_product_sort_order_unique").on(
      table.productId,
      table.sortOrder,
    ),
    uniqueIndex("machinery_product_images_primary_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

/* --------------------------- CMT Ink CMS ------------------------- */

/** Flexible public product data. Internal formulas are intentionally not modeled. */
export type InkSpecification = {
  label: string;
  value: string;
};

export const inkProducts = pgTable("ink_products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  shortDescription: varchar("short_description", { length: 500 }).notNull(),
  description: text("description"),
  specifications: jsonb("specifications").$type<InkSpecification[]>(),
  priceNote: varchar("price_note", { length: 160 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inkProductImages = pgTable(
  "ink_product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => inkProducts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    altText: varchar("alt_text", { length: 300 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ink_product_images_product_sort_order_unique").on(table.productId, table.sortOrder),
    uniqueIndex("ink_product_images_primary_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

/* ------------------------ Confection CMS ------------------------ */

export type ConfectionSpecification = {
  label: string;
  value: string;
};

export const confectionCategories = pgTable("confection_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const confectionProducts = pgTable(
  "confection_products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => confectionCategories.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    shortDescription: varchar("short_description", { length: 500 }).notNull(),
    description: text("description"),
    specifications: jsonb("specifications").$type<ConfectionSpecification[]>(),
    priceNote: varchar("price_note", { length: 160 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("confection_products_category_id_idx").on(table.categoryId)],
);

export const confectionProductImages = pgTable(
  "confection_product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => confectionProducts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    altText: varchar("alt_text", { length: 300 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("confection_product_images_product_sort_order_unique").on(table.productId, table.sortOrder),
    uniqueIndex("confection_product_images_primary_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

/* ----------------------- Digital downloads CMS ----------------------- */

export type DigitalSpecification = {
  label: string;
  value: string;
};

export const digitalCategories = pgTable("digital_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const digitalProducts = pgTable(
  "digital_products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => digitalCategories.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    shortDescription: varchar("short_description", { length: 500 }).notNull(),
    description: text("description"),
    specifications: jsonb("specifications").$type<DigitalSpecification[]>(),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_products_category_id_idx").on(table.categoryId),
    check("digital_products_price_cents_check", sql`${table.priceCents} >= 0`),
  ],
);

export const digitalProductImages = pgTable(
  "digital_product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => digitalProducts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    altText: varchar("alt_text", { length: 300 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_product_images_product_id_idx").on(table.productId),
    uniqueIndex("digital_product_images_product_sort_order_unique").on(table.productId, table.sortOrder),
    uniqueIndex("digital_product_images_primary_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const digitalProductFiles = pgTable(
  "digital_product_files",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => digitalProducts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    originalName: varchar("original_name", { length: 300 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_product_files_product_id_idx").on(table.productId),
    uniqueIndex("digital_product_files_product_sort_order_unique").on(table.productId, table.sortOrder),
  ],
);

export const digitalOrders = pgTable(
  "digital_orders",
  {
    id: serial("id").primaryKey(),
    publicId: uuid("public_id").defaultRandom().notNull().unique(),
    accessTokenHash: text("access_token_hash").notNull(),
    customerEmail: varchar("customer_email", { length: 320 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    paypalOrderId: text("paypal_order_id").unique(),
    paypalCaptureId: text("paypal_capture_id").unique(),
    paymentReference: varchar("payment_reference", { length: 200 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_orders_customer_email_idx").on(table.customerEmail),
    index("digital_orders_status_idx").on(table.status),
    check("digital_orders_payment_method_check", sql`${table.paymentMethod} in ('bank_transfer', 'paypal')`),
    check("digital_orders_status_check", sql`${table.status} in ('pending_payment', 'payment_review', 'paid', 'payment_failed', 'cancelled', 'refunded')`),
    check("digital_orders_amounts_check", sql`${table.subtotalCents} >= 0 and ${table.totalCents} >= 0`),
  ],
);

export const digitalOrderItems = pgTable(
  "digital_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => digitalOrders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => digitalProducts.id, { onDelete: "set null" }),
    productNameSnapshot: varchar("product_name_snapshot", { length: 200 }).notNull(),
    productSlugSnapshot: varchar("product_slug_snapshot", { length: 160 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_order_items_order_id_idx").on(table.orderId),
    check("digital_order_items_unit_price_cents_check", sql`${table.unitPriceCents} >= 0`),
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
