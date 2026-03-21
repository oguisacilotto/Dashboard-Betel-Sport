import { createClient } from '@supabase/supabase-js';
import type { Analysis, Profile, ShareRecord } from '../types';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Auth ──────────────────────────────────────────────
export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUp = (email: string, password: string, name: string) =>
  supabase.auth.signUp({ email, password, options: { data: { name } } });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

// ── Profile ───────────────────────────────────────────
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  return supabase.from('profiles').update(updates).eq('id', userId);
};

// ── Analyses ──────────────────────────────────────────
export const listAnalyses = async (userId: string, limit = 20, offset = 0) => {
  return supabase
    .from('analyses')
    .select('id, title, source_type, source_name, is_public, telegram_sent, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
};

export const getAnalysis = async (id: string): Promise<Analysis | null> => {
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();
  return data;
};

export const getAnalysisByToken = async (token: string): Promise<Analysis | null> => {
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('public_token', token)
    .eq('is_public', true)
    .single();
  return data;
};

export const createAnalysis = async (analysis: Partial<Analysis>) => {
  return supabase.from('analyses').insert(analysis).select().single();
};

export const updateAnalysis = async (id: string, updates: Partial<Analysis>) => {
  return supabase.from('analyses').update(updates).eq('id', id).select().single();
};

export const deleteAnalysis = async (id: string) => {
  return supabase.from('analyses').delete().eq('id', id);
};

export const togglePublic = async (id: string, isPublic: boolean) => {
  return supabase.from('analyses').update({ is_public: isPublic }).eq('id', id);
};

// ── Share History ─────────────────────────────────────
export const addShareRecord = async (record: Partial<ShareRecord>) => {
  return supabase.from('share_history').insert(record);
};

export const getShareHistory = async (analysisId: string) => {
  return supabase
    .from('share_history')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false });
};
