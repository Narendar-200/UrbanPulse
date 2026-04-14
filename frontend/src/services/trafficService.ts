import type { TrafficLog } from "../lib/supabase";
import { apiRequest, API_BASE_URL } from "./apiClient";

export const trafficService = {
  getLiveStreamUrl(): string {
    return `${API_BASE_URL}/traffic/stream`;
  },

  async getAll(limit = 50, offset = 0): Promise<{ data: TrafficLog[]; count: number }> {
    return apiRequest<{ data: TrafficLog[]; count: number }>(`/traffic?limit=${limit}&offset=${offset}`);
  },

  async getByLocation(locationId: string, limit = 100, offset = 0): Promise<TrafficLog[]> {
    const response = await apiRequest<{ data: TrafficLog[]; count: number }>(
      `/traffic?locationId=${locationId}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<TrafficLog[]> {
    const response = await apiRequest<{ data: TrafficLog[]; count: number }>(
      `/traffic?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=10000&offset=0`
    );
    return response.data.reverse();
  },

  async getByLocationAndDateRange(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<TrafficLog[]> {
    const response = await apiRequest<{ data: TrafficLog[]; count: number }>(
      `/traffic?locationId=${locationId}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=10000&offset=0`
    );
    return response.data.reverse();
  },

  async getLatestByLocation(locationId: string): Promise<TrafficLog | null> {
    return apiRequest<TrafficLog | null>(`/traffic/latest/${locationId}`);
  },

  async getHighCongestion(threshold = 80): Promise<TrafficLog[]> {
    const response = await apiRequest<{ data: TrafficLog[]; count: number }>(
      `/traffic?threshold=${threshold}&limit=100&offset=0`
    );
    return response.data;
  },

  async create(log: Omit<TrafficLog, 'id' | 'created_at'>): Promise<TrafficLog> {
    return apiRequest<TrafficLog>("/traffic", { method: "POST", body: log });
  },

  async bulkCreate(logs: Omit<TrafficLog, 'id' | 'created_at'>[]): Promise<TrafficLog[]> {
    return apiRequest<TrafficLog[]>("/traffic/bulk", { method: "POST", body: { logs } });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/traffic/${id}`, { method: "DELETE" });
  },

  async deleteBySimulationRun(runId: string): Promise<number> {
    const response = await apiRequest<{ deleted: number }>(`/simulations/${runId}/data`, { method: "DELETE" });
    return response.deleted;
  },
};
