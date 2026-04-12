import { supabase } from '../lib/supabase';

export type HourlyAggregate = {
  hour: number;
  avg_density: number;
  max_density: number;
  min_density: number;
};

export type LocationAggregate = {
  location_id: string;
  location_name: string;
  avg_density: number;
  max_density: number;
  record_count: number;
};

export type DailyTrend = {
  date: string;
  avg_density: number;
};

export type WeeklyHeatmapCell = {
  day_of_week: number;
  hour: number;
  avg_density: number;
};

export type PeakHourInsight = {
  location_id: string;
  location_name: string;
  peak_hour: number;
  peak_density: number;
  low_hour: number;
  low_density: number;
};

export type BestTravelTime = {
  location_id: string;
  location_name: string;
  best_times: Array<{
    hour: number;
    avg_density: number;
    day_pattern: string;
  }>;
};

export const analyticsService = {
  async getPeakTrafficHours(locationId: string, days = 7): Promise<HourlyAggregate[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error } = await supabase
      .from('traffic_logs')
      .select('timestamp, density_level')
      .eq('location_id', locationId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const hourlyData = new Map<number, number[]>();

    (logs || []).forEach((log: { timestamp: string; density_level: number }) => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(log.density_level);
    });

    const result: HourlyAggregate[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const densities = hourlyData.get(hour) || [0];
      result.push({
        hour,
        avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
        max_density: Math.max(...densities),
        min_density: Math.min(...densities),
      });
    }

    return result;
  },

  async getBusiestLocations(days = 7): Promise<LocationAggregate[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error } = await supabase
      .from('traffic_logs')
      .select('location_id, density_level')
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name');

    if (locError) throw locError;

    const locationMap = new Map((locations || []).map((l: any) => [l.id, l.name]));
    const locationStats = new Map<string, { densities: number[]; count: number }>();

    (logs || []).forEach((log: { location_id: string; density_level: number }) => {
      if (!locationStats.has(log.location_id)) {
        locationStats.set(log.location_id, { densities: [], count: 0 });
      }
      locationStats.get(log.location_id)!.densities.push(log.density_level);
      locationStats.get(log.location_id)!.count += 1;
    });

    const result: LocationAggregate[] = [];
    locationStats.forEach((stats, locationId) => {
      result.push({
        location_id: locationId,
        location_name: locationMap.get(locationId) || 'Unknown',
        avg_density: Math.round(stats.densities.reduce((a, b) => a + b, 0) / stats.densities.length),
        max_density: Math.max(...stats.densities),
        record_count: stats.count,
      });
    });

    return result.sort((a, b) => b.avg_density - a.avg_density);
  },

  async getDailyTrend(locationId: string, days = 7): Promise<DailyTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error } = await supabase
      .from('traffic_logs')
      .select('timestamp, density_level')
      .eq('location_id', locationId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const dailyData = new Map<string, number[]>();

    (logs || []).forEach((log: { timestamp: string; density_level: number }) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(log.density_level);
    });

    const result: DailyTrend[] = [];
    const sortedDates = Array.from(dailyData.keys()).sort();

    sortedDates.forEach((date) => {
      const densities = dailyData.get(date)!;
      result.push({
        date,
        avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
      });
    });

    return result;
  },

  async getWeeklyHeatmap(locationId: string, weeks = 4): Promise<WeeklyHeatmapCell[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const { data: logs, error } = await supabase
      .from('traffic_logs')
      .select('timestamp, density_level')
      .eq('location_id', locationId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const heatmapData = new Map<string, number[]>();

    (logs || []).forEach((log: { timestamp: string; density_level: number }) => {
      const date = new Date(log.timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const key = `${dayOfWeek}_${hour}`;

      if (!heatmapData.has(key)) {
        heatmapData.set(key, []);
      }
      heatmapData.get(key)!.push(log.density_level);
    });

    const result: WeeklyHeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}_${hour}`;
        const densities = heatmapData.get(key) || [0];
        result.push({
          day_of_week: day,
          hour,
          avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
        });
      }
    }

    return result;
  },

  async getPeakHourInsights(locationId: string, days = 7): Promise<PeakHourInsight> {
    const hourlyData = await this.getPeakTrafficHours(locationId, days);
    const locationName = await supabase
      .from('locations')
      .select('name')
      .eq('id', locationId)
      .maybeSingle();

    const peakHour = hourlyData.reduce((max, curr) =>
      curr.avg_density > max.avg_density ? curr : max
    );
    const lowHour = hourlyData.reduce((min, curr) =>
      curr.avg_density < min.avg_density ? curr : min
    );

    return {
      location_id: locationId,
      location_name: locationName.data?.name || 'Unknown',
      peak_hour: peakHour.hour,
      peak_density: peakHour.avg_density,
      low_hour: lowHour.hour,
      low_density: lowHour.avg_density,
    };
  },

  async getBestTravelTimes(locationId: string, days = 14): Promise<BestTravelTime> {
    const hourlyData = await this.getPeakTrafficHours(locationId, days);
    const sortedByDensity = [...hourlyData].sort((a, b) => a.avg_density - b.avg_density);
    const bestTimes = sortedByDensity.slice(0, 3).map((h) => ({
      hour: h.hour,
      avg_density: h.avg_density,
      day_pattern: 'All days',
    }));

    const locationName = await supabase
      .from('locations')
      .select('name')
      .eq('id', locationId)
      .maybeSingle();

    return {
      location_id: locationId,
      location_name: locationName.data?.name || 'Unknown',
      best_times: bestTimes,
    };
  },

  async compareLocations(locationIds: string[], days = 7): Promise<Map<string, HourlyAggregate[]>> {
    const result = new Map<string, HourlyAggregate[]>();

    for (const locationId of locationIds) {
      const hourlyData = await this.getPeakTrafficHours(locationId, days);
      result.set(locationId, hourlyData);
    }

    return result;
  },

  async compareDateRanges(
    locationId: string,
    startDate1: string,
    endDate1: string,
    startDate2: string,
    endDate2: string
  ): Promise<{
    period1: HourlyAggregate[];
    period2: HourlyAggregate[];
  }> {
    const getHourlyData = async (start: string, end: string): Promise<HourlyAggregate[]> => {
      const { data: logs, error } = await supabase
        .from('traffic_logs')
        .select('timestamp, density_level')
        .eq('location_id', locationId)
        .gte('timestamp', start)
        .lte('timestamp', end);

      if (error) throw error;

      const hourlyData = new Map<number, number[]>();

      (logs || []).forEach((log: { timestamp: string; density_level: number }) => {
        const hour = new Date(log.timestamp).getHours();
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, []);
        }
        hourlyData.get(hour)!.push(log.density_level);
      });

      const result: HourlyAggregate[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const densities = hourlyData.get(hour) || [0];
        result.push({
          hour,
          avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
          max_density: Math.max(...densities),
          min_density: Math.min(...densities),
        });
      }

      return result;
    };

    return {
      period1: await getHourlyData(startDate1, endDate1),
      period2: await getHourlyData(startDate2, endDate2),
    };
  },
};
