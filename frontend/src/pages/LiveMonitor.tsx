import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { trafficService } from '../services/trafficService';
import { locationService } from '../services/locationService';
import type { TrafficLog, Location } from '../lib/supabase';

type LogWithName = TrafficLog & { location_name?: string };

const congestionColor = (status: string) => {
  switch (status) {
    case 'low': return 'bg-green-50 border-green-200';
    case 'moderate': return 'bg-yellow-50 border-yellow-200';
    case 'high': return 'bg-orange-50 border-orange-200';
    case 'critical': return 'bg-red-50 border-red-200';
    default: return 'bg-slate-50 border-slate-200';
  }
};

const congestionBadge = (status: string) => {
  const base = 'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide';
  switch (status) {
    case 'low': return `${base} bg-green-100 text-green-800`;
    case 'moderate': return `${base} bg-yellow-100 text-yellow-800`;
    case 'high': return `${base} bg-orange-100 text-orange-800`;
    case 'critical': return `${base} bg-red-100 text-red-800`;
    default: return base;
  }
};

const densityBar = (level: number) => {
  const color =
    level < 30 ? 'bg-green-500' :
    level < 60 ? 'bg-yellow-500' :
    level < 85 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${level}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-900">{level}%</span>
    </div>
  );
};

export const LiveMonitor: React.FC = () => {
  const [logs, setLogs] = useState<LogWithName[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    location_id: '',
    timestamp: new Date().toISOString().slice(0, 16),
    density_level: 50,
    vehicle_count: 100,
  });

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const [{ data: logsData }, locationsData] = await Promise.all([
        trafficService.getAll(50, 0),
        locationService.getAll(),
      ]);
      setLocations(locationsData);
      const logsWithNames = logsData.map((log) => ({
        ...log,
        location_name: locationsData.find((loc) => loc.id === log.location_id)?.name || 'Unknown',
      }));
      setLogs(logsWithNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource(trafficService.getLiveStreamUrl());

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { logs: LogWithName[] };
      if (!payload.logs) return;

      setLogs((prev) => {
        const previousIds = new Set(prev.map((log) => log.id));
        const incomingIds = payload.logs.map((log) => log.id).filter((id) => !previousIds.has(id));

        if (incomingIds.length > 0) {
          setNewRowIds((current) => {
            const next = new Set(current);
            incomingIds.forEach((id) => next.add(id));
            return next;
          });
          incomingIds.forEach((id) => {
            setTimeout(() => {
              setNewRowIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
              });
            }, 2000);
          });
        }

        return payload.logs;
      });
      setLoading(false);
      setError(null);
    };

    eventSource.onerror = () => {
      setError('Live stream disconnected. Click Refresh to fetch latest data.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isLive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_id) return;

    setSubmitting(true);
    try {
      const density = formData.density_level;
      const congestion_status: TrafficLog['congestion_status'] =
        density < 30 ? 'low' : density < 60 ? 'moderate' : density < 85 ? 'high' : 'critical';

      await trafficService.create({
        location_id: formData.location_id,
        timestamp: new Date(formData.timestamp).toISOString(),
        density_level: density,
        vehicle_count: formData.vehicle_count,
        congestion_status,
        data_source: 'manual',
      });

      setFormData({
        location_id: '',
        timestamp: new Date().toISOString().slice(0, 16),
        density_level: 50,
        vehicle_count: 100,
      });
      setShowForm(false);
      if (!isLive) await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this traffic log?')) return;
    try {
      await trafficService.delete(id);
      if (!isLive) await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Live Monitor</h1>
          <p className="text-slate-600">Real-time traffic observations — auto-updates as data arrives.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              isLive
                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isLive
              ? <><Wifi className="w-4 h-4" /><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" /> Live</span></>
              : <><WifiOff className="w-4 h-4" /> Paused</>
            }
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Log
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">New Traffic Log</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 text-sm"
                  required
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timestamp</label>
                <input
                  type="datetime-local"
                  value={formData.timestamp}
                  onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Density Level: <span className="font-bold text-amber-600">{formData.density_level}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.density_level}
                  onChange={(e) => setFormData({ ...formData, density_level: parseInt(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.vehicle_count}
                  onChange={(e) => setFormData({ ...formData, vehicle_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
              >
                {submitting ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : 'Save Log'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm">Loading live data...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium text-slate-600">No traffic logs yet</p>
            <p className="text-sm mt-1">Add a log or run a simulation to see data here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Density</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicles</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`transition-all duration-700 ${
                      newRowIds.has(log.id)
                        ? 'bg-amber-50 border-l-4 border-l-amber-400'
                        : `${congestionColor(log.congestion_status)} hover:bg-opacity-80`
                    }`}
                  >
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">{log.location_name}</td>
                    <td className="px-6 py-3.5 text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-3.5">{densityBar(log.density_level)}</td>
                    <td className="px-6 py-3.5">
                      <span className={congestionBadge(log.congestion_status)}>{log.congestion_status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-600">{log.vehicle_count.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.data_source === 'simulated' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {log.data_source}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {log.data_source === 'manual' && (
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded"
                          title="Delete log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
