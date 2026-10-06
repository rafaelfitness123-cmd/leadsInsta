import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Columns, 
  Users, 
  MessageSquare, 
  FileUp, 
  BarChart3, 
  Settings, 
  LogOut,
  Instagram,
  Search,
  Plus,
  Bell,
  ChevronRight,
  User as UserIcon,
  Database
} from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { getSupabaseConfig, supabaseDb } from './supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

// Components
import Dashboard from './components/Dashboard';
import Boards from './components/Boards';
import Leads from './components/Leads';
import Messages from './components/Messages';
import Import from './components/Import';
import Reports from './components/Reports';
import Config from './components/Config';
import SupabaseConnectModal from './components/SupabaseConnectModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [theme, setTheme] = useState('light');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(getSupabaseConfig().isConfigured);

  useEffect(() => {
    setIsSupabaseConnected(getSupabaseConfig().isConfigured);
  }, [isSupabaseModalOpen]);

  useEffect(() => {
    if (!user) {
      document.documentElement.classList.remove('dark');
      return;
    }

    if (getSupabaseConfig().isConfigured) {
      supabaseDb.getUserProfile(user.uid).then(profile => {
        if (profile?.theme === 'dark') {
          document.documentElement.classList.add('dark');
          setTheme('dark');
        } else {
          document.documentElement.classList.remove('dark');
          setTheme('light');
        }
      }).catch(console.error);
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
          setTheme('dark');
        } else {
          document.documentElement.classList.remove('dark');
          setTheme('light');
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (getSupabaseConfig().isConfigured) {
          try {
            await supabaseDb.saveUserProfile(user.uid, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'user'
            });
          } catch (e) {
            console.error('Supabase profile sync error:', e);
          }
        }

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user',
            createdAt: Timestamp.now()
          });
        }
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center"
        >
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-200">
            <Instagram className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Horizon</h1>
          <p className="text-slate-500 mb-8">Premium Instagram Prospecting CRM. Organize your leads and scale your outreach.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'boards', label: 'Quadros', icon: Columns },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'import', label: 'Importação', icon: FileUp },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Instagram className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Horizon</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-bottom border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Busca global de leads..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 rounded-xl text-sm transition-all outline-none dark:text-slate-200"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isSupabaseConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              }`}
            >
              <Database size={14} className={isSupabaseConnected ? 'text-emerald-500' : 'text-amber-500'} />
              <span>{isSupabaseConnected ? 'Supabase Conectado' : 'Linkar Supabase'}</span>
            </button>

            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <button 
              onClick={() => setActiveTab('import')}
              className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-md shadow-brand-100"
            >
              <Plus size={18} />
              Novo Lead
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedBoardId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
              {activeTab === 'boards' && (
                <Boards 
                  onSelectBoard={(id) => {
                    setSelectedBoardId(id);
                    setActiveTab('leads');
                  }} 
                />
              )}
              {activeTab === 'leads' && (
                <Leads 
                  boardId={selectedBoardId} 
                  onClearBoard={() => setSelectedBoardId(null)} 
                />
              )}
              {activeTab === 'messages' && <Messages />}
              {activeTab === 'import' && <Import initialBoardId={selectedBoardId} />}
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'config' && <Config />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <SupabaseConnectModal 
        isOpen={isSupabaseModalOpen} 
        onClose={() => setIsSupabaseModalOpen(false)} 
        onConnected={() => setIsSupabaseConnected(getSupabaseConfig().isConfigured)}
      />
    </div>
  );
}
