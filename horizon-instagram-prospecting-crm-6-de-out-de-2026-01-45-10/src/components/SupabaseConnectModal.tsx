import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  testSupabaseConnection 
} from '../supabase';
import { toast } from 'sonner';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

const SQL_SCRIPT = `-- ==============================================================================
-- SCHEMA SUPABASE PARA O SISTEMA DE PROSPECÇÃO DE LEADS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS / USUÁRIOS
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

-- 2. TABELA DE QUADROS DE PROSPECÇÃO (BOARDS)
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

-- 3. TABELA DE CAMPANHAS DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE VARIAÇÕES DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.message_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE LEADS
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

-- 6. TABELA DE HISTÓRICO DE ATIVIDADES
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  variation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_board_id ON public.leads(board_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_variations_campaign_id ON public.message_variations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_history_lead_id ON public.lead_history(lead_id);

-- REALTIME
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.boards; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_variations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- RLS
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
CREATE POLICY "Acesso público lead_history" ON public.lead_history FOR ALL USING (true) WITH CHECK (true);`;

export default function SupabaseConnectModal({ isOpen, onClose, onConnected }: SupabaseConnectModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tablesFound?: boolean } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    toast.success('Script SQL copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      toast.error('Preencha a URL e a Chave Anon antes de testar.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
      if (res.success && res.tablesFound) {
        toast.success(res.message);
      } else if (res.success && !res.tablesFound) {
        toast.warning(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro inesperado ao testar.' });
      toast.error('Erro de conexão.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      toast.error('Informe a URL e a Chave Anon do seu projeto Supabase.');
      return;
    }

    saveSupabaseConfig(url, anonKey);
    toast.success('Configurações do Supabase salvas com sucesso!');
    if (onConnected) onConnected();
    onClose();
  };

  const handleDisconnect = () => {
    if (window.confirm('Deseja desconectar o Supabase?')) {
      clearSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      toast.info('Supabase desconectado.');
      if (onConnected) onConnected();
      onClose();
    }
  };

  const isCurrentlyConfigured = getSupabaseConfig().isConfigured;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Conectar Banco Supabase
                    {isCurrentlyConfigured ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Conectado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 font-medium">
                        Aguardando Link
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Integre seu projeto Supabase PostgreSQL com sincronização em tempo real
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Passo a passo */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Como configurar em 2 passos rápidos:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Criar as Tabelas</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Copie o Script SQL abaixo, abra o <b>SQL Editor</b> no seu Supabase e clique em <b>Run</b>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Linkar o Projeto</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Copie a <b>Project URL</b> e a chave <b>anon / public</b> em <i>Project Settings &gt; API</i> e cole abaixo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Copiar Script SQL */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">Script SQL das Tabelas</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inclui leads, quadros, campanhas, histórico e permissões RLS.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowSql(!showSql)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {showSql ? 'Ocultar Código' : 'Ver Código'}
                  </button>
                  <button
                    onClick={handleCopySql}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar Script SQL'}
                  </button>
                </div>
              </div>

              {/* Visualizador de SQL (Colapsável) */}
              {showSql && (
                <div className="relative">
                  <pre className="p-3 text-[11px] font-mono bg-slate-950 text-slate-200 rounded-xl max-h-52 overflow-y-auto border border-slate-800">
                    {SQL_SCRIPT}
                  </pre>
                  <button
                    onClick={handleCopySql}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              )}

              {/* Formulário de Conexão */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Project URL do Supabase
                  </label>
                  <input
                    type="url"
                    placeholder="https://sua-instancia.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Encontrado no painel do Supabase em Project Settings &gt; API</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    anon / public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Chave pública anônima que concede acesso seguro às tabelas</p>
                </div>
              </div>

              {/* Status do Teste */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? testResult.tablesFound
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    testResult.tablesFound ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    )
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                {isCurrentlyConfigured && (
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium hover:underline"
                  >
                    Desconectar Supabase
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Conectar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
