import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getSupabaseConfig, supabaseDb } from '../supabase';
import { Users, MessageSquare, CheckCircle2, TrendingUp, Target, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Reports() {
  const [data, setData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      const isSupabase = getSupabaseConfig().isConfigured;

      let leads: any[] = [];
      if (isSupabase) {
        leads = await supabaseDb.getLeads(uid);
      } else {
        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, where('ownerId', '==', uid));
        const snap = await getDocs(q);
        leads = snap.docs.map(d => d.data());
      }
      
      // Status Distribution
      const statuses = ['new', 'qualified', 'contacted', 'responded', 'interested', 'proposal', 'closed'];
      const statusCounts = statuses.map(status => ({
        name: status,
        value: leads.filter(l => l.status === status).length
      }));
      setStatusData(statusCounts);

      // Real activity data (last 4 months including current)
      const now = new Date();
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const last4Months = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = months[d.getMonth()];
        const count = leads.filter(l => {
          const createdAt = typeof l.createdAt?.toDate === 'function' ? l.createdAt.toDate() : (l.createdAt ? new Date(l.createdAt) : null);
          return createdAt && createdAt.getMonth() === d.getMonth() && createdAt.getFullYear() === d.getFullYear();
        }).length;
        last4Months.push({ name: monthName, leads: count });
      }
      setData(last4Months);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#64748b'];

  const totalLeads = statusData.reduce((acc, curr) => acc + curr.value, 0);
  const contactedLeads = statusData.filter(s => ['contacted', 'responded', 'interested', 'proposal', 'closed'].includes(s.name)).reduce((acc, curr) => acc + curr.value, 0);
  const responseRate = contactedLeads > 0 ? Math.round((statusData.filter(s => ['responded', 'interested', 'proposal', 'closed'].includes(s.name)).reduce((acc, curr) => acc + curr.value, 0) / contactedLeads) * 100) : 0;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Relatórios de Desempenho</h2>
        <p className="text-slate-500">Acompanhe suas métricas de conversão e produtividade.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Taxa de Resposta', value: `${responseRate}%`, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Taxa de Conversão', value: `${totalLeads > 0 ? Math.round((statusData.find(s => s.name === 'closed')?.value || 0) / totalLeads * 100) : 0}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Leads Totais', value: totalLeads.toString(), icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Leads Interessados', value: (statusData.find(s => s.name === 'interested')?.value || 0).toString(), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="premium-card p-6"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="premium-card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribuição por Status</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Chart */}
        <div className="premium-card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Crescimento de Leads</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
