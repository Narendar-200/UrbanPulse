const now = Date.now();

export const mockLocations = [
  { id: "loc-1", name: "Downtown Central", city: "San Francisco", latitude: 37.7749, longitude: -122.4194, zone_type: "commercial", created_at: new Date(now - 86400000 * 10).toISOString() },
  { id: "loc-2", name: "Mission District", city: "San Francisco", latitude: 37.7599, longitude: -122.4148, zone_type: "residential", created_at: new Date(now - 86400000 * 9).toISOString() },
  { id: "loc-3", name: "Highway 101 North", city: "San Jose", latitude: 37.3382, longitude: -121.8863, zone_type: "highway", created_at: new Date(now - 86400000 * 8).toISOString() },
];

const statuses = ["low", "moderate", "high", "critical"];
export const mockTrafficLogs = Array.from({ length: 120 }).map((_, i) => {
  const location = mockLocations[i % mockLocations.length];
  const density = Math.max(5, Math.min(95, 25 + ((i * 7) % 70)));
  return {
    id: `log-${i + 1}`,
    location_id: location.id,
    timestamp: new Date(now - i * 30 * 60 * 1000).toISOString(),
    density_level: density,
    vehicle_count: 80 + density * 4,
    congestion_status: statuses[Math.min(3, Math.floor(density / 25))],
    data_source: i % 3 === 0 ? "manual" : "simulated",
    created_at: new Date(now - i * 30 * 60 * 1000).toISOString(),
  };
});

export const mockSimulationRuns = [
  {
    id: "sim-1",
    run_name: "Seed Simulation",
    started_at: new Date(now - 2 * 86400000).toISOString(),
    ended_at: new Date(now - 2 * 86400000 + 15 * 60 * 1000).toISOString(),
    config: { location_ids: mockLocations.map((l) => l.id), interval_minutes: 30, noise_factor: 0.3 },
    records_generated: mockTrafficLogs.length,
    created_at: new Date(now - 2 * 86400000).toISOString(),
  },
];
