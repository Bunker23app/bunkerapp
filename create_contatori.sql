-- ═══════════════════════════════════════
-- TABELLA: contatori
-- Tiene traccia delle unità acquistate e consumate per ogni articolo del magazzino.
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contatori (
  magazzino_id  integer PRIMARY KEY,
  acquistato    integer NOT NULL DEFAULT 0,
  consumato     integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Aggiorna updated_at automaticamente ad ogni modifica
CREATE OR REPLACE FUNCTION public.set_contatori_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contatori_updated_at
  BEFORE UPDATE ON public.contatori
  FOR EACH ROW EXECUTE FUNCTION public.set_contatori_updated_at();

-- Abilita Row Level Security (opzionale ma consigliato)
ALTER TABLE public.contatori ENABLE ROW LEVEL SECURITY;

-- Permetti lettura e scrittura con la chiave anonima (stessa policy delle altre tabelle)
CREATE POLICY "allow_all_contatori" ON public.contatori
  FOR ALL USING (true) WITH CHECK (true);

-- Necessario per il realtime Supabase (replica identity)
ALTER TABLE public.contatori REPLICA IDENTITY FULL;
