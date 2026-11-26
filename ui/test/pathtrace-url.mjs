// #045 (and #049 / #050 through its plugin, or #032 as the page) address bar, headless: load each link, wait for
// the page, and record the address bar after it refreshes (every 500 ms while paused), each
// control's value and what is hidden. Run before and after a change to the settings wiring
// and diff the two files (ui/test/url-diff.mjs): a link keeps meaning the same thing.
//   node ui/test/pathtrace-url.mjs out.json [page.html]
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as pathtrace/test/stills.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/pathtrace-url.json', page = '045_pathtracer.html'] = process.argv.slice(2)
const { chromium } = await import(PW)
const fs = await import('node:fs')
const Q0 = 'q=low&hairsim=0&clothsim=0&start=0'
const LINKS = [
  '',
  'outfit=bob-cocktail&dcol=20242e&slit=hip&fabric=satin&hcol=4a3324&shoes=none',
  'look=realistic&smooth=1&simplify=1.5&dof&dofamt=2&bloom=1&bloomamt=0.3&grain=1&vig=0.8&dust=1&exposure=1.4&light=0.6',
  'gaze=hands&expr=1.5&posture=1.2&bench=10&benchh=-5&armw=0.5&touch=fall&fingering=chopin&hands=right',
  'move=orbit&dpreset=hands&pace=0.6&favour=0.8&trans=glides&dfar=0&shotnames=1&follow=1&strings=strict&dpedals=0&dopen=wide',
  'room=small&seat=front&rv=1.5&decay=1.3&tone=0.2&boost=3&amb=0.4&applause=1&vol=0.5&sf=',
  'exformat=short&exres=1280x720&exfps=12&exlen=60&excam=current&exaudio=0&extitle=none&exsub=Hello+there&excard=glow&exfont=cinzel',
  'expt=pt&ptengine=gpt-webgl&ptspp=16&ptbounces=5&pthair=0.25&ptdn=0&ptfx=1&ptsize=640x360',
  'expt=mu-webgl&exptspp=8&exptdn=0',
  'notes=off&itstyle=dry&itcol=cream&itpos=tl&itheads=0&itseed=3&view=keys&speed=1.25&loop=1',
  'scene=park&tod=3&tree=sakura&birds=0&ppaint=1',
  'scene=lake&sky=2',
  'piano=upright&finish=walnut&lid=closed&skintex=asian&fasian=0.5&vhands=real',
  'sheet=0&sstyle=ink&spos=tl&srows=3&ssize=0.8&shl=notes&svideo=0',
  'piano=upright&panel=closed&replan=0&played=hands&vel=hands&exltilt=0.5&exformat=short&exlayout=stack&exhands=lesson',
  'scene=candle&stage=candle',
]
// (#032 names the stage set ?stage=, the pathtrace pages ?scene=)
const P032 = /^032/.test(page)
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const res = {}
for (let q of LINKS) {
  if (P032) q = q.replace(/\bscene=/g, 'stage=')
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); p.setDefaultTimeout(0)
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(`${BASE}${page}?${Q0}${q ? '&' + q : ''}`)
  await p.waitForFunction(() => window.__pianist && (window.__pianist.pt || window.__stageSets), null, { timeout: 300000 })
  await p.waitForTimeout(1800)   // (the address bar refreshes every 500 ms)
  const got = await p.evaluate(() => ({
    search: location.search,
    controls: Object.fromEntries([...document.querySelectorAll('select[id], input[id]')].filter(e => e.type !== 'file' && e.id !== 'seek').map(e => [e.id, e.type === 'checkbox' ? e.checked : e.value])),
    labels: Object.fromEntries([...document.querySelectorAll('[id$="V"]')].map(e => [e.id, e.textContent])),
    hidden: [...document.querySelectorAll('select[id], input[id]')].filter(e => e.type !== 'file' && !(e.offsetParent || e.closest('.pop'))).map(e => e.id).sort(),
    shown: [...document.querySelectorAll('.pop .field, .pop .chk, .pop [id][hidden], .pop .stageCtl')].filter(e => (e.querySelector('[id]') || e).id).map(e => (e.querySelector('[id]') || e).id + ':' + (e.hidden || e.style.display === 'none' ? 'hidden' : 'shown')).sort(),
  }))
  got.errors = errs
  res[q] = got
  console.log(q || '(none)', '->', got.search, errs.length ? errs : '')
  await p.close()
}
await b.close()
fs.writeFileSync(out, JSON.stringify(res, null, 1))
console.log('wrote', out)
