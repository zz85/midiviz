// Runs an AudioWorkletProcessor script in Node: a fake currentFrame / sampleRate / port
import fs from 'node:fs'
import vm from 'node:vm'

export function loadWorklet(path, sampleRate = 48000) {
  let Proc
  const ctx = {
    sampleRate, currentFrame: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { posts: [], postMessage(m) { this.posts.push(m) } } } },
    registerProcessor: (_, c) => { Proc = c },
  }
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), ctx)
  const p = new Proc()
  return {
    p, ctx,
    send: m => p.port.onmessage({ data: m }),
    at(seconds) { ctx.currentFrame = Math.round(seconds * sampleRate); p.process() },
    ccValues: () => p.port.posts.filter(m => m.type === 'cc').map(m => m.cc.value),
  }
}
