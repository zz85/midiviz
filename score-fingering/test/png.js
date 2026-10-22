// Minimal PNG codec for the tests and tools (node / bun only; the browser uses canvas).
// Decodes 8-bit gray, gray+alpha, RGB, RGBA (non-interlaced) to 8-bit gray;
// encodes 8-bit gray.
import zlib from 'zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodeGray(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a png');
  let o = 8, w = 0, h = 0, depth = 0, ctype = 0, inter = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; inter = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8 || inter) throw new Error(`unsupported png depth=${depth} interlace=${inter}`);
  const bpp = { 0: 1, 4: 2, 2: 3, 6: 4 }[ctype];
  if (!bpp) throw new Error('unsupported color type ' + ctype);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp;
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const i = x * bpp;
      let g = bpp >= 3 ? (cur[i] * 77 + cur[i + 1] * 150 + cur[i + 2] * 29) >> 8 : cur[i];
      const alpha = bpp === 2 ? cur[i + 1] : bpp === 4 ? cur[i + 3] : 255;
      if (alpha < 255) g = (g * alpha + 255 * (255 - alpha)) / 255; // composite on white
      out[y * w + x] = g;
    }
    prev.set(cur);
  }
  return { w, h, data: out };
}

function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodeGray({ w, h, data }) {
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; raw.set(data.subarray(y * w, (y + 1) * w), y * (w + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function encodeRGB({ w, h, data }) { // data: Uint8Array w*h*3
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; raw.set(data.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
