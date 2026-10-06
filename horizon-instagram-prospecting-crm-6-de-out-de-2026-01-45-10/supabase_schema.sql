-- ==============================================================================
-- SCHEMA SUPABASE PARA O SISTEMA DE PROSPECÇÃO DE LEADS
-- ==============================================================================
-- Como usar:
-- 1. Acesse o seu painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione o seu projeto
-- 3. No menu lateral, clique em "SQL Editor"
-- 4. Clique em "New Query", cole todo o código abaixo e clique em "Run" (Executar)
-- ==============================================================================

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS / USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'user',
  theme TEXT DEFAULT 'light',
  notifications BOOLEAN DEFAULT true,
  auto_parse BOOLEAN DEFAULT true,
  default_niche TEXT DEFAULT 'Estética',
  instagram_link TEXT DEFAULT '',
  two_factor BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'pt-BR',
  privacy_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE QUADROS DE PROSPECÇÃO (BOARDS)
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  niche TEXT,
  description TEXT,
  color TEXT DEFAULT '#4f46e5',
  message_campaign_id UUID,
  lead_count INTEGER DEFAULT 0,
  response_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE CAMPANHAS DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE VARIAÇÕES DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.message_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL,
  name TEXT,
  instagram_handle TEXT NOT NULL,
  instagram_url TEXT,
  followers_count INTEGER DEFAULT 0,
  city TEXT,
  bio TEXT,
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  parsing_confidence INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  is_analyzed BOOLEAN DEFAULT false,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  assigned_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE HISTÓRICO DE ATIVIDADES DO LEAD
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  variation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_board_id ON public.leads(board_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_variations_campaign_id ON public.message_variations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_history_lead_id ON public.lead_history(lead_id);

-- HABILITAR REALTIME (Para atualizações instantâneas no painel)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_variations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- POLÍTICAS DE ACESSO (RLS - Row Level Security)
-- Liberadas por padrão para garantir funcionamento com anon key do frontend
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público profiles" ON public.profiles;
CREATE POLICY "Acesso público profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público boards" ON public.boards;
CREATE POLICY "Acesso público boards" ON public.boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público campaigns" ON public.campaigns;
CREATE POLICY "Acesso público campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público message_variations" ON public.message_variations;
CREATE POLICY "Acesso público message_variations" ON public.message_variations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público leads" ON public.leads;
CREATE POLICY "Acesso público leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público lead_history" ON public.lead_history;
CREATE POLICY "Acesso público lead_history" ON public.lead_history FOR ALL USING (true) WITH CHECK (true);
