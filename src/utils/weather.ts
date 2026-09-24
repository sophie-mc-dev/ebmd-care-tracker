/**
 * Weather & Humidity Fetcher using Open-Meteo API (Free, no API key required)
 * Tracks temperature and relative humidity at the time of an EBMD corneal episode.
 */

export interface WeatherData {
  tempC: number;
  tempF?: number;
  humidity: number; // percentage (0-100)
  weatherDesc?: string;
  isManual?: boolean;
}

const CACHED_COORDS_KEY = 'ebmd_last_known_coords';

interface Coords {
  lat: number;
  lon: number;
}

export function getLastKnownCoords(): Coords | null {
  try {
    const raw = localStorage.getItem(CACHED_COORDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastKnownCoords(lat: number, lon: number): void {
  try {
    localStorage.setItem(CACHED_COORDS_KEY, JSON.stringify({ lat, lon }));
  } catch {
    // ignore
  }
}

/**
 * Gets device coordinates via HTML5 Geolocation
 */
export function getDeviceCoords(timeoutMs = 6000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const cached = getLastKnownCoords();
      if (cached) return resolve(cached);
      return reject(new Error('Geolocation not supported'));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        };
        saveLastKnownCoords(coords.lat, coords.lon);
        resolve(coords);
      },
      (err) => {
        // If failed or denied, try using cached coords
        const cached = getLastKnownCoords();
        if (cached) return resolve(cached);
        reject(err);
      },
      { timeout: timeoutMs, enableHighAccuracy: false }
    );
  });
}

/**
 * Fetches current temperature and humidity from Open-Meteo
 */
export async function fetchCurrentWeather(explicitCoords?: Coords): Promise<WeatherData | null> {
  try {
    let coords = explicitCoords;
    if (!coords) {
      coords = await getDeviceCoords();
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch status: ${res.status}`);

    const json = await res.json();
    const current = json.current;
    if (!current) return null;

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const humidity = Math.round(current.relative_humidity_2m);

    let weatherDesc = 'Normal Air';
    if (humidity < 30) weatherDesc = 'Very Dry Air (High Risk)';
    else if (humidity < 45) weatherDesc = 'Dry Air';
    else if (humidity <= 65) weatherDesc = 'Moderate Humidity';
    else weatherDesc = 'Humid Air';

    return {
      tempC,
      tempF,
      humidity,
      weatherDesc,
      isManual: false,
    };
  } catch (err) {
    console.warn('Weather fetch error:', err);
    return null;
  }
}
