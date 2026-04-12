import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart2, AlertCircle, Info } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import {
  analyticsService,
  type HourlyAggregate,
  type LocationAggregate,
  type DailyTrend,
} from '../services/analyticsService';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#f1f5f9', fontWeight: 600 },
  itemStyle: { color: '#cbd5e1' },
};

const EmptyChart = ({ message = 'Select a location to view data', hint }: { message?: string; hint?: string }) => (
  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
    <Info className="w-8 h-8 opacity-30" />
    <p className="text-sm font-medium text-slate-500">{message}</p>
    {hint && <p className="text-xs">{hint}</p>}
  </div>
);

export const Analytics: React.FC = () => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [peakHours, setPeakHours] = useState<HourlyAggregate[]>([]);
  const [busiest, setBusiest] = useState<LocationAggregate[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [peakHourInsight, setPeakHourInsight] = useState<{ peak: number; peakDensity: number; low: number; lowDensity: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const busiestLocs = await analyticsService.getBusiestLocations(7);
        setBusiest(busiestLocs.slice(0, 10));

        if (selectedLocationId) {
          const [hourly, daily, insight] = await Promise.all([
            analyticsService.getPeakTrafficHours(selectedLocationId, 7),
            analyticsService.getDailyTrend(selectedLocationId, 7),
            analyticsService.getPeakHourInsights(selectedLocationId, 7),
          ]);
          setPeakHours(hourly.map((h) => ({ ...h, label: `${h.hour}:00` })) as any);
          setDailyTrend(daily.map((d) => ({
            ...d,
            label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          })) as any);
          setPeakHourInsight({
            peak: insight.peak_hour,
            peakDensity: insight.peak_density,
            low: insight.low_hour,
            lowDensity: insight.low_density,
          });
        } else {
          setPeakHours([]);
          setDailyTrend([]);
          setPeakHourInsight(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedLocationId, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Analytics</h1>
        <p className="text-slate-500">Deep-dive into traffic patterns and performance trends.</p>
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
          <p className="text-sm">{error}</p>
        </div>
      )}

      {peakHourInsight && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Peak Hour</p>
                <p className="text-2xl font-bold text-amber-900 mt-0.5">{peakHourInsight.peak}:00</p>
                <p className="text-sm text-amber-700">{peakHourInsight.peakDensity}% avg density</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 rotate-180" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Lowest Traffic</p>
                <p className="text-2xl font-bold text-green-900 mt-0.5">{peakHourInsight.low}:00</p>
                <p className="text-sm text-green-700">{peakHourInsight.lowDensity}% avg density</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Hourly Traffic Pattern</h2>
              <p className="text-xs text-slate-400 mt-0.5">Average density by hour — last 7 days</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHours} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(v) => `Hour: ${v}:00`}
                  formatter={(v: number, name: string) => [`${v}%`, name === 'avg_density' ? 'Average' : name === 'max_density' ? 'Max' : 'Min']}
                />
                <Legend
                  formatter={(v) => v === 'avg_density' ? 'Average' : v === 'max_density' ? 'Max' : 'Min'}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar dataKey="avg_density" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="max_density" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Select a location to view hourly patterns" />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Daily Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Traffic density over the past week</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Avg Density']} />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'High', fill: '#ef4444', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="avg_density"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Select a location to view daily trends" />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Top 10 Busiest Locations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ranked by average traffic density — last 7 days</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : busiest.length > 0 ? (
            <div className="space-y-2">
              {busiest.map((location, idx) => (
                <div key={location.location_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-slate-300 text-slate-700' :
                    idx === 2 ? 'bg-orange-200 text-orange-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{location.location_name}</p>
                    <p className="text-xs text-slate-400">{location.record_count.toLocaleString()} observations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${
                          location.avg_density >= 80 ? 'bg-red-500' :
                          location.avg_density >= 60 ? 'bg-orange-500' :
                          location.avg_density >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${location.avg_density}%` }}
                      />
                    </div>
                    <div className="text-right w-16">
                      <p className="text-base font-bold text-slate-900">{location.avg_density}%</p>
                      <p className="text-xs text-slate-400">avg</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No location data available" hint="Run a simulation to generate traffic data" />
          )}
        </div>
      </div>
    </div>
  );
};
