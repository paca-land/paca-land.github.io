import * as THREE from 'three';
import { makeRandom } from './random.js';

// Where the home land's sky comes from. Leave as null to use each visitor's
// own sky (approximated from their time zone, so no location prompt), or pin
// it to a place, e.g. { lat: 51.51, lon: -0.13, tz: 'Europe/London', label: 'London' }.
const HOME_PLACE = null;

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

const ZONES = {
  'America/New_York': [40.71, -74.01], 'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99],
  'America/Los_Angeles': [34.05, -118.24], 'America/Phoenix': [33.45, -112.07], 'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12], 'America/Mexico_City': [19.43, -99.13], 'America/Sao_Paulo': [-23.55, -46.63],
  'America/Argentina/Buenos_Aires': [-34.6, -58.38], 'Pacific/Honolulu': [21.31, -157.86],
  'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26], 'Europe/Paris': [48.86, 2.35],
  'Europe/Berlin': [52.52, 13.4], 'Europe/Amsterdam': [52.37, 4.9], 'Europe/Madrid': [40.42, -3.7],
  'Europe/Rome': [41.9, 12.5], 'Europe/Stockholm': [59.33, 18.07], 'Europe/Zurich': [47.37, 8.54],
  'Europe/Moscow': [55.76, 37.62], 'Africa/Cairo': [30.04, 31.24], 'Africa/Johannesburg': [-26.2, 28.05],
  'Asia/Dubai': [25.2, 55.27], 'Asia/Kolkata': [28.61, 77.21], 'Asia/Bangkok': [13.76, 100.5],
  'Asia/Singapore': [1.35, 103.82], 'Asia/Hong_Kong': [22.32, 114.17], 'Asia/Shanghai': [31.23, 121.47],
  'Asia/Taipei': [25.03, 121.57], 'Asia/Seoul': [37.57, 126.98], 'Asia/Tokyo': [35.68, 139.69],
  'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96], 'Pacific/Auckland': [-36.85, 174.76],
};

export function homePlace() {
  if (HOME_PLACE) return HOME_PLACE;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const known = ZONES[tz];
  if (known) return { lat: known[0], lon: known[1], tz, label: tz.split('/').pop().replace(/_/g, ' ') };
  // Unknown zone: the UTC offset still gives a fair longitude.
  return { lat: 40, lon: (-new Date().getTimezoneOffset() / 60) * 15, tz, label: 'your sky' };
}

// Hours on the clock at `place`, for labels.
export function placeHours(date, place) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: place.tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get('hour') + get('minute') / 60;
}

// Solar position from the simplified NOAA/USNO equations: a fraction of a degree
// off at most, which is plenty for lighting. Azimuth is clockwise from north.
export function sunPosition(date, lat, lon) {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = 280.46 + 0.9856474 * n;
  const g = (357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const gmst = 18.697374558 + 24.06570982441908 * n;
  const ha = ((gmst * 15 + lon) % 360) * RAD - ra;
  const phi = lat * RAD;
  return {
    elevation: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha)),
    azimuth: Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha)),
  };
}

// 0 = new moon, 0.5 = full moon.
export function moonPhase(date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days / 29.530588853) % 1) + 1) % 1;
}

// North is -z and east is +x in the scene.
function toDir({ elevation, azimuth }, out) {
  return out.set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation));
}

export function newSkyState() {
  return { sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), moonPhase: 0.5 };
}

// The real sky over `place` right now.
export function realSky(date, place, out) {
  toDir(sunPosition(date, place.lat, place.lon), out.sunDir);
  out.moonPhase = moonPhase(date);
  // The moon runs about phase × 24.8 hours behind the sun across the sky.
  toDir(sunPosition(new Date(date.getTime() - out.moonPhase * 24.84 * 3600000), place.lat, place.lon), out.moonDir);
  return out;
}

// An imagined sky for a given hour: sunrise at 6, sunset at 18.
export function syntheticSky(hours, phase, out) {
  const theta = ((hours - 6) / 24) * TAU;
  out.sunDir.set(-Math.cos(theta), Math.sin(theta), -0.45).normalize();
  const m = theta - phase * TAU;
  out.moonDir.set(-Math.cos(m), Math.sin(m), -0.3).normalize();
  out.moonPhase = phase;
  return out;
}

const MOMENTS = [[6.4, 2], [9.5, 2], [13, 2], [17.4, 3], [18.7, 2], [22.5, 2], [2, 1]];

// Every other land has its own fixed vibe: a moment of the day, a moon and
// weather, all grown from its word.
export function landVibe(seed, biome) {
  const r = makeRandom(seed, 'vibe');
  return {
    hours: r.weighted(MOMENTS.map(([h, w]) => [h, w])) + r.range(-0.4, 0.4),
    moonPhase: r(),
    weather: r.weighted(biome.weather),
  };
}

// WMO weather codes, as reported by Open-Meteo.
function weatherFromCode(code, cloudCover) {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'mist';
  if (code === 3 || (code === 2 && cloudCover > 55)) return 'cloudy';
  return 'clear';
}

// Live weather for the home land. Open-Meteo is free and keyless; this is a
// plain data request, no third-party scripts.
export async function fetchWeather(place) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat.toFixed(2)}&longitude=${place.lon.toFixed(2)}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const { current } = await res.json();
  return {
    weather: weatherFromCode(current.weather_code, current.cloud_cover),
    temperature: current.temperature_2m,
    windKmh: current.wind_speed_10m,
  };
}
