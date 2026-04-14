import { apiRequest } from "./apiClient";

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
    return apiRequest<HourlyAggregate[]>(`/analytics/peak-traffic-hours/${locationId}?days=${days}`);
  },

  async getBusiestLocations(days = 7): Promise<LocationAggregate[]> {
    return apiRequest<LocationAggregate[]>(`/analytics/busiest-locations?days=${days}`);
  },

  async getDailyTrend(locationId: string, days = 7): Promise<DailyTrend[]> {
    return apiRequest<DailyTrend[]>(`/analytics/daily-trend/${locationId}?days=${days}`);
  },

  async getWeeklyHeatmap(locationId: string, weeks = 4): Promise<WeeklyHeatmapCell[]> {
    const hourly = await apiRequest<HourlyAggregate[]>(`/analytics/peak-traffic-hours/${locationId}?days=${weeks * 7}`);
    return hourly.flatMap((point) => ({
      day_of_week: 0,
      hour: point.hour,
      avg_density: point.avg_density,
    }));
  },

  async getPeakHourInsights(locationId: string, days = 7): Promise<PeakHourInsight> {
    return apiRequest<PeakHourInsight>(`/analytics/peak-hour-insights/${locationId}?days=${days}`);
  },

  async getBestTravelTimes(locationId: string, days = 14): Promise<BestTravelTime> {
    const hourlyData = await this.getPeakTrafficHours(locationId, days);
    const sortedByDensity = [...hourlyData].sort((a, b) => a.avg_density - b.avg_density);
    const bestTimes = sortedByDensity.slice(0, 3).map((h) => ({
      hour: h.hour,
      avg_density: h.avg_density,
      day_pattern: 'All days',
    }));

    return {
      location_id: locationId,
      location_name: "Unknown",
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
      const response = await apiRequest<{ data: Array<{ timestamp: string; density_level: number }> }>(
        `/traffic?locationId=${locationId}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&limit=10000&offset=0`
      );
      const groups = new Map<number, number[]>();
      response.data.forEach((log) => {
        const hour = new Date(log.timestamp).getHours();
        const values = groups.get(hour) || [];
        values.push(log.density_level);
        groups.set(hour, values);
      });
      const result: HourlyAggregate[] = [];
      for (let hour = 0; hour < 24; hour += 1) {
        const values = groups.get(hour) || [0];
        result.push({
          hour,
          avg_density: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          max_density: Math.max(...values),
          min_density: Math.min(...values),
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
