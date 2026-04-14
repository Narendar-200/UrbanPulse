export const getCongestionStatus = (density) => {
  if (density < 30) return "low";
  if (density < 60) return "moderate";
  if (density < 85) return "high";
  return "critical";
};

const getTrafficRules = (hour, dayOfWeek, zoneType) => {
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
  if (zoneType === "highway") zoneMultiplier = 1.3;
  if (zoneType === "residential") zoneMultiplier = 0.7;

  return Math.round(baseDensity * weekendFactor * zoneMultiplier);
};

export const generateTrafficData = (config, locations) => {
  const logs = [];
  const startDate = new Date(config.start_date);
  const endDate = new Date(config.end_date);
  const currentDate = new Date(startDate);

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
        data_source: "simulated",
      });
    }
    currentDate.setMinutes(currentDate.getMinutes() + config.interval_minutes);
  }

  return logs;
};
