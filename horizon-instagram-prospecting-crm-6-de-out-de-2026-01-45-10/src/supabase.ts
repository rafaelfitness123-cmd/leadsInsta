import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProspectBoard, Lead, MessageCampaign, MessageVariation, LeadHistory, UserProfile } from './types';

// Helper to convert any date or timestamp to a Firestore-compatible Timestamp object with .toDate()
export function makeTimestamp(dateValue?: string | number | Date | null) {
  const d = dateValue ? new Date(dateValue) : new Date();
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  return {
    toDate: () => safeDate,
    toISOString: () => safeDate.toISOString(),
    seconds: Math.floor(safeDate.getTime() / 1000),
    nanoseconds: 0
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? (localStorage.getItem('supabase_url') || '') : '';
  const localKey = typeof window !== 'undefined' ? (localStorage.getItem('supabase_anon_key') || '') : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 10)
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_url', url.trim());
    localStorage.setItem('supabase_anon_key', anonKey.trim());
  }
  _cachedClient = null;
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
  }
  _cachedClient = null;
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    _cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return _cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

// Test connection to Supabase and check if tables exist
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<{ success: boolean; message: string; tablesFound?: boolean }> {
  try {
    const url = (overrideUrl || getSupabaseConfig().url).trim();
    const key = (overrideKey || getSupabaseConfig().anonKey).trim();

    if (!url || !key) {
      return { success: false, message: 'URL ou Chave Anon não informadas.' };
    }

    const testClient = createClient(url, key);
    
    // Tenta consultar a tabela boards
    const { data, error } = await testClient.from('boards').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.boards" does not exist') || error.message.includes('does not exist')) {
        return { 
          success: true, 
          tablesFound: false, 
          message: 'Conectado ao Supabase com sucesso! Porém as tabelas ainda não foram criadas. Execute o script SQL no Supabase SQL Editor.' 
        };
      }
      return { success: false, message: `Erro ao consultar Supabase: ${error.message} (${error.code || ''})` };
    }

    return { 
      success: true, 
      tablesFound: true, 
      message: 'Conexão estabelecida com sucesso! Tabelas verificadas e prontas para uso.' 
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha na conexão com o Supabase.' };
  }
}

// ==========================================
// MAPPERS: Supabase snake_case <-> App camelCase
// ==========================================

export function mapBoardFromSupabase(row: any): ProspectBoard {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    subtitle: row.subtitle || '',
    niche: row.niche || '',
    description: row.description || '',
    color: row.color || '#4f46e5',
    messageCampaignId: row.message_campaign_id || undefined,
    leadCount: Number(row.lead_count || 0),
    responseRate: Number(row.response_rate || 0),
    createdAt: makeTimestamp(row.created_at) as any
  };
}

export function mapLeadFromSupabase(row: any): Lead {
  return {
    id: row.id,
    boardId: row.board_id,
    ownerId: row.owner_id,
    name: row.name || undefined,
    instagramHandle: row.instagram_handle,
    instagramUrl: row.instagram_url || undefined,
    followersCount: row.followers_count ? Number(row.followers_count) : undefined,
    city: row.city || undefined,
    bio: row.bio || undefined,
    status: row.status || 'new',
    score: Number(row.score || 0),
    parsingConfidence: Number(row.parsing_confidence || 0),
    tags: Array.isArray(row.tags) ? row.tags : [],
    isFavorite: Boolean(row.is_favorite),
    isAnalyzed: Boolean(row.is_analyzed),
    lastContactedAt: row.last_contacted_at ? makeTimestamp(row.last_contacted_at) as any : undefined,
    nextFollowUpAt: row.next_follow_up_at ? makeTimestamp(row.next_follow_up_at) as any : undefined,
    notes: row.notes || undefined,
    assignedMessage: row.assigned_message || undefined,
    createdAt: makeTimestamp(row.created_at) as any
  };
}

