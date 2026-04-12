import { supabase, type TrafficLog } from '../lib/supabase';

export const trafficService = {
  async getAll(limit = 50, offset = 0): Promise<{ data: TrafficLog[]; count: number }> {
    const { data, error, count } = await supabase
      .from('traffic_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async getByLocation(locationId: string, limit = 100, offset = 0): Promise<TrafficLog[]> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .eq('location_id', locationId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<TrafficLog[]> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getByLocationAndDateRange(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<TrafficLog[]> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .eq('location_id', locationId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getLatestByLocation(locationId: string): Promise<TrafficLog | null> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .eq('location_id', locationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getHighCongestion(threshold = 80): Promise<TrafficLog[]> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .select('*')
      .gte('density_level', threshold)
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async create(log: Omit<TrafficLog, 'id' | 'created_at'>): Promise<TrafficLog> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .insert([log])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(logs: Omit<TrafficLog, 'id' | 'created_at'>[]): Promise<TrafficLog[]> {
    const { data, error } = await supabase
      .from('traffic_logs')
      .insert(logs)
      .select();
    if (error) throw error;
    return data || [];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('traffic_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteBySimulationRun(runId: string): Promise<number> {
    const { data: runData, error: runError } = await supabase
      .from('simulation_runs')
      .select('config')
      .eq('id', runId)
      .maybeSingle();
    if (runError) throw runError;

    if (!runData) return 0;

    const config = runData.config as { location_ids?: string[] };
    const locationIds = config.location_ids || [];

    const { count, error } = await supabase
      .from('traffic_logs')
      .delete()
      .eq('data_source', 'simulated')
      .in('location_id', locationIds);
    if (error) throw error;

    return count || 0;
  },
};
