export const toHourlyAggregates = (logs) => {
  const hourlyData = new Map();

  for (const log of logs) {
    const hour = new Date(log.timestamp).getHours();
    if (!hourlyData.has(hour)) hourlyData.set(hour, []);
    hourlyData.get(hour).push(log.density_level);
  }

  const result = [];
  for (let hour = 0; hour < 24; hour += 1) {
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