export function mapCampaignFromSupabase(row: any): MessageCampaign {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    niche: row.niche || '',
    isActive: Boolean(row.is_active)
  };
}

export function mapVariationFromSupabase(row: any): MessageVariation {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    ownerId: row.owner_id,
    title: row.title,
    text: row.text,
    isActive: Boolean(row.is_active)
  };
}

export function mapHistoryFromSupabase(row: any): LeadHistory {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    content: row.content,
    variationId: row.variation_id || undefined,
    createdAt: makeTimestamp(row.created_at) as any
  };
}

// ==========================================
// SERVIÇO UNIFICADO DE OPERAÇÕES SUPABASE (CRUD & REALTIME)
// ==========================================

export const supabaseDb = {
  // Boards
  async getBoards(ownerId: string): Promise<ProspectBoard[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('boards')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapBoardFromSupabase);
  },

  async createBoard(board: { name: string; subtitle?: string; niche?: string; description?: string; color?: string; ownerId: string }) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { data, error } = await client.from('boards').insert({
      owner_id: board.ownerId,
      name: board.name,
      subtitle: board.subtitle || null,
      niche: board.niche || null,
      description: board.description || null,
      color: board.color || '#4f46e5',
      lead_count: 0,
      response_rate: 0
    }).select().single();

    if (error) throw error;
    return mapBoardFromSupabase(data);
  },

  async updateBoard(id: string, updates: Partial<ProspectBoard>) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
    if (updates.niche !== undefined) payload.niche = updates.niche;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.leadCount !== undefined) payload.lead_count = updates.leadCount;
    if (updates.responseRate !== undefined) payload.response_rate = updates.responseRate;

    const { data, error } = await client.from('boards').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return mapBoardFromSupabase(data);
  },

  async deleteBoard(id: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { error } = await client.from('boards').delete().eq('id', id);
    if (error) throw error;
  },

  subscribeBoards(ownerId: string, callback: (boards: ProspectBoard[]) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    // Initial fetch
    this.getBoards(ownerId).then(callback).catch(console.error);

    const channel = client.channel(`boards_${ownerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `owner_id=eq.${ownerId}` }, () => {
        this.getBoards(ownerId).then(callback).catch(console.error);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // Leads
  async getLeads(ownerId: string, boardId?: string | null): Promise<Lead[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    let query = client
      .from('leads')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapLeadFromSupabase);
  },

  async getLead(id: string): Promise<Lead | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.from('leads').select('*').eq('id', id).single();
    if (error) return null;
    return mapLeadFromSupabase(data);
  },

  async createLead(leadData: any) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');

    const payload = {
      board_id: leadData.boardId || null,
      owner_id: leadData.ownerId,
      name: leadData.name || null,
      instagram_handle: leadData.instagramHandle,
      instagram_url: leadData.instagramUrl || null,
      followers_count: leadData.followersCount || 0,
      city: leadData.city || null,
      bio: leadData.bio || null,
      status: leadData.status || 'new',
      score: leadData.score || 0,
      parsing_confidence: leadData.parsingConfidence || 0,
      tags: leadData.tags || [],
      is_favorite: Boolean(leadData.isFavorite),
      is_analyzed: Boolean(leadData.isAnalyzed),
      notes: leadData.notes || null,
      assigned_message: leadData.assignedMessage || null
    };

    const { data, error } = await client.from('leads').insert(payload).select().single();
    if (error) throw error;

    // Increment lead count on board
    if (leadData.boardId) {
      try {
        const { count } = await client.from('leads').select('*', { count: 'exact', head: true }).eq('board_id', leadData.boardId);
        if (count !== null) {
          await client.from('boards').update({ lead_count: count }).eq('id', leadData.boardId);
        }
      } catch (err) {
        console.error('Error updating board lead count:', err);
      }
    }

    return mapLeadFromSupabase(data);
  },

  async createLeadsBulk(leadsData: any[]) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    if (leadsData.length === 0) return [];

    const payloads = leadsData.map(lead => ({
      board_id: lead.boardId || null,
      owner_id: lead.ownerId,
      name: lead.name || null,
      instagram_handle: lead.instagramHandle,
      instagram_url: lead.instagramUrl || null,
      followers_count: lead.followersCount || 0,
      city: lead.city || null,
      bio: lead.bio || null,
      status: lead.status || 'new',
      score: lead.score || 0,
      parsing_confidence: lead.parsingConfidence || 0,
      tags: lead.tags || [],
      is_favorite: Boolean(lead.isFavorite),
      is_analyzed: Boolean(lead.isAnalyzed),
      notes: lead.notes || null,
      assigned_message: lead.assignedMessage || null
    }));

    const { data, error } = await client.from('leads').insert(payloads).select();
    if (error) throw error;

    // Update board count
    const boardIds = Array.from(new Set(leadsData.map(l => l.boardId).filter(Boolean)));
    for (const bId of boardIds) {
      const { count } = await client.from('leads').select('*', { count: 'exact', head: true }).eq('board_id', bId);
      if (count !== null) {
        await client.from('boards').update({ lead_count: count }).eq('id', bId);
      }
    }

    return (data || []).map(mapLeadFromSupabase);
  },

  async updateLead(id: string, updates: Partial<Lead>) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.instagramHandle !== undefined) payload.instagram_handle = updates.instagramHandle;
    if (updates.instagramUrl !== undefined) payload.instagram_url = updates.instagramUrl;
    if (updates.followersCount !== undefined) payload.followers_count = updates.followersCount;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.score !== undefined) payload.score = updates.score;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.isFavorite !== undefined) payload.is_favorite = updates.isFavorite;
    if (updates.isAnalyzed !== undefined) payload.is_analyzed = updates.isAnalyzed;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.assignedMessage !== undefined) payload.assigned_message = updates.assignedMessage;
    if (updates.boardId !== undefined) payload.board_id = updates.boardId;
    if (updates.lastContactedAt !== undefined) payload.last_contacted_at = new Date().toISOString();
    if (updates.nextFollowUpAt !== undefined) payload.next_follow_up_at = updates.nextFollowUpAt ? new Date(updates.nextFollowUpAt as any).toISOString() : null;

    const { data, error } = await client.from('leads').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return mapLeadFromSupabase(data);
  },

  async updateLeadsBulk(ids: string[], updates: Partial<Lead>) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    if (ids.length === 0) return;

    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isAnalyzed !== undefined) payload.is_analyzed = updates.isAnalyzed;
    if (updates.isFavorite !== undefined) payload.is_favorite = updates.isFavorite;

    const { error } = await client.from('leads').update(payload).in('id', ids);
    if (error) throw error;
  },

  async deleteLead(id: string, boardId?: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { error } = await client.from('leads').delete().eq('id', id);
    if (error) throw error;

    if (boardId) {
      const { count } = await client.from('leads').select('*', { count: 'exact', head: true }).eq('board_id', boardId);
      if (count !== null) {
        await client.from('boards').update({ lead_count: count }).eq('id', boardId);
      }
    }
  },

  async deleteLeadsBulk(ids: string[]) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    if (ids.length === 0) return;

    const { error } = await client.from('leads').delete().in('id', ids);
    if (error) throw error;
  },

  subscribeLeads(ownerId: string, boardId: string | null | undefined, callback: (leads: Lead[]) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    this.getLeads(ownerId, boardId).then(callback).catch(console.error);

    const channelName = `leads_${ownerId}_${boardId || 'all'}`;
    const channel = client.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `owner_id=eq.${ownerId}` }, () => {
        this.getLeads(ownerId, boardId).then(callback).catch(console.error);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // Campaigns
  async getCampaigns(ownerId: string): Promise<MessageCampaign[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('campaigns')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapCampaignFromSupabase);
  },

  async createCampaign(campaign: { name: string; niche?: string; ownerId: string }) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { data, error } = await client.from('campaigns').insert({
      owner_id: campaign.ownerId,
      name: campaign.name,
      niche: campaign.niche || null,
      is_active: true
    }).select().single();

    if (error) throw error;
    return mapCampaignFromSupabase(data);
  },

  async deleteCampaign(id: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { error } = await client.from('campaigns').delete().eq('id', id);
    if (error) throw error;
  },

  subscribeCampaigns(ownerId: string, callback: (campaigns: MessageCampaign[]) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    this.getCampaigns(ownerId).then(callback).catch(console.error);

    const channel = client.channel(`campaigns_${ownerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `owner_id=eq.${ownerId}` }, () => {
        this.getCampaigns(ownerId).then(callback).catch(console.error);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // Variations
  async getVariations(campaignId: string): Promise<MessageVariation[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('message_variations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapVariationFromSupabase);
  },

  async createVariation(variation: { campaignId: string; title: string; text: string; ownerId: string }) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { data, error } = await client.from('message_variations').insert({
      campaign_id: variation.campaignId,
      owner_id: variation.ownerId,
      title: variation.title,
      text: variation.text,
      is_active: true
    }).select().single();

    if (error) throw error;
    return mapVariationFromSupabase(data);
  },

  async deleteVariation(id: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { error } = await client.from('message_variations').delete().eq('id', id);
    if (error) throw error;
  },

  subscribeVariations(campaignId: string, callback: (variations: MessageVariation[]) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    this.getVariations(campaignId).then(callback).catch(console.error);

    const channel = client.channel(`variations_${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_variations', filter: `campaign_id=eq.${campaignId}` }, () => {
        this.getVariations(campaignId).then(callback).catch(console.error);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // Lead History
  async getLeadHistory(leadId: string): Promise<LeadHistory[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('lead_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapHistoryFromSupabase);
  },

  async addLeadHistory(history: { leadId: string; type: string; content: string; variationId?: string }) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const { data, error } = await client.from('lead_history').insert({
      lead_id: history.leadId,
      type: history.type,
      content: history.content,
      variation_id: history.variationId || null
    }).select().single();

    if (error) throw error;
    return mapHistoryFromSupabase(data);
  },

  subscribeLeadHistory(leadId: string, callback: (history: LeadHistory[]) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    this.getLeadHistory(leadId).then(callback).catch(console.error);

    const channel = client.channel(`history_${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_history', filter: `lead_id=eq.${leadId}` }, () => {
        this.getLeadHistory(leadId).then(callback).catch(console.error);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // User Profile
  async getUserProfile(uid: string): Promise<any | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.from('profiles').select('*').eq('id', uid).single();
    if (error) return null;
    return {
      uid: data.id,
      email: data.email,
      displayName: data.display_name,
      photoURL: data.photo_url,
      role: data.role,
      theme: data.theme,
      notifications: data.notifications,
      autoParse: data.auto_parse,
      defaultNiche: data.default_niche,
      instagramLink: data.instagram_link,
      twoFactor: data.two_factor,
      language: data.language,
      privacyMode: data.privacy_mode
    };
  },

  async saveUserProfile(uid: string, profile: any) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não conectado.');
    const payload: any = {
      id: uid,
      email: profile.email || null,
      display_name: profile.displayName || null,
      photo_url: profile.photoURL || null,
      theme: profile.theme || 'light',
      notifications: profile.notifications !== undefined ? profile.notifications : true,
      auto_parse: profile.autoParse !== undefined ? profile.autoParse : true,
      default_niche: profile.defaultNiche || 'Estética',
      instagram_link: profile.instagramLink || '',
      two_factor: profile.twoFactor || false,
      language: profile.language || 'pt-BR',
      privacy_mode: profile.privacyMode || false
    };

    const { error } = await client.from('profiles').upsert(payload);
    if (error) throw error;
  }
};
