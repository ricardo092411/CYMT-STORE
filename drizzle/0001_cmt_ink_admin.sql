-- CMT Ink admin catalog. Apply manually only after explicit approval.
-- This project does not use an applied remote Drizzle migration history.

CREATE TABLE ink_products (
  id serial PRIMARY KEY,
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

CREATE TABLE ink_product_images (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES ink_products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text varchar(300),
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ink_products_sort_order_idx ON ink_products(sort_order, name);
CREATE INDEX ink_product_images_product_id_idx ON ink_product_images(product_id);
CREATE UNIQUE INDEX ink_product_images_product_sort_order_unique
  ON ink_product_images(product_id, sort_order);
CREATE UNIQUE INDEX ink_product_images_primary_per_product_unique
  ON ink_product_images(product_id)
  WHERE is_primary = true;
