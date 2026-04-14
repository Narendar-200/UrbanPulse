import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, TrendingUp, Car, MapPin, Activity, Database } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { KPICard } from '../components/KPICard';
import { trafficService } from '../services/trafficService';
import { analyticsService } from '../services/analyticsService';

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#f1f5f9', fontWeight: 600 },
  itemStyle: { color: '#cbd5e1' },
};

export const Dashboard: React.FC = () => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [totalLogs, setTotalLogs] = useState(0);
  const [highCongestionLocations, setHighCongestionLocations] = useState(0);
  const [currentDensity, setCurrentDensity] = useState(0);
  const [simulationRecords, setSimulationRecords] = useState(0);

  const [densityTrend, setDensityTrend] = useState<any[]>([]);
  const [locationComparison, setLocationComparison] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: totalLogsCount },
        highCongestion,
        allLogs,
        busiest,
      ] = await Promise.all([
        trafficService.getAll(1, 0),
        trafficService.getHighCongestion(80),
        trafficService.getByDateRange(startDate.toISOString(), endDate.toISOString()),
        analyticsService.getBusiestLocations(7),
      ]);

      setTotalLogs(totalLogsCount);

      const uniqueLocations = new Set(highCongestion.map((log) => log.location_id));
      setHighCongestionLocations(uniqueLocations.size);

      if (allLogs.length > 0) {
        const avg = Math.round(allLogs.reduce((s, l) => s + l.density_level, 0) / allLogs.length);
        setCurrentDensity(avg);
      } else {
        setCurrentDensity(0);
      }

      setSimulationRecords(allLogs.filter((l) => l.data_source === 'simulated').length);

      if (selectedLocationId) {
        const locationData = await trafficService.getByLocationAndDateRange(
          selectedLocationId,
          startDate.toISOString(),
          endDate.toISOString()
        );
        const hourlyData: Record<number, number[]> = {};
        locationData.forEach((log) => {
          const hour = new Date(log.timestamp).getHours();
          if (!hourlyData[hour]) hourlyData[hour] = [];
          hourlyData[hour].push(log.density_level);
        });
        const trend = Array.from({ length: 24 }, (_, hour) => ({
          label: `${hour}:00`,
          density: hourlyData[hour]?.length
            ? Math.round(hourlyData[hour].reduce((a, b) => a + b, 0) / hourlyData[hour].length)
            : 0,
        }));
        setDensityTrend(trend);
      } else {
        const daily: Record<string, number[]> = {};
        allLogs.forEach((log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          if (!daily[date]) daily[date] = [];
          daily[date].push(log.density_level);
        });
        const trend = Object.entries(daily)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, densities]) => ({
            label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
          }));
        setDensityTrend(trend);
      }

      setLocationComparison(busiest.slice(0, 6).map((loc) => ({
        name: loc.location_name.split(' ').slice(0, 2).join(' '),
        density: loc.avg_density,
        records: loc.record_count,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  const kpiCards = [
    { title: 'Total Logs', value: totalLogs.toLocaleString(), subtitle: 'All time records', icon: <Database className="w-5 h-5" />, color: 'blue' as const },
    { title: 'High Congestion', value: highCongestionLocations, subtitle: 'Locations above 80%', icon: <AlertCircle className="w-5 h-5" />, trend: 'up' as const, trendValue: 'Active', color: 'red' as const },
    { title: 'Avg Density', value: `${currentDensity}%`, subtitle: 'In selected period', icon: <Activity className="w-5 h-5" />, color: 'amber' as const },
    { title: 'Simulated Records', value: simulationRecords.toLocaleString(), subtitle: 'From simulations', icon: <Car className="w-5 h-5" />, color: 'purple' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-slate-500">Real-time traffic monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-700">Live updates on</span>
        </div>
      </div>

      <FilterBar
        selectedLocationId={selectedLocationId}
        onLocationChange={setSelectedLocationId}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Failed to load data</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPICard key={card.title} {...card} loading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {selectedLocationId ? 'Hourly Density Pattern' : 'Daily Traffic Trend'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Traffic density over time</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : densityTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={densityTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}%`, 'Density']} />
                <Line
                  type="monotone"
                  dataKey="density"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <MapPin className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No data for this period</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Busiest Locations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Average density — last 7 days</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : locationComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationComparison} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}%`, 'Avg Density']} />
                <Bar dataKey="density" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Database className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No location data available</p>
              <p className="text-xs mt-1">Run a simulation to generate data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
