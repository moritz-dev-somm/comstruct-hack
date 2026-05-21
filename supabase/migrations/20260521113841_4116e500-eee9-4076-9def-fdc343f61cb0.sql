
CREATE TABLE public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null,
  source_category text,
  unit text not null default 'Stk',
  price_eur numeric(10,2) not null default 0,
  supplier text,
  consumable text,
  hazardous boolean not null default false,
  storage_location text,
  typical_site text,
  attributes jsonb not null default '{}'::jsonb,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX products_category_idx ON public.products(category);
CREATE INDEX products_sku_idx ON public.products(sku);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read; permissive write for the demo (no auth wired yet).
CREATE POLICY "products readable by everyone" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products writable by anyone" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "products updatable by anyone" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "products deletable by anyone" ON public.products
  FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
