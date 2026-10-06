import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Zap, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Instagram,
  Users as UsersIcon,
  MapPin,
  Info,
  Loader2,
  ChevronRight,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseRawText, ParsedLead } from '../lib/gemini';
import { collection, addDoc, Timestamp, onSnapshot, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { getSupabaseConfig, supabaseDb } from '../supabase';
import { toast } from 'sonner';
import { cn, calculateScore } from '../lib/utils';
import { ProspectBoard, MessageCampaign, MessageVariation } from '../types';

interface ImportProps {
  initialBoardId?: string | null;
}

export default function Import({ initialBoardId }: ImportProps) {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [boards, setBoards] = useState<ProspectBoard[]>([]);
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(initialBoardId || 'default');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('none');

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const isSupabase = getSupabaseConfig().isConfigured;

    if (isSupabase) {
      const unsubBoards = supabaseDb.subscribeBoards(uid, setBoards);
      const unsubCampaigns = supabaseDb.subscribeCampaigns(uid, setCampaigns);
      return () => {
        if (typeof unsubBoards === 'function') unsubBoards();
        if (typeof unsubCampaigns === 'function') unsubCampaigns();
      };
    }
    
    // Fetch Boards
    const qBoards = query(collection(db, 'boards'), where('ownerId', '==', uid));
    const unsubBoards = onSnapshot(qBoards, (snap) => {
      setBoards(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProspectBoard)));
    });

    // Fetch Campaigns
    const qCampaigns = query(collection(db, 'campaigns'), where('ownerId', '==', uid));
    const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageCampaign)));
    });

    return () => {
      unsubBoards();
      unsubCampaigns();
    };
  }, []);

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Por favor, cole algum texto para processar.');
      return;
    }

    setIsParsing(true);
    try {
      const results = await parseRawText(rawText);
      setParsedLeads(results);
      if (results.length > 0) {
        toast.success(`${results.length} perfis detectados!`);
      } else {
        toast.error('Nenhum perfil do Instagram detectado no texto.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar o texto.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleClear = () => {
    setRawText('');
    setParsedLeads([]);
  };

  const handleRemoveLead = (index: number) => {
    setParsedLeads(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveLeads = async () => {
    if (!auth.currentUser || parsedLeads.length === 0) return;
    if (selectedBoardId === 'default' && boards.length > 0) {
      toast.warning('Por favor, selecione um quadro para organizar seus leads.');
      return;
    }

    setIsSaving(true);
    try {
      const isSupabase = getSupabaseConfig().isConfigured;

      // Fetch variations if a campaign is selected
      let variations: string[] = [];
      if (selectedCampaignId !== 'none') {
        if (isSupabase) {
          const varList = await supabaseDb.getVariations(selectedCampaignId);
          variations = varList.filter(v => v.isActive).map(v => v.text);
        } else {
          const varSnap = await getDocs(query(
            collection(db, `campaigns/${selectedCampaignId}/variations`),
            where('ownerId', '==', auth.currentUser.uid),
            where('isActive', '==', true)
          ));
          variations = varSnap.docs.map(d => (d.data() as MessageVariation).text);
        }
      }

      const leadsToInsert = parsedLeads.map(lead => {
        const assignedMessage = variations.length > 0 
          ? variations[Math.floor(Math.random() * variations.length)]
          : undefined;

        return {
          boardId: selectedBoardId === 'default' ? null : selectedBoardId,
          ownerId: auth.currentUser!.uid,
          name: lead.profile_name || '',
          instagramHandle: lead.instagram_handle.replace('@', ''),
          instagramUrl: `https://instagram.com/${lead.instagram_handle.replace('@', '')}`,
          followersCount: lead.followers_count || 0,
          city: lead.city || '',
          bio: lead.bio || '',
          status: 'new' as const,
          score: calculateScore({
            instagramHandle: lead.instagram_handle,
            name: lead.profile_name,
            followersCount: lead.followers_count,
            city: lead.city,
            bio: lead.bio
          }),
          parsingConfidence: lead.parsing_confidence,
          tags: [],
          isFavorite: false,
          isAnalyzed: false,
          assignedMessage
        };
      });

      if (isSupabase) {
        await supabaseDb.createLeadsBulk(leadsToInsert);
        toast.success(`${parsedLeads.length} leads importados no Supabase com sucesso!`);
        setParsedLeads([]);
        setRawText('');
        return;
      }

      const leadsRef = collection(db, 'leads');
      const promises = leadsToInsert.map(leadData => {
        return addDoc(leadsRef, {
          ...leadData,
          createdAt: Timestamp.now()
        });
      });

      await Promise.all(promises);

      // Update lead count on board
      if (selectedBoardId !== 'default') {
        await updateDoc(doc(db, 'boards', selectedBoardId), {
          leadCount: increment(parsedLeads.length)
        });
      }

      toast.success(`${parsedLeads.length} leads importados com sucesso!`);
      setParsedLeads([]);
      setRawText('');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar os leads: ' + (error?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Importação de Dados</h2>
        <p className="text-slate-500">Transforme textos brutos do Google em leads organizados usando IA.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="premium-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <FileText size={18} className="text-brand-500" />
                <span>Texto Bruto</span>
              </div>
              <button 
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                Limpar
              </button>
            </div>
            
            <textarea 
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o texto copiado dos resultados de busca do Google..."
              className="w-full h-[250px] p-4 bg-slate-50 border-none rounded-xl text-sm font-mono resize-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Salvar no Quadro</label>
                <select 
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="default">Sem Quadro (Histórico Geral)</option>
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Campanha de Mensagens</label>
                <select 
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="none">Nenhuma (Sem mensagem)</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleParse}
                disabled={isParsing || !rawText.trim()}
                className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-100"
              >
                {isParsing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Processar com IA
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex gap-3">
            <Info className="text-brand-500 shrink-0" size={20} />
            <p className="text-xs text-brand-700 leading-relaxed">
              <strong>Dica:</strong> Copie toda a página de resultados do Google (Ctrl+A, Ctrl+C) e cole aqui. Nossa IA irá filtrar automaticamente os perfis do Instagram, nomes, seguidores e bios.
            </p>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <div className="premium-card h-[535px] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Eye size={18} className="text-brand-500" />
                <span>Prévia do Parsing</span>
                <span className="ml-2 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full">
                  {parsedLeads.length} perfis
                </span>
              </div>
              {parsedLeads.length > 0 && (
                <button 
                  onClick={handleSaveLeads}
                  disabled={isSaving}
                  className="text-sm bg-slate-900 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Importar Tudo
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {parsedLeads.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Zap size={32} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-sm">Aguardando processamento...</p>
                  </div>
                ) : (
                  parsedLeads.map((lead, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-brand-200 transition-all group relative"
                    >
                      <button 
                        onClick={() => handleRemoveLead(idx)}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 shrink-0">
                          <Instagram size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 truncate">{lead.profile_name || 'Sem nome'}</h4>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                              lead.parsing_confidence > 0.8 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {Math.round(lead.parsing_confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-brand-600 font-mono text-sm font-semibold mb-2">@{lead.instagram_handle.replace('@', '')}</p>
                          
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <UsersIcon size={12} />
                              {lead.followers_count ? lead.followers_count.toLocaleString() : '?'}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              {lead.city || 'Local não detectado'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
