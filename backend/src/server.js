import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { generateTrafficData, getCongestionStatus } from "./utils/simulation.js";
import { toHourlyAggregates } from "./utils/analytics.js";
import { mockLocations, mockSimulationRuns, mockTrafficLogs } from "./mockData.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);

app.use(
  cors({
    origin: [process.env.CORS_ORIGIN || "http://localhost:5000", "http://localhost:5000", "http://localhost:5173"],
  })
);
app.use(express.json());

const toError = (error) => ({ error: error?.message || "Unexpected server error" });
const sortByTimestampDesc = (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
let mockLocationIdCounter = mockLocations.length + 1;
let mockTrafficIdCounter = mockTrafficLogs.length + 1;
let mockSimulationRunCounter = mockSimulationRuns.length + 1;
const getMockLogs = (req) => {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const threshold = req.query.threshold ? Number(req.query.threshold) : null;
  let logs = [...mockTrafficLogs];
  if (req.query.locationId) logs = logs.filter((item) => item.location_id === req.query.locationId);
  if (req.query.startDate) logs = logs.filter((item) => new Date(item.timestamp) >= new Date(req.query.startDate));
  if (req.query.endDate) logs = logs.filter((item) => new Date(item.timestamp) <= new Date(req.query.endDate));
  if (threshold !== null) logs = logs.filter((item) => item.density_level >= threshold);
  logs.sort(sortByTimestampDesc);
  return { data: logs.slice(offset, offset + limit), count: logs.length };
};

app.get("/", (_req, res) => {
  res.json({
    name: "UrbanPulse backend",
    status: "running",
    apiBase: "/api",
    health: "/api/health",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, supabaseConfigured: isSupabaseConfigured });
});

app.get("/api/simulate", async (_req, res) => {
  const toPayload = (location) => {
    const density = Math.floor(Math.random() * 101);
    const vehicles = 50 + Math.floor(Math.random() * 450);
    const level =
      density < 30 ? "low" : density < 60 ? "moderate" : density < 85 ? "high" : "critical";

    return {
      area: location.name,
      location_id: location.id,
      traffic_level: level,
      density_level: density,
      vehicles,
      timestamp: new Date().toISOString(),
    };
  };

  if (!isSupabaseConfigured || !supabase) {
    const sample = mockLocations.slice(0, 5).map(toPayload);
    return res.json({ data: sample, generated_at: new Date().toISOString() });
  }

  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return res.status(500).json(toError(error));
  return res.json({
    data: (locations || []).map(toPayload),
    generated_at: new Date().toISOString(),
  });
});

app.get("/api/locations", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const zoneType = req.query.zoneType;
    const data = zoneType ? mockLocations.filter((item) => item.zone_type === zoneType) : mockLocations;
    return res.json(data);
  }

  let query = supabase.from("locations").select("*").order("city", { ascending: true });
  if (req.query.zoneType) query = query.eq("zone_type", req.query.zoneType);
  const { data, error } = await query;
  if (error) return res.status(500).json(toError(error));
  return res.json(data || []);
});

app.get("/api/locations/:id", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const location = mockLocations.find((item) => item.id === req.params.id) || null;
    if (!location) return res.status(404).json({ error: "Location not found" });
    return res.json(location);
  }

  const { data, error } = await supabase.from("locations").select("*").eq("id", req.params.id).maybeSingle();
  if (error) return res.status(500).json(toError(error));
  if (!data) return res.status(404).json({ error: "Location not found" });
  return res.json(data);
});

app.post("/api/locations", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const { name, city, latitude, longitude, zone_type } = req.body || {};
    if (!name || !city || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
      return res.status(400).json({ error: "name, city, latitude and longitude are required" });
    }
    const newLocation = {
      id: `loc-${mockLocationIdCounter++}`,
      name: String(name),
      city: String(city),
      latitude: Number(latitude),
      longitude: Number(longitude),
      zone_type: zone_type || "commercial",
      created_at: new Date().toISOString(),
    };
    mockLocations.push(newLocation);
    return res.status(201).json(newLocation);
  }
  const { data, error } = await supabase.from("locations").insert([req.body]).select().single();
  if (error) return res.status(400).json(toError(error));
  return res.status(201).json(data);
});

