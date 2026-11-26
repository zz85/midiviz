// Diff two recordings of a page's address bar and controls (ui/test/pathtrace-url.mjs,
// ui/test/duo-url.mjs): what a link became, each control's value, the value labels and
// which controls show. Exits 1 where they differ.
//   node ui/test/url-diff.mjs before.json after.json [ignoredIds,...]
import fs from 'node:fs'
const [A, B, ignore = ''] = process.argv.slice(2)
const a = JSON.parse(fs.readFileSync(A)), b = JSON.parse(fs.readFileSync(B))
const skip = new Set(ignore.split(',').filter(Boolean))
const norm = s => [...new URLSearchParams(s)].sort().map(([k, v]) => k + '=' + v).join('&')
let bad = 0
for (const k of Object.keys(a)) {
  const x = a[k], y = b[k], name = JSON.stringify(k || '(none)')
  if (!y) { console.log('MISSING', name); bad++; continue }
  if (x.search !== y.search) {
    const sameKeys = norm(x.search) === norm(y.search)
    console.log(sameKeys ? 'ORDER' : 'URL', name, '\n  before', x.search, '\n  after ', y.search)
    if (!sameKeys) bad++
  }
  for (const part of ['controls', 'labels']) for (const id of new Set([...Object.keys(x[part] || {}), ...Object.keys(y[part] || {})])) {
    if (skip.has(id)) continue
    if (x[part]?.[id] !== y[part]?.[id]) { console.log(part.toUpperCase(), name, id, JSON.stringify(x[part]?.[id]), '->', JSON.stringify(y[part]?.[id])); bad++ }
  }
  for (const part of ['hidden', 'shown']) if ((x[part] || []).join() !== (y[part] || []).join()) {
    const X = new Set(x[part] || []), Y = new Set(y[part] || [])
    console.log(part.toUpperCase(), name, 'before only:', [...X].filter(v => !Y.has(v)).join(' '), '| after only:', [...Y].filter(v => !X.has(v)).join(' ')); bad++
  }
  if (y.errors?.length) { console.log('ERRORS', name, y.errors); bad++ }
}
console.log(bad ? `${bad} differences` : 'identical')
process.exit(bad ? 1 : 0)
