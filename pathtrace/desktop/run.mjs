#!/usr/bin/env node
// Launcher for the #045 desktop app (main.cjs). Works with node or bun:
//   node pathtrace/desktop/run.mjs [--backend=llvmpipe|lavapipe|swiftshader|gpu] [--headless] [--info | --still …]
// Picks the renderer's drivers and the window platform here, because Chromium reads both
// (environment variables and --ozone-platform) before any app code runs.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = k => args.find(a => a === `--${k}` || a.startsWith(`--${k}=`))
const value = k => flag(k)?.split('=').slice(1).join('=')

// Linux without a render node has no GPU; macOS and Windows always give Chromium one to use.
const hasGpu = () => { if (process.platform !== 'linux') return true; try { return fs.readdirSync('/dev/dri').some(f => f.startsWith('renderD')) } catch { return false } }
const backend = value('backend') || (hasGpu() ? 'gpu' : findLavapipe() ? 'lavapipe' : 'llvmpipe')
if (!['llvmpipe', 'lavapipe', 'swiftshader', 'gpu'].includes(backend)) { console.error(`unknown --backend=${backend}`); process.exit(2) }
const noDisplay = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY
const batch = !!flag('still') || !!flag('info') || !!flag('video') || !!flag('export')
const headless = !!flag('headless') || batch || noDisplay

function findLavapipe() {
  const roots = [process.env.LAVAPIPE_DIR, path.join(process.env.HOME || '', '.cache/midiviz/lavapipe'), '/'].filter(Boolean)
  for (const root of roots) {
    for (const d of ['usr/share/vulkan/icd.d', 'etc/vulkan/icd.d']) {
      const dir = path.join(root, d)
      const icd = fs.existsSync(dir) && fs.readdirSync(dir).find(f => /^lvp_icd\..*json$/.test(f))
      if (icd) return { icd: path.join(dir, icd), lib: root === '/' ? null : path.join(root, 'usr/lib64') }
    }
  }
  return null
}

const env = { ...process.env }
if (backend === 'llvmpipe') {
  env.LIBGL_ALWAYS_SOFTWARE = '1'
  env.GALLIUM_DRIVER = 'llvmpipe'
  if (headless) env.EGL_PLATFORM = 'surfaceless'
} else if (backend === 'lavapipe') {
  const lvp = findLavapipe()
  if (!lvp) { console.error('lavapipe not found: install mesa-vulkan-drivers, or run pathtrace/desktop/setup-lavapipe.sh'); process.exit(2) }
  env.VK_DRIVER_FILES = env.VK_ICD_FILENAMES = lvp.icd
  if (lvp.lib) env.LD_LIBRARY_PATH = [lvp.lib, env.LD_LIBRARY_PATH].filter(Boolean).join(':')
}

let electron
try { electron = createRequire(import.meta.url)('electron') } catch {
  console.error(`Electron is not installed: (cd ${path.relative(process.cwd(), here) || '.'} && npm install)`); process.exit(2)
}
const rest = args.filter(a => !/^--(backend|headless|monitor)(=|$)/.test(a))
const argv = [here, `--backend=${backend}`, ...(headless ? ['--headless', '--ozone-platform=headless'] : []), ...rest]
if (headless && noDisplay && !batch) console.error('no display: the window runs headless; use --still or --info, or run inside a desktop session (DCV, X, Wayland)')
const child = spawn(electron, argv, { stdio: ['inherit', 'inherit', 'pipe'], env })
// Chromium logs dbus and similar noise on headless servers; keep real errors.
child.stderr.on('data', b => {
  const text = b.toString().split('\n').filter(l => l && !/dbus|ozone_platform_x11|aura\/env|vulkan_instance\.cc|gpu_init\.cc:1445|GPU stall due to ReadPixels/.test(l)).join('\n')
  if (text) process.stderr.write(text + '\n')
})
// --monitor[=file.csv]: CPU and memory of the app's processes every 5 s, a line a minute, a summary at the end.
// On by default for --video, with the CSV next to the MP4.
let monitor = null
const videoOut = flag('video') && (rest.filter(a => !a.startsWith('--'))[1] || '/tmp/pt_video')
const monitorFile = value('monitor') || (flag('monitor') || videoOut ? path.join(videoOut || '/tmp', 'monitor.csv') : null)
if (monitorFile && !flag('info')) {
  const { startMonitor } = await import('./monitor.mjs')
  fs.mkdirSync(path.dirname(monitorFile), { recursive: true })
  monitor = startMonitor(child.pid, { file: monitorFile })
}
child.on('exit', code => {
  const sum = monitor?.stop()
  if (sum) {
    console.log(`monitor: ${sum.seconds} s · CPU mean ${sum.cpuMeanCores} / peak ${sum.cpuPeakCores} of ${sum.cores} cores (GPU process ${sum.gpuProcessMeanCoresWhileTracing} while tracing)`
      + ` · memory peak ${sum.pssPeakGB} GB PSS (GPU process ${sum.pssGpuPeakGB}, page ${sum.pssRendererPeakGB}) of ${sum.memTotalGB} GB · lowest free ${sum.sysAvailMinGB} GB · ${sum.threadsPeak} threads peak`)
    console.log(`monitor: samples in ${sum.file}`)
    fs.writeFileSync(sum.file.replace(/\.csv$/, '') + '.summary.json', JSON.stringify(sum, null, 1))
  }
  process.exit(code ?? 1)
})
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s))
