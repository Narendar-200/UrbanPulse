import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lightbulb, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { analyticsService, type BestTravelTime } from '../services/analyticsService';
import { trafficService } from '../services/trafficService';
import { locationService } from '../services/locationService';
import type { Location } from '../lib/supabase';

export const Insights: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [bestTravelTimes, setBestTravelTimes] = useState<BestTravelTime | null>(null);
  const [highCongestionAlerts, setHighCongestionAlerts] = useState<any[]>([]);
  const [peakHourData, setPeakHourData] = useState<any>(null);
  const [congestionForecast, setCongestionForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      const data = await locationService.getAll();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId(data[0].id);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        const bestTimes = await analyticsService.getBestTravelTimes(selectedLocationId, 14);
        setBestTravelTimes(bestTimes);

        const peak = await analyticsService.getPeakHourInsights(selectedLocationId, 7);
        setPeakHourData(peak);

        const highCongestion = await trafficService.getHighCongestion(80);
        const filtered = highCongestion.filter((log) => log.location_id === selectedLocationId).slice(0, 5);
        setHighCongestionAlerts(
          filtered.map((log) => ({
            ...log,
            timeAgo: getTimeAgo(new Date(log.timestamp)),
          }))
        );

        const hourlyData = await analyticsService.getPeakTrafficHours(selectedLocationId, 1);
        const currentHour = new Date().getHours();
        const forecast = hourlyData
          .filter((h) => h.hour >= currentHour && h.hour < currentHour + 3)
          .map((h) => ({
            hour: h.hour,
            density: h.avg_density,
            status: getStatus(h.avg_density),
          }));
        setCongestionForecast(forecast);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [selectedLocationId]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatus = (density: number): string => {
    if (density < 30) return 'Low';
    if (density < 60) return 'Moderate';
    if (density < 85) return 'High';
    return 'Critical';
  };

  const getStatusColor = (density: number): string => {
    if (density < 30) return 'text-green-700 bg-green-50 border-green-200';
    if (density < 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (density < 85) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Intelligent Insights</h1>
        <p className="text-slate-600">AI-powered recommendations and traffic intelligence</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Location</label>
        <select
          value={selectedLocationId || ''}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {highCongestionAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">High Congestion Alerts</h3>
              <div className="space-y-2">
                {highCongestionAlerts.map((alert) => (
                  <p key={alert.id} className="text-sm text-red-800">
                    Density reached <strong>{alert.density_level}%</strong> {alert.timeAgo}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {peakHourData && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-semibold text-amber-900">Peak Traffic Pattern</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-amber-700">Peak Hour</p>
                <p className="text-2xl font-bold text-amber-900">
                  {peakHourData.peak_hour}:00 - {peakHourData.peak_density}% density
                </p>
              </div>
              <div>
                <p className="text-sm text-amber-700">Lowest Traffic</p>
                <p className="text-lg font-semibold text-amber-900">
                  {peakHourData.low_hour}:00 - {peakHourData.low_density}% density
                </p>
              </div>
            </div>
          </div>
        )}

        {bestTravelTimes && bestTravelTimes.best_times.length > 0 && (
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-semibold text-teal-900">Best Travel Times</h3>
            </div>
            <div className="space-y-2">
              {bestTravelTimes.best_times.map((time, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-teal-700">
                    {time.hour}:00 - {time.avg_density}% density
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                    Optimal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {congestionForecast.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <h3 className="font-semibold text-purple-900">3-Hour Congestion Forecast</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {congestionForecast.map((forecast, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getStatusColor(forecast.density)}`}
              >
                <p className="text-sm font-medium">{forecast.hour}:00</p>
                <p className="text-2xl font-bold mt-2">{forecast.density}%</p>
                <p className="text-xs font-semibold mt-1">{forecast.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Smart Recommendations
        </h3>
        <div className="space-y-3">
          {peakHourData && (
            <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Avoid travel between <strong>{peakHourData.peak_hour}:00 and {peakHourData.peak_hour + 1}:00</strong> for this location. Peak congestion typically occurs during this hour.
              </p>
            </div>
          )}
          <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              Consider using this location between <strong>6:00 and 7:00 AM</strong> for minimal traffic congestion.
            </p>
          </div>
          <div className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <strong>Alternative routes</strong> are recommended during evening hours (4–8 PM) when traffic typically peaks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