app.put("/api/locations/:id", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const index = mockLocations.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Location not found" });
    const updated = {
      ...mockLocations[index],
      ...req.body,
      latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : mockLocations[index].latitude,
      longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : mockLocations[index].longitude,
    };
    mockLocations[index] = updated;
    return res.json(updated);
  }
  const { data, error } = await supabase.from("locations").update(req.body).eq("id", req.params.id).select().single();
  if (error) return res.status(400).json(toError(error));
  return res.json(data);
});

app.delete("/api/locations/:id", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const index = mockLocations.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Location not found" });
    mockLocations.splice(index, 1);
    for (let i = mockTrafficLogs.length - 1; i >= 0; i -= 1) {
      if (mockTrafficLogs[i].location_id === req.params.id) {
        mockTrafficLogs.splice(i, 1);
      }
    }
    return res.status(204).send();
  }
  const { error } = await supabase.from("locations").delete().eq("id", req.params.id);
  if (error) return res.status(400).json(toError(error));
  return res.status(204).send();
});

app.get("/api/traffic", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.json(getMockLogs(req));
  }

  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const threshold = req.query.threshold ? Number(req.query.threshold) : null;

  let query = supabase
    .from("traffic_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (req.query.locationId) query = query.eq("location_id", req.query.locationId);
  if (req.query.startDate) query = query.gte("timestamp", req.query.startDate);
  if (req.query.endDate) query = query.lte("timestamp", req.query.endDate);
  if (threshold !== null) query = query.gte("density_level", threshold);

  const { data, count, error } = await query;
  if (error) return res.status(500).json(toError(error));
  return res.json({ data: data || [], count: count || 0 });
});

app.get("/api/traffic/latest/:locationId", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const latest = [...mockTrafficLogs]
      .filter((item) => item.location_id === req.params.locationId)
      .sort(sortByTimestampDesc)[0] || null;
    return res.json(latest);
  }

  const { data, error } = await supabase
    .from("traffic_logs")
    .select("*")
    .eq("location_id", req.params.locationId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json(toError(error));
  return res.json(data);
});

app.post("/api/traffic", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const {
      location_id,
      timestamp,
      density_level,
      vehicle_count,
      congestion_status,
      data_source,
      name,
      city,
      latitude,
      longitude,
      zone_type,
    } = req.body || {};

    // Compatibility: if location fields are posted to /api/traffic, create a location record.
    if (name && city && latitude !== undefined && longitude !== undefined) {
      const newLocation = {
        id: `loc-${mockLocationIdCounter++}`,
        name: String(name),
        city: String(city),
        latitude: Number(latitude),
        longitude: Number(longitude),
        zone_type: zone_type || "commercial",
        created_at: new Date().toISOString(),
      };
      mockLocations.push(newLocation);
      return res.status(201).json(newLocation);
    }

    if (!location_id || timestamp === undefined || density_level === undefined || vehicle_count === undefined) {
      return res.status(400).json({ error: "location_id, timestamp, density_level and vehicle_count are required" });
    }

    const newLog = {
      id: `log-${mockTrafficIdCounter++}`,
      location_id,
      timestamp: new Date(timestamp).toISOString(),
      density_level: Number(density_level),
      vehicle_count: Number(vehicle_count),
      congestion_status: congestion_status || getCongestionStatus(Number(density_level)),
      data_source: data_source || "manual",
      created_at: new Date().toISOString(),
    };
    mockTrafficLogs.unshift(newLog);
    return res.status(201).json(newLog);
  }
  const payload = {
    ...req.body,
    congestion_status: req.body.congestion_status || getCongestionStatus(req.body.density_level),
  };
  const { data, error } = await supabase.from("traffic_logs").insert([payload]).select().single();
  if (error) return res.status(400).json(toError(error));
  return res.status(201).json(data);
});

