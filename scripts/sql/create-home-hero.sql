-- Manual bootstrap for the singleton home Hero. Do not run this from the app.
BEGIN;

CREATE TABLE IF NOT EXISTS public.home_hero (
  id integer PRIMARY KEY,
  badge varchar(160) NOT NULL,
  title_prefix varchar(180) NOT NULL,
  title_highlight varchar(180) NOT NULL,
  description text NOT NULL,
  primary_label varchar(80) NOT NULL,
  primary_href varchar(300) NOT NULL,
  secondary_label varchar(80) NOT NULL,
  image_url text,
  image_alt varchar(200) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_hero_singleton_id_check CHECK (id = 1)
);

INSERT INTO public.home_hero (
  id,
  badge,
  title_prefix,
  title_highlight,
  description,
  primary_label,
  primary_href,
  secondary_label,
  image_url,
  image_alt
)
VALUES (
  1,
  'El Salvador · Entregas en 48 Horas',
  'Tu Personalidad Merece',
  'Diseños Exclusivos.',
  'CYMT STORE — streetwear premium diseñado en El Salvador. Drops exclusivos de Anime, Rock, Naturaleza, Retro y Mas. Entregas En 48 Horas.',
  'Explorar Drops',
  '/tienda',
  'Únete al Club',
  NULL,
  'CYMT STORE — streetwear premium'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
