// Open-Meteo：免 key，数据 CC BY 4.0（https://open-meteo.com/）。
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_TTL = 10 * 60_000;
const GEO_TTL = 24 * 3600_000;
const HOURS = 8;

function coord(value, limit) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) throw new Error('invalid coordinates');
  return n.toFixed(2);
}

export async function getWeather(fetcher, {lat, lon, unit}) {
  const latitude = coord(lat, 90);
  const longitude = coord(lon, 180);
  const f = unit === 'f';
  const q = new URLSearchParams({
    latitude, longitude, timezone: 'auto', forecast_days: '2',
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m',
    hourly: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    ...(f ? {temperature_unit: 'fahrenheit'} : {}),
  });
  const [data, air] = await Promise.all([
    fetcher.get(`${FORECAST}?${q}`, {ttlMs: WEATHER_TTL}),
    fetcher.get(`${AIR}?${new URLSearchParams({latitude, longitude, current: 'us_aqi'})}`, {ttlMs: WEATHER_TTL}).catch(() => null),
  ]);
  const c = data?.current;
  if (!c) throw new Error('unexpected weather response');
  const hourStart = String(c.time).slice(0, 13);
  const times = data.hourly?.time ?? [];
  const from = Math.max(0, times.findIndex(t => t.slice(0, 13) >= hourStart));
  return {
    unit: f ? 'f' : 'c',
    time: c.time,
    current: {temp: c.temperature_2m, feels: c.apparent_temperature, code: c.weather_code, isDay: c.is_day === 1, humidity: c.relative_humidity_2m},
    today: {hi: data.daily?.temperature_2m_max?.[0], lo: data.daily?.temperature_2m_min?.[0]},
    hours: times.slice(from, from + HOURS).map((t, i) => ({time: t.slice(11, 16), temp: data.hourly.temperature_2m[from + i], code: data.hourly.weather_code[from + i]})),
    aqi: air?.current?.us_aqi ?? null,
  };
}

export async function searchPlaces(fetcher, {query, lang}) {
  const name = String(query ?? '').trim().slice(0, 80);
  if (name.length < 2) return [];
  const q = new URLSearchParams({name, count: '6', language: lang === 'zh' ? 'zh' : 'en', format: 'json'});
  const data = await fetcher.get(`${GEO}?${q}`, {ttlMs: GEO_TTL});
  return (data?.results ?? []).map(r => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
