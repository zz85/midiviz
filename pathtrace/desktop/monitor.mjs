// CPU and memory of a process tree, sampled from /proc (Linux only).
//   const m = startMonitor(pid, { file: 'monitor.csv', everyMs: 5000, printEveryMs: 60000 })   ...   m.stop() -> summary
// CPU is in cores (1.0 = one core busy). Memory is PSS (proportional set size): shared pages are split
// between the processes that map them, so the per-process figures add up instead of counting
// Chromium's shared libraries once per process the way RSS does.
import fs from 'node:fs'

const TICK = 100 // USER_HZ, 100 on every Linux this runs on
const read = f => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }

function processes() {
  const all = []
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue
    const stat = read(`/proc/${d}/stat`)
    if (!stat) continue
    const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ')   // fields from 3 (state) on
    all.push({ pid: +d, ppid: +f[1], ticks: +f[11] + +f[12], threads: +f[17] })
  }
  return all
}

function tree(root, all) {
  const kids = new Map()
  for (const p of all) (kids.get(p.ppid) || kids.set(p.ppid, []).get(p.ppid)).push(p)
  const out = [], stack = [...(kids.get(root) || []), ...all.filter(p => p.pid === root)]
  while (stack.length) { const p = stack.pop(); out.push(p); stack.push(...(kids.get(p.pid) || [])) }
  return out
}

const role = pid => {
  const cmd = read(`/proc/${pid}/cmdline`) || ''
  const t = /--type=([\w-]+)/.exec(cmd)?.[1]
  return t === 'gpu-process' ? 'gpu' : t === 'renderer' ? 'renderer' : t ? 'other' : /electron/.test(cmd) ? 'main' : 'other'
}
const pssMB = pid => { const m = /^Pss:\s+(\d+) kB/m.exec(read(`/proc/${pid}/smaps_rollup`) || ''); return m ? +m[1] / 1024 : 0 }
const meminfo = k => +(new RegExp(`^${k}:\\s+(\\d+) kB`, 'm').exec(read('/proc/meminfo') || '')?.[1] || 0) / 1024

export function startMonitor(rootPid, { file, everyMs = 5000, printEveryMs = 60000, log = s => process.stderr.write(s + '\n') } = {}) {
  const cores = fs.readdirSync('/sys/devices/system/cpu').filter(d => /^cpu\d+$/.test(d)).length
  const memTotal = meminfo('MemTotal')
  const prev = new Map()
  let prevAt = performance.now(), lastPrint = 0
  const t0 = Date.now()
  const rows = []
  const cols = ['t_s', 'cpu_cores', 'cpu_gpu', 'cpu_renderer', 'pss_mb', 'pss_gpu_mb', 'pss_renderer_mb', 'threads', 'procs', 'sys_avail_mb']
  if (file) fs.writeFileSync(file, cols.join(',') + '\n')
  function sample() {
    const now = performance.now(), dt = (now - prevAt) / 1000
    prevAt = now
    const procs = tree(rootPid, processes())
    const r = { t_s: Math.round((Date.now() - t0) / 1000), cpu_cores: 0, cpu_gpu: 0, cpu_renderer: 0, pss_mb: 0, pss_gpu_mb: 0, pss_renderer_mb: 0, threads: 0, procs: procs.length, sys_avail_mb: Math.round(meminfo('MemAvailable')) }
    const seen = new Map()
    for (const p of procs) {
      const cpu = prev.has(p.pid) ? Math.max(0, p.ticks - prev.get(p.pid)) / TICK / dt : 0
      seen.set(p.pid, p.ticks)
      const mem = pssMB(p.pid), who = role(p.pid)
      r.cpu_cores += cpu; r.pss_mb += mem; r.threads += p.threads
      if (who === 'gpu') { r.cpu_gpu += cpu; r.pss_gpu_mb += mem }
      if (who === 'renderer') { r.cpu_renderer += cpu; r.pss_renderer_mb += mem }
    }
    prev.clear(); for (const [k, v] of seen) prev.set(k, v)
    for (const k of ['cpu_cores', 'cpu_gpu', 'cpu_renderer']) r[k] = +r[k].toFixed(2)
    for (const k of ['pss_mb', 'pss_gpu_mb', 'pss_renderer_mb']) r[k] = Math.round(r[k])
    if (rows.length || r.t_s > 0) rows.push(r)   // (the first sample has no CPU baseline)
    if (file) fs.appendFileSync(file, cols.map(c => r[c]).join(',') + '\n')
    if (printEveryMs && Date.now() - lastPrint >= printEveryMs) {
      lastPrint = Date.now()
      log(`  [monitor ${r.t_s} s] CPU ${r.cpu_cores.toFixed(1)} of ${cores} cores (GPU process ${r.cpu_gpu.toFixed(1)}) · memory ${(r.pss_mb / 1024).toFixed(2)} GB (GPU process ${(r.pss_gpu_mb / 1024).toFixed(2)} GB) · ${r.threads} threads · ${(r.sys_avail_mb / 1024).toFixed(0)} GB free`)
    }
  }
  sample()
  const timer = setInterval(sample, everyMs)
  return {
    stop() {
      clearInterval(timer)
      if (!rows.length) return null
      const mean = k => rows.reduce((a, r) => a + r[k], 0) / rows.length, peak = k => Math.max(...rows.map(r => r[k]))
      const busy = rows.filter(r => r.cpu_gpu > 1)
      return {
        seconds: rows.at(-1).t_s, samples: rows.length, cores, memTotalGB: +(memTotal / 1024).toFixed(1),
        cpuMeanCores: +mean('cpu_cores').toFixed(1), cpuPeakCores: +peak('cpu_cores').toFixed(1),
        gpuProcessMeanCoresWhileTracing: busy.length ? +(busy.reduce((a, r) => a + r.cpu_gpu, 0) / busy.length).toFixed(1) : 0,
        pssPeakGB: +(peak('pss_mb') / 1024).toFixed(2), pssGpuPeakGB: +(peak('pss_gpu_mb') / 1024).toFixed(2), pssRendererPeakGB: +(peak('pss_renderer_mb') / 1024).toFixed(2),
        threadsPeak: peak('threads'), sysAvailMinGB: +(Math.min(...rows.map(r => r.sys_avail_mb)) / 1024).toFixed(1), file,
      }
    },
  }
}