app.post("/api/traffic/bulk", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(501).json({ error: "Write APIs are disabled in mock mode. Configure Supabase to enable writes." });
  }
  const { logs } = req.body;
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ error: "logs array is required" });
  }
  const { data, error } = await supabase.from("traffic_logs").insert(logs).select();
  if (error) return res.status(400).json(toError(error));
  return res.status(201).json(data || []);
});

app.delete("/api/traffic/:id", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(501).json({ error: "Write APIs are disabled in mock mode. Configure Supabase to enable writes." });
  }
  const { error } = await supabase.from("traffic_logs").delete().eq("id", req.params.id);
  if (error) return res.status(400).json(toError(error));
  return res.status(204).send();
});

app.get("/api/traffic/stream", async (req, res) => {
  req.socket.setTimeout(0);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let lastSignature = "";

  const fetchAndSend = async () => {
    if (!isSupabaseConfigured || !supabase) {
      const logs = [...mockTrafficLogs].sort(sortByTimestampDesc).slice(0, 50).map((log) => ({
        ...log,
        location_name: mockLocations.find((location) => location.id === log.location_id)?.name || "Unknown",
      }));
      const signature = logs.map((log) => log.id).join("|");
      if (signature !== lastSignature) {
        lastSignature = signature;
        res.write(`data: ${JSON.stringify({ logs })}\n\n`);
      }
      return;
    }

    const { data, error } = await supabase
      .from("traffic_logs")
      .select("id, location_id, timestamp, density_level, vehicle_count, congestion_status, data_source, created_at, locations(name)")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      return;
    }

    const logs = (data || []).map((log) => ({
      id: log.id,
      location_id: log.location_id,
      timestamp: log.timestamp,
      density_level: log.density_level,
      vehicle_count: log.vehicle_count,
      congestion_status: log.congestion_status,
      data_source: log.data_source,
      created_at: log.created_at,
      location_name: log.locations?.name || "Unknown",
    }));

    const signature = logs.map((log) => log.id).join("|");
    if (signature !== lastSignature) {
      lastSignature = signature;
      res.write(`data: ${JSON.stringify({ logs })}\n\n`);
    }
  };

  await fetchAndSend();
  const interval = setInterval(fetchAndSend, 3000);
  const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15000);

  req.on("close", () => {
    clearInterval(interval);
    clearInterval(keepAlive);
    res.end();
  });
});

app.get("/api/simulation-runs", async (_req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.json(mockSimulationRuns);
  }

  const { data, error } = await supabase.from("simulation_runs").select("*").order("created_at", { ascending: false }).limit(25);
  if (error) return res.status(500).json(toError(error));
  return res.json(data || []);
});

app.post("/api/simulations/run", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const { runName, config, locations } = req.body;
    if (!runName || !config || !Array.isArray(locations)) {
      return res.status(400).json({ error: "runName, config and locations are required" });
    }

    const logs = generateTrafficData(config, locations);
    logs.forEach((log) => {
      mockTrafficLogs.unshift({
        id: `log-${mockTrafficIdCounter++}`,
        ...log,
        created_at: new Date().toISOString(),
      });
    });

    const runId = `sim-${mockSimulationRunCounter++}`;
    mockSimulationRuns.unshift({
      id: runId,
      run_name: runName,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      config,
      records_generated: logs.length,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({ runId, recordsCreated: logs.length });
  }
  const { runName, config, locations } = req.body;
  if (!runName || !config || !Array.isArray(locations)) {
    return res.status(400).json({ error: "runName, config and locations are required" });
  }

  const logs = generateTrafficData(config, locations);
  if (logs.length === 0) {
    return res.status(400).json({ error: "No traffic data generated" });
  }

  const batchSize = 500;
  let totalCreated = 0;
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    const { data, error } = await supabase.from("traffic_logs").insert(batch).select("id");
    if (error) return res.status(500).json(toError(error));
    totalCreated += (data || []).length;
  }

  const { data: runData, error: runError } = await supabase
    .from("simulation_runs")
    .insert([
      {
        run_name: runName,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        config,
        records_generated: totalCreated,
      },
    ])
    .select()
    .single();

  if (runError) return res.status(500).json(toError(runError));
  return res.status(201).json({ runId: runData.id, recordsCreated: totalCreated });
});

