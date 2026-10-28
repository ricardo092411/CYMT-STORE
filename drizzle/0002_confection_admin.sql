-- CYMT Confección admin catalog. Apply manually only after explicit approval.
-- This project does not use an applied remote Drizzle migration history.

CREATE TABLE confection_categories (
  id serial PRIMARY KEY,
  slug varchar(160) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE confection_products (
  id serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES confection_categories(id) ON DELETE RESTRICT,
  slug varchar(160) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  short_description varchar(500) NOT NULL,
  description text,
  specifications jsonb,
  price_note varchar(160),
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE confection_product_images (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES confection_products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text varchar(300),
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX confection_products_category_id_idx ON confection_products(category_id);
CREATE INDEX confection_product_images_product_id_idx ON confection_product_images(product_id);
CREATE UNIQUE INDEX confection_product_images_product_sort_order_unique
  ON confection_product_images(product_id, sort_order);
CREATE UNIQUE INDEX confection_product_images_primary_per_product_unique
  ON confection_product_images(product_id)
  WHERE is_primary = true;
