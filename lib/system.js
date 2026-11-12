import {cpus, freemem, homedir, loadavg, platform, totalmem, uptime} from 'node:os';
import {readFile, statfs} from 'node:fs/promises';
import {text} from './exec.js';

const SAMPLE_MS = 5000;
const RING = 60;
const IDLE_MS = 60_000;
const BATTERY_TTL = 60_000;

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of cpus()) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return {idle, total};
}

export function parseVmStat(out, total) {
  const page = Number(/page size of (\d+) bytes/.exec(out)?.[1]) || 4096;
  const pages = name => Number(new RegExp(`${name}:\\s+(\\d+)`).exec(out)?.[1]) || 0;
  const used = (pages('Pages active') + pages('Pages wired down') + pages('Pages occupied by compressor')) * page;
  return used > 0 ? Math.min(used, total) : null;
}

export function parseMeminfo(out) {
  const kb = name => Number(new RegExp(`^${name}:\\s+(\\d+)`, 'm').exec(out)?.[1]);
  const total = kb('MemTotal');
  const avail = kb('MemAvailable');
  return Number.isFinite(total) && Number.isFinite(avail) ? (total - avail) * 1024 : null;
}

export function parsePmset(out) {
  const m = /(\d+)%;\s*([^;\n]+)(?:;\s*([^\n]*))?/.exec(out);
  if (!m) return null;
  const state = m[2].trim().toLowerCase();
  const remain = /(\d+):(\d{2}) remaining/.exec(m[3] ?? '');
  const minutes = remain ? Number(remain[1]) * 60 + Number(remain[2]) : null;
  return {
    percent: Number(m[1]),
    charging: state === 'charging',
    plugged: /ac power/i.test(out) || ['charging', 'charged', 'finishing charge'].includes(state),
    minutes: minutes || null,
  };
}

export function createSystem({run, now = Date.now, os = platform(), home = homedir()} = {}) {
  const ring = [];
  let prev = cpuTimes();
  let timer = null;
  let lastAsk = 0;
  let battery = {at: 0, value: undefined};
  let latest = null;
  let job = null;

  async function memoryUsed(total) {
    try {
      if (os === 'darwin' && run) return parseVmStat(text(await run('vm_stat', [], {timeoutMs: 3000})), total) ?? total - freemem();
      if (os === 'linux') return parseMeminfo(await readFile('/proc/meminfo', 'utf8')) ?? total - freemem();
    } catch {}
    return total - freemem();
  }

  async function readBattery() {
    if (battery.at && now() - battery.at < BATTERY_TTL) return battery.value;
    let value = null;
    try {
      if (os === 'darwin' && run) value = parsePmset(text(await run('pmset', ['-g', 'batt'], {timeoutMs: 3000})));
      else if (os === 'linux') {
        const base = '/sys/class/power_supply/BAT0';
        const [cap, status] = await Promise.all([readFile(`${base}/capacity`, 'utf8'), readFile(`${base}/status`, 'utf8')]);
        const s = status.trim().toLowerCase();
        value = {percent: Number(cap), charging: s === 'charging', plugged: s !== 'discharging', minutes: null};
      }
    } catch {}
    battery = {at: now(), value};
    return value;
  }

  async function readDisk() {
    try {
      const s = await statfs(home);
      return {total: s.blocks * s.bsize, free: s.bavail * s.bsize};
    } catch { return null; }
  }

  async function sample() {
    const cur = cpuTimes();
    const dt = cur.total - prev.total;
    const cpu = dt > 0 ? Math.max(0, Math.min(1, 1 - (cur.idle - prev.idle) / dt)) : 0;
    prev = cur;
    const total = totalmem();
    const used = await memoryUsed(total);
    ring.push({cpu, mem: used / total});
    if (ring.length > RING) ring.splice(0, ring.length - RING);
    latest = {cpu, used, total};
  }
  const sampleOnce = () => (job ??= sample().finally(() => { job = null; }));
  const tick = () => {
    if (now() - lastAsk > IDLE_MS) { clearInterval(timer); timer = null; return; }
    sampleOnce();
  };

  return {
    async get() {
      lastAsk = now();
      if (!latest) {
        if (cpuTimes().total - prev.total < cpus().length * 20) await new Promise(r => setTimeout(r, 300));
        await sampleOnce();
      }
      if (!timer) { timer = setInterval(tick, SAMPLE_MS); timer.unref?.(); }
      const [disk, bat] = await Promise.all([readDisk(), readBattery()]);
      return {
        cpu: latest.cpu,
        cores: cpus().length,
        memory: {used: latest.used, total: latest.total},
        disk,
        battery: bat,
        load: loadavg(),
        uptime: uptime(),
        history: ring.map(r => [Math.round(r.cpu * 1000) / 1000, Math.round(r.mem * 1000) / 1000]),
        sampleMs: SAMPLE_MS,
      };
    },
    stop() { clearInterval(timer); timer = null; },
  };
}
