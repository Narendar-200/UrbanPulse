import React, { useEffect, useState } from 'react';
import { Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';
import { locationService } from '../services/locationService';
import { simulationService, type LiveSimulationPoint } from '../services/simulationService';
import type { Location } from '../lib/supabase';

export const Simulation: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [noiseFactor, setNoiseFactor] = useState(0.3);
  const [runName, setRunName] = useState('Test Run');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [liveData, setLiveData] = useState<LiveSimulationPoint[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    locationService.getAll().then(setLocations);
    fetchSimulations();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveData = async () => {
      try {
        if (isMounted) setLiveError(null);
        const response = await simulationService.getLiveSimulation();
        if (isMounted) {
          setLiveData(response.data || []);
          setLiveLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setLiveError(error instanceof Error ? error.message : 'Failed to load live simulation data');
          setLiveLoading(false);
        }
      }
    };

    fetchLiveData();
    const intervalId = window.setInterval(fetchLiveData, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const fetchSimulations = async () => {
    const data = await simulationService.getRecentRuns();
    setSimulations(data);
  };

  const handleSelectLocation = (id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((loc) => loc !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locations.map((loc) => loc.id));
    }
  };

  const runSimulation = async () => {
    if (selectedLocations.length === 0) {
      setResult({ success: false, message: 'Please select at least one location' });
      return;
    }

    setRunning(true);
    setResult(null);
    setProgress(10);

    try {
      const selectedLocationObjects = locations.filter((loc) => selectedLocations.includes(loc.id));

      const result = await simulationService.runSimulation(
        runName,
        {
          location_ids: selectedLocations,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          interval_minutes: intervalMinutes,
          noise_factor: noiseFactor,
        },
        selectedLocationObjects
      );

      setProgress(100);
      setResult({
        success: true,
        message: `Successfully generated ${result.recordsCreated.toLocaleString()} traffic records!`,
      });

      setRunName(`Test Run ${new Date().toLocaleTimeString()}`);
      await fetchSimulations();
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setRunning(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Simulation</h1>
        <p className="text-slate-600">Generate realistic traffic data for testing and analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Simulation Configuration</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Locations</label>
              <button
                onClick={handleSelectAll}
                className="mb-3 px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
              >
                {selectedLocations.length === locations.length ? 'Deselect' : 'Select'} All
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                {locations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc.id)}
                      onChange={() => handleSelectLocation(loc.id)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm text-slate-700">{loc.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">{selectedLocations.length} selected</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  disabled={running}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  disabled={running}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interval (minutes): {intervalMinutes}
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                  disabled={running}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Noise Factor: {noiseFactor.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={noiseFactor}
                  onChange={(e) => setNoiseFactor(parseFloat(e.target.value))}
                  disabled={running}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Run Name</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                disabled={running}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900 disabled:bg-slate-100"
              />
            </div>

            {running && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Progress</span>
                  <span className="text-sm font-semibold text-amber-600">{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {result && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}
                  >
                    {result.success ? 'Success' : 'Error'}
                  </p>
                  <p className={`text-sm mt-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={runSimulation}
              disabled={running}
              className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <Pause className="w-4 h-4" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Simulation
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Runs</h2>
          {simulations.length === 0 ? (
            <p className="text-slate-500 text-sm">No simulations yet</p>
          ) : (
            <div className="space-y-3">
              {simulations.map((sim) => (
                <div key={sim.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <p className="font-medium text-slate-900 text-sm">{sim.run_name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {sim.records_generated.toLocaleString()} records
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(sim.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Live Simulation Feed (auto-refresh)</h3>
            {liveError && (
              <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
                {liveError}
              </div>
            )}
            {liveLoading ? (
              <div className="text-sm text-slate-500">Loading live simulation data...</div>
            ) : liveData.length === 0 ? (
              <div className="text-sm text-slate-500">No live simulation data available.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {liveData.map((point) => (
                  <div key={point.location_id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 text-sm">{point.area}</p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          point.traffic_level === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : point.traffic_level === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : point.traffic_level === 'moderate'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {point.traffic_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Density: {point.density_level}% | Vehicles: {point.vehicles}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(point.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
