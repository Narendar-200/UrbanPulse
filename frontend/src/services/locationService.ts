import type { Location } from "../lib/supabase";
import { apiRequest } from "./apiClient";

export const locationService = {
  async getAll(): Promise<Location[]> {
    return apiRequest<Location[]>("/locations");
  },

  async getById(id: string): Promise<Location | null> {
    return apiRequest<Location | null>(`/locations/${id}`);
  },

  async getByZoneType(zoneType: 'residential' | 'commercial' | 'highway'): Promise<Location[]> {
    return apiRequest<Location[]>(`/locations?zoneType=${zoneType}`);
  },

  async create(location: Omit<Location, 'id' | 'created_at'>): Promise<Location> {
    // Requested flow: create new locations through /api/traffic.
    return apiRequest<Location>("/traffic", { method: "POST", body: location });
  },

  async update(id: string, updates: Partial<Omit<Location, 'id' | 'created_at'>>): Promise<Location> {
    return apiRequest<Location>(`/locations/${id}`, { method: "PUT", body: updates });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/locations/${id}`, { method: "DELETE" });
  },
};
