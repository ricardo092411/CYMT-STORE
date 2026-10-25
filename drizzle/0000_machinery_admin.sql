CREATE TABLE "machinery_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machinery_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "machinery_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"short_description" varchar(500) NOT NULL,
	"description" text,
	"specifications" jsonb,
	"price_note" varchar(160),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machinery_products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "machinery_products_category_id_machinery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."machinery_categories"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "machinery_product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"alt_text" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machinery_product_images_product_id_machinery_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."machinery_products"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "machinery_products_category_id_idx" ON "machinery_products" USING btree ("category_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "machinery_product_images_product_sort_order_unique" ON "machinery_product_images" USING btree ("product_id","sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "machinery_product_images_primary_per_product_unique" ON "machinery_product_images" USING btree ("product_id") WHERE "machinery_product_images"."is_primary" = true;
