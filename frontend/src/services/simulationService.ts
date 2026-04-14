import { apiRequest } from "./apiClient";

export type SimulationConfig = {
  location_ids: string[];
  start_date: string;
  end_date: string;
  interval_minutes: number;
  noise_factor: number;
};

export type LiveSimulationPoint = {
  area: string;
  location_id: string;
  traffic_level: "low" | "moderate" | "high" | "critical";
  density_level: number;
  vehicles: number;
  timestamp: string;
};

export const simulationService = {
  async getRecentRuns(): Promise<Array<{ id: string; run_name: string; records_generated: number; created_at: string }>> {
    return apiRequest<Array<{ id: string; run_name: string; records_generated: number; created_at: string }>>(
      "/simulation-runs"
    );
  },

  async getLiveSimulation(): Promise<{ data: LiveSimulationPoint[]; generated_at: string }> {
    return apiRequest<{ data: LiveSimulationPoint[]; generated_at: string }>("/simulate");
  },

  async runSimulation(
    runName: string,
    config: SimulationConfig,
    locations: Array<{ id: string; zone_type: string }>
  ): Promise<{ runId: string; recordsCreated: number }> {
    return apiRequest<{ runId: string; recordsCreated: number }>("/simulations/run", {
      method: "POST",
      body: { runName, config, locations },
    });
  },
};
