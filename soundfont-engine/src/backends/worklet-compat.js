// What SpessaSynth's processor needs of an AudioWorkletGlobalScope that older
// Chromium (130 here) lacks, loaded with audioWorklet.addModule before it:
// - registerProcessor accepting a class whose `process` is an instance field:
//   Chromium wants a callable `process` on the prototype and otherwise refuses
//   the class, so 'spessasynth-worklet-processor' is never defined. A stand-in
//   on the prototype satisfies the check; each instance's own field shadows it
// - TextDecoder / TextEncoder, which it reads soundfont names and text chunks with
if (typeof globalThis.registerProcessor === 'function' && !globalThis.registerProcessor.compat) {
  const register = globalThis.registerProcessor
  globalThis.registerProcessor = function (name, cls) {
    if (cls && typeof cls.prototype.process !== 'function') cls.prototype.process = function () { return true }
    return register(name, cls)
  }
  globalThis.registerProcessor.compat = true
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    constructor(label = 'utf-8') {
      const l = String(label).toLowerCase().replace(/[^a-z0-9]/g, '')
      this.encoding = l === 'utf16le' || l === 'utf16' ? 'utf-16le' : l === 'utf8' || l === 'unicode11utf8' ? 'utf-8' : 'windows-1252'
    }
    decode(input) {
      if (input == null) return ''
      const b = input instanceof Uint8Array ? input : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : new Uint8Array(input)
      let s = ''
      if (this.encoding === 'utf-16le') { for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] | b[i + 1] << 8); return s }
      if (this.encoding !== 'utf-8') { for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s }
      for (let i = 0; i < b.length;) {
        const c = b[i++]
        let cp = c
        if (c >= 0xf0 && i + 2 < b.length + 1) { cp = (c & 7) << 18 | (b[i++] & 63) << 12 | (b[i++] & 63) << 6 | b[i++] & 63 }
        else if (c >= 0xe0) { cp = (c & 15) << 12 | (b[i++] & 63) << 6 | b[i++] & 63 }
        else if (c >= 0xc0) { cp = (c & 31) << 6 | b[i++] & 63 }
        else if (c >= 0x80) cp = 0xfffd
        s += String.fromCodePoint(cp > 0x10ffff || Number.isNaN(cp) ? 0xfffd : cp)
      }
      return s
    }
  }
}
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    get encoding() { return 'utf-8' }
    encode(str = '') {
      const out = []
      for (const ch of String(str)) {
        const cp = ch.codePointAt(0)
        if (cp < 0x80) out.push(cp)
        else if (cp < 0x800) out.push(0xc0 | cp >> 6, 0x80 | cp & 63)
        else if (cp < 0x10000) out.push(0xe0 | cp >> 12, 0x80 | cp >> 6 & 63, 0x80 | cp & 63)
        else out.push(0xf0 | cp >> 18, 0x80 | cp >> 12 & 63, 0x80 | cp >> 6 & 63, 0x80 | cp & 63)
      }
      return new Uint8Array(out)
    }
  }
}
