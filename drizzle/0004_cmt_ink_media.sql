-- CMT Ink landing and public showcase media. Apply manually only after explicit approval.
-- This project does not use an applied remote Drizzle migration history.

CREATE TABLE ink_landing_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  hero_storage_path text,
  hero_alt_text varchar(300),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ink_product_media (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES ink_products(id) ON DELETE CASCADE,
  media_type varchar(16) NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL,
  title varchar(160),
  caption varchar(500),
  alt_text varchar(300),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ink_product_media_product_id_idx ON ink_product_media(product_id);
CREATE UNIQUE INDEX ink_product_media_product_sort_order_unique
  ON ink_product_media(product_id, sort_order);

ALTER TABLE ink_landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ink_product_media ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE ink_landing_settings FROM anon, authenticated;
REVOKE ALL ON TABLE ink_product_media FROM anon, authenticated;

REVOKE ALL ON SEQUENCE ink_product_media_id_seq FROM anon, authenticated;
