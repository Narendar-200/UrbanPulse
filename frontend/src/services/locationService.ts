import { supabase, type Location } from '../lib/supabase';

export const locationService = {
  async getAll(): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('city', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByZoneType(zoneType: 'residential' | 'commercial' | 'highway'): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('zone_type', zoneType)
      .order('city', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(location: Omit<Location, 'id' | 'created_at'>): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .insert([location])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<Location, 'id' | 'created_at'>>): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
