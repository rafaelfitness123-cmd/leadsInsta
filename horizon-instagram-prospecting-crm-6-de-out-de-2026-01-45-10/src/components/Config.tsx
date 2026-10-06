import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Palette, 
  Bell, 
  Globe, 
  Lock,
  Save,
  CheckCircle2,
  Instagram,
  Tag,
  Zap,
  Database,
  ExternalLink,
  Copy,
  RefreshCw,
  Code
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getSupabaseConfig, supabaseDb, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Config() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');
  const [settings, setSettings] = useState({
    displayName: '',
    email: '',
    theme: 'light',
    notifications: true,
    autoParse: true,
    defaultNiche: 'Estética',
    instagramLink: '',
    twoFactor: false,
    language: 'pt-BR',
    privacyMode: false
  });

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string; tablesFound?: boolean } | null>(null);

  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      if (getSupabaseConfig().isConfigured) {
        try {
          const profile = await supabaseDb.getUserProfile(uid);
          if (profile) {
            setSettings(prev => ({ ...prev, ...profile }));
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.saveUserProfile(uid, settings);
      }
      await updateDoc(doc(db, 'users', uid), settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupabase = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast.error('Informe a URL e a Chave Anon do seu projeto Supabase.');
      return;
    }
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    toast.success('Configuração do Supabase salva com sucesso!');
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Desconectar o Supabase desta aplicação?')) {
      clearSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setSupabaseTestResult(null);
      toast.info('Supabase desconectado.');
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast.error('Preencha a URL e Chave Anon antes de testar.');
      return;
    }
    setTestingSupabase(true);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      setSupabaseTestResult(res);
      if (res.success && res.tablesFound) {
        toast.success(res.message);
      } else if (res.success) {
        toast.warning(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      setSupabaseTestResult({ success: false, message: e.message || 'Erro de teste' });
    } finally {
      setTestingSupabase(false);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'supabase', label: 'Banco Supabase', icon: Database },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Lock },
    { id: 'integracoes', label: 'Integrações', icon: Globe },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h2>
          <p className="text-slate-500">Personalize sua conta e preferências do sistema.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 dark:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-brand-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-50"
        >
          {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-2">
          {tabs.map((item) => (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                activeTab === item.id ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-8 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'perfil' && (
                <motion.section 
                  key="perfil"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User size={20} className="text-brand-500" />
                    Informações do Perfil
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={settings.displayName}
                        onChange={e => setSettings({...settings, displayName: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                      <input 
                        disabled
                        type="email" 
                        value={settings.email}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border-none rounded-xl text-sm text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === 'supabase' && (
                <motion.section 
                  key="supabase"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database size={20} className="text-emerald-500" />
                        Conexão com o Supabase
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Conecte seu banco de dados PostgreSQL do Supabase para sincronização em tempo real.
                      </p>
                    </div>
                    {getSupabaseConfig().isConfigured ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Conectado
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        Aguardando Conexão
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          1. Script SQL para criar as tabelas
                        </h4>
                      </div>
                      <button
                        onClick={() => {
                          const sql = `-- SCHEMA SUPABASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  variation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_board_id ON public.leads(board_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_variations_campaign_id ON public.message_variations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_history_lead_id ON public.lead_history(lead_id);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.boards; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_variations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;

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
                          navigator.clipboard.writeText(sql);
                          toast.success('Script SQL copiado com sucesso!');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Script SQL
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cole e execute este script no <b>SQL Editor</b> do seu painel do Supabase. O script criará as tabelas, índices e habilitará atualizações em tempo real.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      2. Credenciais do Projeto (Project Settings &gt; API)
                    </h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Project URL
                      </label>
                      <input 
                        type="url" 
                        value={supabaseUrl}
                        onChange={e => setSupabaseUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        anon / public key
                      </label>
                      <input 
                        type="password" 
                        value={supabaseAnonKey}
                        onChange={e => setSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-slate-200 font-mono"
                      />
                    </div>

                    {supabaseTestResult && (
                      <div className={`p-3 rounded-xl text-xs font-medium border ${
                        supabaseTestResult.success
                          ? supabaseTestResult.tablesFound
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      }`}>
                        {supabaseTestResult.message}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div>
                        {getSupabaseConfig().isConfigured && (
                          <button
                            type="button"
                            onClick={handleDisconnectSupabase}
                            className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                          >
                            Desconectar Supabase
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestSupabase}
                          disabled={testingSupabase}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
                          {testingSupabase ? 'Testando...' : 'Testar Conexão'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSupabase}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Salvar Conexão
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === 'aparencia' && (
                <motion.section 
                  key="aparencia"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette size={20} className="text-brand-500" />
                    Aparência do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSettings({...settings, theme: 'light'})}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <div className="w-full h-20 bg-white rounded-lg mb-3 border border-slate-200" />
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-200">Modo Claro</p>
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <div className="w-full h-20 bg-slate-900 rounded-lg mb-3" />
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-200">Modo Escuro</p>
                    </button>
                  </div>
                </motion.section>
              )}

              {activeTab === 'notificacoes' && (
                <motion.section 
                  key="notificacoes"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell size={20} className="text-brand-500" />
                    Notificações
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Alertas de Navegador</p>
                        <p className="text-xs text-slate-500">Receber avisos sobre novos leads qualificados.</p>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.notifications ? 'bg-brand-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notifications ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === 'seguranca' && (
                <motion.section 
                  key="seguranca"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Shield size={20} className="text-brand-500" />
                    Segurança e Privacidade
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Autenticação em Duas Etapas</p>
                        <p className="text-xs text-slate-500">Adicionar uma camada extra de proteção.</p>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, twoFactor: !settings.twoFactor})}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.twoFactor ? 'bg-brand-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twoFactor ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === 'integracoes' && (
                <motion.section 
                  key="integracoes"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Globe size={20} className="text-brand-500" />
                    Integrações Externas
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                          <Instagram size={20} className="text-pink-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Instagram API</p>
                          <p className="text-xs text-slate-500">Conectado como @seu_perfil</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-brand-600 hover:underline">Configurar</button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <hr className="border-slate-100" />

            {/* System Section */}
            <section className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={20} className="text-brand-500" />
                Preferências do Sistema
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Parsing Automático</p>
                    <p className="text-xs text-slate-500">Processar textos brutos assim que forem colados.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, autoParse: !settings.autoParse})}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.autoParse ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoParse ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nicho Padrão</label>
                    <input 
                      type="text" 
                      value={settings.defaultNiche}
                      onChange={e => setSettings({...settings, defaultNiche: e.target.value})}
                      placeholder="Ex: Estética"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Seu Instagram (Link)</label>
                    <input 
                      type="text" 
                      value={settings.instagramLink}
                      onChange={e => setSettings({...settings, instagramLink: e.target.value})}
                      placeholder="https://instagram.com/seu_perfil"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
