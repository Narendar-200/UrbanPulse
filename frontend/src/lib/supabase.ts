import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const safeSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeSupabaseAnonKey = supabaseAnonKey || 'placeholder-key';

if (!isSupabaseConfigured) {
  // Prevent frontend crash due to missing env while keeping normal auth flow behavior.
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend environment.');
}

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey);

export type Location = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  zone_type: 'residential' | 'commercial' | 'highway';
  created_at: string;
};

export type TrafficLog = {
  id: string;
  location_id: string;
  timestamp: string;
  density_level: number;
  vehicle_count: number;
  congestion_status: 'low' | 'moderate' | 'high' | 'critical';
  data_source: 'manual' | 'simulated';
  created_at: string;
};

export type SimulationRun = {
  id: string;
  run_name: string;
  started_at: string;
  ended_at: string | null;
  config: Record<string, unknown>;
  records_generated: number;
  created_at: string;
};
