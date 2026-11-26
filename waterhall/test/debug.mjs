// debug: dump each lamp's traced texture and a wide view of the hall (node waterhall/test/debug.mjs)
const PW = process.env.PLAYWRIGHT
const { chromium } = await import(PW)
const fs = await import('node:fs')
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
page.on('pageerror', e => console.log('pageerror', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)) })
page.setDefaultTimeout(0)
await page.goto('http://127.0.0.1:8000/midiviz/032_pianist.html?shot&q=low&hairsim=0&clothsim=0&t=0&stage=hall&view=audience' + (process.env.Q || ''))
await page.waitForFunction(() => window.__shot, null, { timeout: 300000 })
await page.evaluate(() => window.__shot())
const imgs = await page.evaluate(() => {
  const P = window.__pianist, r = P.renderer, THREE = P.THREE, out = []
  for (const l of P.stageProps.hall.lamps) {
    l.update(5)
    const w = l.rt.width, h = l.rt.height, px = new Uint16Array(w * h * 4)
    r.readRenderTargetPixels(l.rt, 0, 0, w, h, px)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = ((h - 1 - y) * w + x) * 4, v = Math.min(255, THREE.DataUtils.fromHalfFloat(px[i]) * 100); im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 255 }
    g.putImageData(im, 0, 0); out.push(c.toDataURL())
  }
  return out
})
imgs.forEach((d, i) => fs.writeFileSync(`/tmp/waterhall_stage/lamp${i}.png`, Buffer.from(d.split(',')[1], 'base64')))
for (const [name, pos, look] of [['wide_x', [1300, 300, 900], [-1500, 400, -300]], ['wide_z', [900, 250, 1300], [-200, 400, -1500]]]) {
  await page.evaluate(([pos, look]) => {
    const P = window.__pianist, c = P.camera
    window.__freeze = true
    c.position.set(...pos); c.lookAt(...look); c.fov = 60; c.updateProjectionMatrix()
    P.director && (P.director.enabled = false)
    P.renderer.render(P.scene, c)
  }, [pos, look])
  fs.writeFileSync(`/tmp/waterhall_stage/${name}.png`, await page.screenshot())
}
await browser.close()
