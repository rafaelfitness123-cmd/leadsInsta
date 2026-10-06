import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Instagram, 
  Users as UsersIcon, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Columns as KanbanIcon,
  Search
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { getSupabaseConfig, supabaseDb } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ProspectBoard } from '../types';
import { toast } from 'sonner';

interface BoardsProps {
  onSelectBoard?: (id: string) => void;
}

export default function Boards({ onSelectBoard }: BoardsProps) {
  const [boards, setBoards] = useState<ProspectBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({ name: '', subtitle: '', niche: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const isSupabase = getSupabaseConfig().isConfigured;

    if (isSupabase) {
      setLoading(true);
      const unsubscribe = supabaseDb.subscribeBoards(uid, (boardsData) => {
        setBoards(boardsData);
        setLoading(false);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }

    const q = query(
      collection(db, 'boards'),
      where('ownerId', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const boardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProspectBoard[];
      setBoards(boardsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'boards');
      toast.error('Erro ao carregar quadros.');
    });

    return () => unsubscribe();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newBoard.name) return;

    try {
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.createBoard({
          ...newBoard,
          ownerId: auth.currentUser.uid
        });
        setIsModalOpen(false);
        setNewBoard({ name: '', subtitle: '', niche: '' });
        toast.success('Quadro criado no Supabase com sucesso!');
        return;
      }

      await addDoc(collection(db, 'boards'), {
        ...newBoard,
        ownerId: auth.currentUser.uid,
        leadCount: 0,
        responseRate: 0,
        createdAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setNewBoard({ name: '', subtitle: '', niche: '' });
      toast.success('Quadro criado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao criar quadro: ' + (error?.message || 'Verifique o banco.'));
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este quadro? Todos os leads vinculados serão mantidos, mas o quadro será removido.')) return;
    
    try {
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.deleteBoard(id);
        toast.success('Quadro excluído do Supabase.');
        return;
      }

      await deleteDoc(doc(db, 'boards', id));
      toast.success('Quadro excluído.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `boards/${id}`);
      toast.error('Erro ao excluir quadro.');
    }
  };

  const filteredBoards = boards.filter(board => 
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    board.niche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Quadros de Prospecção</h2>
          <p className="text-slate-500">Gerencie suas campanhas e nichos organizados por quadros.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar quadros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
          >
            <Plus size={20} />
            Novo Quadro
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredBoards.map((board) => (
            <motion.div 
              key={board.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => onSelectBoard?.(board.id)}
              className="premium-card group hover:border-brand-300 transition-all cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                    <Instagram size={24} />
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">{board.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{board.subtitle || 'Sem localização'}</p>
                
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {board.niche || 'Geral'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <UsersIcon size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Leads</p>
                      <p className="text-sm font-bold text-slate-900">{board.leadCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Resposta</p>
                      <p className="text-sm font-bold text-slate-900">{board.responseRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-brand-50 transition-colors">
                <span className="text-xs text-slate-400 font-medium">Criado em {board.createdAt.toDate().toLocaleDateString()}</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}

          <motion.div 
            layout
            onClick={() => setIsModalOpen(true)}
            className="premium-card p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 bg-transparent hover:border-brand-300 hover:bg-brand-50/30 transition-all cursor-pointer group min-h-[280px]"
          >
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
              <Plus size={28} className="text-slate-400 group-hover:text-brand-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Criar Novo Quadro</h3>
            <p className="text-sm text-slate-500 max-w-[200px]">Comece uma nova campanha de prospecção agora</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Novo Quadro</h3>
                <p className="text-sm text-slate-500">Defina os detalhes da sua nova campanha.</p>
              </div>
              <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome do Quadro</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newBoard.name}
                    onChange={e => setNewBoard({...newBoard, name: e.target.value})}
                    placeholder="Ex: Harmonização Facial | Marabá"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Localização / Subtítulo</label>
                  <input 
                    type="text" 
                    value={newBoard.subtitle}
                    onChange={e => setNewBoard({...newBoard, subtitle: e.target.value})}
                    placeholder="Ex: Marabá - PA"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nicho</label>
                  <input 
                    type="text" 
                    value={newBoard.niche}
                    onChange={e => setNewBoard({...newBoard, niche: e.target.value})}
                    placeholder="Ex: Estética"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                  >
                    Criar Quadro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