app.delete("/api/simulations/:runId/data", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(501).json({ error: "Simulation write APIs are disabled in mock mode. Configure Supabase to enable writes." });
  }
  const { data: runData, error: runError } = await supabase
    .from("simulation_runs")
    .select("config")
    .eq("id", req.params.runId)
    .maybeSingle();
  if (runError) return res.status(500).json(toError(runError));
  if (!runData) return res.json({ deleted: 0 });

  const locationIds = runData.config?.location_ids || [];
  const { data, error } = await supabase
    .from("traffic_logs")
    .delete()
    .eq("data_source", "simulated")
    .in("location_id", locationIds)
    .select("id");
  if (error) return res.status(500).json(toError(error));
  return res.json({ deleted: (data || []).length });
});

app.get("/api/analytics/peak-traffic-hours/:locationId", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const days = Number(req.query.days || 7);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const data = mockTrafficLogs
      .filter((item) => item.location_id === req.params.locationId && new Date(item.timestamp) >= startDate)
      .map((item) => ({ timestamp: item.timestamp, density_level: item.density_level }));
    return res.json(toHourlyAggregates(data));
  }

  const days = Number(req.query.days || 7);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { data, error } = await supabase
    .from("traffic_logs")
    .select("timestamp, density_level")
    .eq("location_id", req.params.locationId)
    .gte("timestamp", startDate.toISOString());
  if (error) return res.status(500).json(toError(error));
  return res.json(toHourlyAggregates(data || []));
});

app.get("/api/analytics/busiest-locations", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const days = Number(req.query.days || 7);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const logs = mockTrafficLogs.filter((item) => new Date(item.timestamp) >= startDate);
    const locationMap = new Map(mockLocations.map((loc) => [loc.id, loc.name]));
    const locationStats = new Map();
    for (const log of logs) {
      if (!locationStats.has(log.location_id)) locationStats.set(log.location_id, { densities: [], count: 0 });
      const entry = locationStats.get(log.location_id);
      entry.densities.push(log.density_level);
      entry.count += 1;
    }
    const result = [];
    for (const [locationId, stats] of locationStats.entries()) {
      result.push({
        location_id: locationId,
        location_name: locationMap.get(locationId) || "Unknown",
        avg_density: Math.round(stats.densities.reduce((a, b) => a + b, 0) / stats.densities.length),
        max_density: Math.max(...stats.densities),
        record_count: stats.count,
      });
    }
    return res.json(result.sort((a, b) => b.avg_density - a.avg_density));
  }

  const days = Number(req.query.days || 7);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [{ data: logs, error: logsError }, { data: locations, error: locationsError }] = await Promise.all([
    supabase.from("traffic_logs").select("location_id, density_level").gte("timestamp", startDate.toISOString()),
    supabase.from("locations").select("id, name"),
  ]);
  if (logsError) return res.status(500).json(toError(logsError));
  if (locationsError) return res.status(500).json(toError(locationsError));

  const locationMap = new Map((locations || []).map((loc) => [loc.id, loc.name]));
  const locationStats = new Map();

  for (const log of logs || []) {
    if (!locationStats.has(log.location_id)) {
      locationStats.set(log.location_id, { densities: [], count: 0 });
    }
    const entry = locationStats.get(log.location_id);
    entry.densities.push(log.density_level);
    entry.count += 1;
  }

  const result = [];
  for (const [locationId, stats] of locationStats.entries()) {
    result.push({
      location_id: locationId,
      location_name: locationMap.get(locationId) || "Unknown",
      avg_density: Math.round(stats.densities.reduce((a, b) => a + b, 0) / stats.densities.length),
      max_density: Math.max(...stats.densities),
      record_count: stats.count,
    });
  }
  return res.json(result.sort((a, b) => b.avg_density - a.avg_density));
});

