import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  CheckCircle2, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Plus,
  Instagram
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getSupabaseConfig, supabaseDb } from '../supabase';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    contacted: 0,
    responded: 0,
    interested: 0,
  });
  const [recentBoards, setRecentBoards] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const isSupabase = getSupabaseConfig().isConfigured;

    if (isSupabase) {
      const unsubLeads = supabaseDb.subscribeLeads(uid, null, (leads) => {
        const counts = {
          totalLeads: leads.length,
          newLeads: leads.filter(d => d.status === 'new').length,
          contacted: leads.filter(d => d.status === 'contacted').length,
          responded: leads.filter(d => d.status === 'responded').length,
          interested: leads.filter(d => d.status === 'interested').length,
        };
        setStats(counts);

        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            name: days[d.getDay()],
            date: d.toLocaleDateString(),
            leads: 0
          };
        });

        leads.forEach(lead => {
          if (lead.createdAt) {
            const dateStr = typeof lead.createdAt.toDate === 'function' 
              ? lead.createdAt.toDate().toLocaleDateString()
              : new Date(lead.createdAt as any).toLocaleDateString();
            const dayData = last7Days.find(d => d.date === dateStr);
            if (dayData) dayData.leads++;
          }
        });
        setActivityData(last7Days);
      });

      const unsubBoards = supabaseDb.subscribeBoards(uid, (boards) => {
        setRecentBoards(boards.slice(0, 3));
      });

      return () => {
        if (typeof unsubLeads === 'function') unsubLeads();
        if (typeof unsubBoards === 'function') unsubBoards();
      };
    }

    const leadsRef = collection(db, 'leads');
    const qLeads = query(leadsRef, where('ownerId', '==', uid));
    
    const unsubLeads = onSnapshot(qLeads, (snap) => {
      const counts = {
        totalLeads: snap.size,
        newLeads: snap.docs.filter(d => d.data().status === 'new').length,
        contacted: snap.docs.filter(d => d.data().status === 'contacted').length,
        responded: snap.docs.filter(d => d.data().status === 'responded').length,
        interested: snap.docs.filter(d => d.data().status === 'interested').length,
      };
      setStats(counts);

      // Process activity data (leads per day for last 7 days)
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          name: days[d.getDay()],
          date: d.toLocaleDateString(),
          leads: 0
        };
      });

      snap.docs.forEach(doc => {
        const createdAt = doc.data().createdAt as Timestamp;
        if (createdAt) {
          const dateStr = createdAt.toDate().toLocaleDateString();
          const dayData = last7Days.find(d => d.date === dateStr);
          if (dayData) dayData.leads++;
        }
      });
      setActivityData(last7Days);
    });

    const boardsRef = collection(db, 'boards');
    const qBoards = query(
      boardsRef, 
      where('ownerId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubBoards = onSnapshot(qBoards, (snap) => {
      setRecentBoards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubLeads();
      unsubBoards();
    };
  }, []);

  const statCards = [
    { label: 'Total de Leads', value: stats.totalLeads, icon: Users, color: 'bg-blue-500' },
    { label: 'Leads Novos', value: stats.newLeads, icon: UserPlus, color: 'bg-indigo-500' },
    { label: 'Contatados', value: stats.contacted, icon: MessageSquare, color: 'bg-amber-500' },
    { label: 'Respondidos', value: stats.responded, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Interessados', value: stats.interested, icon: TrendingUp, color: 'bg-rose-500' },
  ];

  const chartData = [
    { name: 'Seg', leads: 4 },
    { name: 'Ter', leads: 7 },
    { name: 'Qua', leads: 5 },
    { name: 'Qui', leads: 12 },
    { name: 'Sex', leads: 8 },
    { name: 'Sáb', leads: 3 },
    { name: 'Dom', leads: 2 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
        <p className="text-slate-500">Bem-vindo de volta! Aqui está o resumo da sua prospecção.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="premium-card p-5 flex flex-col gap-3"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-200 dark:shadow-none`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Atividade de Prospecção</h3>
            <select className="text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1 outline-none dark:text-slate-300">
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Boards */}
        <div className="premium-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quadros Recentes</h3>
            <button 
              onClick={() => setActiveTab('boards')}
              className="text-sm text-brand-600 font-semibold hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {recentBoards.length > 0 ? recentBoards.map((board) => (
              <div 
                key={board.id} 
                onClick={() => setActiveTab('boards')}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                  <Instagram size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{board.name}</p>
                  <p className="text-xs text-slate-500">{board.leadCount || 0} leads • {board.niche || 'Geral'}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600" />
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-400">Nenhum quadro criado ainda.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('boards')}
            className="mt-6 w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Novo Quadro
          </button>
        </div>
      </div>
    </div>
  );
}
