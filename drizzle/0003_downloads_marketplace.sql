-- CYMT Descargas marketplace. Apply manually only after explicit approval.
-- This project does not use an applied remote Drizzle migration history.

CREATE TABLE digital_categories (
  id serial PRIMARY KEY,
  slug varchar(160) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_products (
  id serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES digital_categories(id) ON DELETE RESTRICT,
  slug varchar(160) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  short_description varchar(500) NOT NULL,
  description text,
  specifications jsonb,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_product_images (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text varchar(300),
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_product_files (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  original_name varchar(300) NOT NULL,
  mime_type varchar(160),
  size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_orders (
  id serial PRIMARY KEY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  access_token_hash text NOT NULL,
  customer_email varchar(320) NOT NULL,
  customer_name varchar(200),
  payment_method varchar(32) NOT NULL CHECK (payment_method IN ('bank_transfer', 'paypal')),
  status varchar(32) NOT NULL CHECK (status IN ('pending_payment', 'payment_review', 'paid', 'payment_failed', 'cancelled', 'refunded')),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  payment_reference varchar(200),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_order_items (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES digital_orders(id) ON DELETE CASCADE,
  product_id integer REFERENCES digital_products(id) ON DELETE SET NULL,
  product_name_snapshot varchar(200) NOT NULL,
  product_slug_snapshot varchar(160) NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX digital_products_category_id_idx ON digital_products(category_id);
CREATE INDEX digital_product_images_product_id_idx ON digital_product_images(product_id);
CREATE UNIQUE INDEX digital_product_images_product_sort_order_unique ON digital_product_images(product_id, sort_order);
CREATE UNIQUE INDEX digital_product_images_primary_per_product_unique ON digital_product_images(product_id) WHERE is_primary = true;
CREATE INDEX digital_product_files_product_id_idx ON digital_product_files(product_id);
CREATE UNIQUE INDEX digital_product_files_product_sort_order_unique ON digital_product_files(product_id, sort_order);
CREATE INDEX digital_orders_customer_email_idx ON digital_orders(customer_email);
CREATE INDEX digital_orders_status_idx ON digital_orders(status);
CREATE INDEX digital_order_items_order_id_idx ON digital_order_items(order_id);

ALTER TABLE digital_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE digital_categories FROM anon, authenticated;
REVOKE ALL ON TABLE digital_products FROM anon, authenticated;
REVOKE ALL ON TABLE digital_product_images FROM anon, authenticated;
REVOKE ALL ON TABLE digital_product_files FROM anon, authenticated;
REVOKE ALL ON TABLE digital_orders FROM anon, authenticated;
REVOKE ALL ON TABLE digital_order_items FROM anon, authenticated;
