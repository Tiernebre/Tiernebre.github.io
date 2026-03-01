export interface WeatherSnapshot {
  temp_f: number;
  condition: string;
}

export const WMO_CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Hail",
  99: "Thunderstorm with Heavy Hail",
};

export function wmoCodeToCondition(code: number): string {
  return WMO_CONDITIONS[code] ?? "Unknown";
}

/**
 * Finds the index in an Open-Meteo hourly time array (UTC, format "YYYY-MM-DDTHH:00")
 * that corresponds to the hour of the given ISO date-time string.
 */
export function findHourIndex(times: string[], isoDateTime: string): number {
  const date = new Date(isoDateTime);
  const target = date.toISOString().slice(0, 13) + ":00";
  return times.indexOf(target);
}
