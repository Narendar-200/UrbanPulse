import { supabase, type TrafficLog } from '../lib/supabase';
import { trafficService } from './trafficService';

export type SimulationConfig = {
  location_ids: string[];
  start_date: string;
  end_date: string;
  interval_minutes: number;
  noise_factor: number;
};

const getTrafficRules = (hour: number, dayOfWeek: number, zoneType: string): number => {
  let baseDensity = 20;

  if (hour >= 7 && hour < 10) {
    baseDensity = 80;
  } else if (hour >= 11 && hour < 15) {
    baseDensity = 35;
  } else if (hour >= 16 && hour < 20) {
    baseDensity = 75;
  } else if (hour >= 20 || hour < 6) {
    baseDensity = 15;
  }

  const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0;
  let zoneMultiplier = 1.0;
  if (zoneType === 'highway') zoneMultiplier = 1.3;
  if (zoneType === 'residential') zoneMultiplier = 0.7;

  return Math.round(baseDensity * weekendFactor * zoneMultiplier);
};

const getCongestionStatus = (density: number): TrafficLog['congestion_status'] => {
  if (density < 30) return 'low';
  if (density < 60) return 'moderate';
  if (density < 85) return 'high';
  return 'critical';
};

export const simulationService = {
  async generateTrafficData(config: SimulationConfig, locations: Array<{ id: string; zone_type: string }>): Promise<Omit<TrafficLog, 'id' | 'created_at'>[]> {
    const logs: Omit<TrafficLog, 'id' | 'created_at'>[] = [];
    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      for (const location of locations) {
        const hour = currentDate.getHours();
        const dayOfWeek = currentDate.getDay();

        const baseDensity = getTrafficRules(hour, dayOfWeek, location.zone_type);
        const noise = (Math.random() - 0.5) * (config.noise_factor * 20);
        const density = Math.max(0, Math.min(100, baseDensity + noise));
        const densityLevel = Math.round(density);

        logs.push({
          location_id: location.id,
          timestamp: currentDate.toISOString(),
          density_level: densityLevel,
          vehicle_count: Math.round(densityLevel * 50 + Math.random() * 50),
          congestion_status: getCongestionStatus(densityLevel),
          data_source: 'simulated',
        });
      }

      currentDate.setMinutes(currentDate.getMinutes() + config.interval_minutes);
    }

    return logs;
  },

  async runSimulation(
    runName: string,
    config: SimulationConfig,
    locations: Array<{ id: string; zone_type: string }>
  ): Promise<{ runId: string; recordsCreated: number }> {
    const startTime = new Date().toISOString();

    const trafficData = await this.generateTrafficData(config, locations);

    if (trafficData.length === 0) {
      throw new Error('No traffic data generated');
    }

    const batchSize = 500;
    let totalCreated = 0;

    for (let i = 0; i < trafficData.length; i += batchSize) {
      const batch = trafficData.slice(i, i + batchSize);
      const created = await trafficService.bulkCreate(batch);
      totalCreated += created.length;
    }

    const { data: runData, error } = await supabase
      .from('simulation_runs')
      .insert([
        {
          run_name: runName,
          started_at: startTime,
          ended_at: new Date().toISOString(),
          config,
          records_generated: totalCreated,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      runId: runData.id,
      recordsCreated: totalCreated,
    };
  },
};
