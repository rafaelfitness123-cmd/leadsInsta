import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Copy, 
  CheckCircle2, 
  X,
  Search,
  Tag,
  Hash
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { getSupabaseConfig, supabaseDb } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCampaign, MessageVariation } from '../types';
import { toast } from 'sonner';

export default function Messages() {
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<MessageCampaign | null>(null);
  const [variations, setVariations] = useState<MessageVariation[]>([]);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [newVariationText, setNewVariationText] = useState('');
  const [newCampaign, setNewCampaign] = useState({ name: '', niche: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const isSupabase = getSupabaseConfig().isConfigured;

    if (isSupabase) {
      const unsub = supabaseDb.subscribeCampaigns(uid, (data) => {
        setCampaigns(data);
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }

    const q = query(collection(db, 'campaigns'), where('ownerId', '==', uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageCampaign)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCampaign) {
      setVariations([]);
      return;
    }

    const isSupabase = getSupabaseConfig().isConfigured;
    if (isSupabase) {
      const unsub = supabaseDb.subscribeVariations(selectedCampaign.id, (data) => {
        setVariations(data);
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }

    const q = query(collection(db, `campaigns/${selectedCampaign.id}/variations`), where('ownerId', '==', auth.currentUser?.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVariations(snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageVariation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `campaigns/${selectedCampaign.id}/variations`);
    });
    return () => unsubscribe();
  }, [selectedCampaign]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newCampaign.name) return;
    try {
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.createCampaign({
          ...newCampaign,
          ownerId: auth.currentUser.uid
        });
        setIsCampaignModalOpen(false);
        setNewCampaign({ name: '', niche: '' });
        toast.success('Campanha criada no Supabase!');
        return;
      }

      await addDoc(collection(db, 'campaigns'), {
        ...newCampaign,
        ownerId: auth.currentUser.uid,
        isActive: true,
        createdAt: Timestamp.now()
      });
      setIsCampaignModalOpen(false);
      setNewCampaign({ name: '', niche: '' });
      toast.success('Campanha criada!');
    } catch (error: any) {
      toast.error('Erro ao criar campanha: ' + (error?.message || ''));
    }
  };

  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !auth.currentUser || !newVariationText.trim()) return;

    try {
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.createVariation({
          campaignId: selectedCampaign.id,
          title: `Variação ${variations.length + 1}`,
          text: newVariationText,
          ownerId: auth.currentUser.uid
        });
        setIsVariationModalOpen(false);
        setNewVariationText('');
        toast.success('Variação adicionada no Supabase!');
        return;
      }

      await addDoc(collection(db, `campaigns/${selectedCampaign.id}/variations`), {
        campaignId: selectedCampaign.id,
        title: `Variação ${variations.length + 1}`,
        text: newVariationText,
        isActive: true,
        ownerId: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      setIsVariationModalOpen(false);
      setNewVariationText('');
      toast.success('Variação adicionada!');
    } catch (error: any) {
      toast.error('Erro ao adicionar variação: ' + (error?.message || ''));
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!selectedCampaign || !window.confirm('Excluir esta variação?')) return;
    try {
      if (getSupabaseConfig().isConfigured) {
        await supabaseDb.deleteVariation(variationId);
        toast.success('Variação excluída do Supabase.');
        return;
      }

      await deleteDoc(doc(db, `campaigns/${selectedCampaign.id}/variations`, variationId));
      toast.success('Variação excluída.');
    } catch (error: any) {
      toast.error('Erro ao excluir variação: ' + (error?.message || ''));
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.niche?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Biblioteca de Mensagens</h2>
          <p className="text-slate-500">Crie e organize templates de mensagens para sua prospecção.</p>
        </div>
        <button 
          onClick={() => setIsCampaignModalOpen(true)}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
        >
          <Plus size={20} />
          Nova Campanha
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaigns List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Campanhas</h3>
          </div>
          <div className="relative px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar campanhas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            {filteredCampaigns.map(campaign => (
              <div 
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  selectedCampaign?.id === campaign.id 
                    ? 'bg-brand-50 border-brand-200 text-brand-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-brand-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} />
                  <div>
                    <p className="font-bold text-sm">{campaign.name}</p>
                    <p className="text-[10px] opacity-70 uppercase font-bold">{campaign.niche || 'Geral'}</p>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${selectedCampaign?.id === campaign.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Variations List */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCampaign ? (
            <>
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Variações de "{selectedCampaign.name}"
                </h3>
                <button 
                  onClick={() => setIsVariationModalOpen(true)}
                  className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus size={14} />
                  Adicionar Variação
                </button>
              </div>
              
              <div className="space-y-4">
                {variations.length === 0 ? (
                  <div className="premium-card p-12 text-center">
                    <p className="text-slate-400 text-sm">Nenhuma variação cadastrada para esta campanha.</p>
                  </div>
                ) : (
                  variations.map(variation => (
                    <div key={variation.id} className="premium-card p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">{variation.title}</h4>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(variation.text);
                              toast.success('Template copiado!');
                            }}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteVariation(variation.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 font-medium leading-relaxed border border-slate-100">
                        {variation.text}
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <Hash size={10} /> {variation.text.split(' ').length} palavras
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="premium-card h-[400px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Selecione uma Campanha</h3>
              <p className="text-sm text-slate-500 max-w-[300px]">Escolha uma campanha ao lado para gerenciar suas variações de mensagens.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {isCampaignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCampaignModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-xl font-bold text-slate-900">Nova Campanha</h3>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Campanha</label>
                  <input 
                    required
                    type="text" 
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="Ex: Prospecção Dentistas"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nicho</label>
                  <input 
                    type="text" 
                    value={newCampaign.niche}
                    onChange={e => setNewCampaign({...newCampaign, niche: e.target.value})}
                    placeholder="Ex: Odontologia"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-100">Criar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Variation Modal */}
      <AnimatePresence>
        {isVariationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVariationModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-xl font-bold text-slate-900">Nova Variação de Mensagem</h3>
              <p className="text-sm text-slate-500">
                Use tags como <code className="bg-slate-100 px-1 rounded">{"{nome}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{cidade}"}</code> e <code className="bg-slate-100 px-1 rounded">{"{instagram}"}</code> para personalizar.
              </p>
              <form onSubmit={handleAddVariation} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Texto da Mensagem</label>
                  <textarea 
                    required
                    value={newVariationText}
                    onChange={e => setNewVariationText(e.target.value)}
                    placeholder="Olá {nome}, vi que você é de {cidade}..."
                    className="w-full h-40 px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsVariationModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-100">Adicionar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { ChevronRight } from 'lucide-react';