app.get("/api/analytics/daily-trend/:locationId", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const days = Number(req.query.days || 7);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const data = mockTrafficLogs
      .filter((item) => item.location_id === req.params.locationId && new Date(item.timestamp) >= startDate)
      .map((item) => ({ timestamp: item.timestamp, density_level: item.density_level }));

    const dailyData = new Map();
    for (const log of data) {
      const date = new Date(log.timestamp).toISOString().split("T")[0];
      if (!dailyData.has(date)) dailyData.set(date, []);
      dailyData.get(date).push(log.density_level);
    }
    const result = [];
    for (const date of Array.from(dailyData.keys()).sort()) {
      const densities = dailyData.get(date);
      result.push({ date, avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length) });
    }
    return res.json(result);
  }

  const days = Number(req.query.days || 7);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { data, error } = await supabase
    .from("traffic_logs")
    .select("timestamp, density_level")
    .eq("location_id", req.params.locationId)
    .gte("timestamp", startDate.toISOString());
  if (error) return res.status(500).json(toError(error));

  const dailyData = new Map();
  for (const log of data || []) {
    const date = new Date(log.timestamp).toISOString().split("T")[0];
    if (!dailyData.has(date)) dailyData.set(date, []);
    dailyData.get(date).push(log.density_level);
  }

  const result = [];
  for (const date of Array.from(dailyData.keys()).sort()) {
    const densities = dailyData.get(date);
    result.push({
      date,
      avg_density: Math.round(densities.reduce((a, b) => a + b, 0) / densities.length),
    });
  }
  return res.json(result);
});

app.get("/api/analytics/peak-hour-insights/:locationId", async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    const hourlyData = toHourlyAggregates(
      mockTrafficLogs
        .filter((item) => item.location_id === req.params.locationId)
        .map((item) => ({ timestamp: item.timestamp, density_level: item.density_level }))
    );
    const peak = hourlyData.reduce((max, curr) => (curr.avg_density > max.avg_density ? curr : max), hourlyData[0]);
    const low = hourlyData.reduce((min, curr) => (curr.avg_density < min.avg_density ? curr : min), hourlyData[0]);
    const location = mockLocations.find((item) => item.id === req.params.locationId);
    return res.json({
      location_id: req.params.locationId,
      location_name: location?.name || "Unknown",
      peak_hour: peak.hour,
      peak_density: peak.avg_density,
      low_hour: low.hour,
      low_density: low.avg_density,
    });
  }

  const days = Number(req.query.days || 7);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const [{ data: logs, error }, { data: locationData }] = await Promise.all([
    supabase
      .from("traffic_logs")
      .select("timestamp, density_level")
      .eq("location_id", req.params.locationId)
      .gte("timestamp", startDate.toISOString()),
    supabase.from("locations").select("name").eq("id", req.params.locationId).maybeSingle(),
  ]);
  if (error) return res.status(500).json(toError(error));

  const hourlyData = toHourlyAggregates(logs || []);
  const peak = hourlyData.reduce((max, curr) => (curr.avg_density > max.avg_density ? curr : max), hourlyData[0]);
  const low = hourlyData.reduce((min, curr) => (curr.avg_density < min.avg_density ? curr : min), hourlyData[0]);

  return res.json({
    location_id: req.params.locationId,
    location_name: locationData?.name || "Unknown",
    peak_hour: peak.hour,
    peak_density: peak.avg_density,
    low_hour: low.hour,
    low_density: low.avg_density,
  });
});

app.listen(port, () => {
  console.log(`UrbanPulse backend running on http://localhost:${port}`);
});
