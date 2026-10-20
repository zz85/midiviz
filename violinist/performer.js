// Recorded performers for #037 Violinist and #038 Duo (and #034): the
// performances in violinist/performances (strings/expression.js), put on a
// piece's violin notes, with the rest of the piece retimed to follow.
//
//   performersFor(file)  [{ rec, violinist, licence, ensemble, … }] for a menu
//   applyPerformer(id, violin, others, { engine })
//     violin: the piece's violin notes ({ pitch, q, on, off, velocity }),
//     changed in place to the recorded timing, velocities (from the recorded
//     dynamics, for engines that read velocity) and pitch curves (n.rec);
//     others: any other notes with q (accompaniment), retimed in place along
//     the recording's tempo map. Returns { rec (metadata), expression (the lane
//     for performance.js, or a timing-only marker for ensemble recordings) } or
//     null when this performance does not fit these notes.
import { applyRecording, tempoMapOf } from '../strings/expression.js'

let index = null
const cache = new Map()
const load = (base, id) => { if (!cache.has(id)) cache.set(id, fetch(`${base}${id}.json`).then(r => r.json()).catch(e => { cache.delete(id); throw e })); return cache.get(id) }

export async function performersFor(file, base = 'violinist/performances/') {
  index ??= fetch(base + 'index.json').then(r => r.json()).catch(() => [])
  return (await index).filter(p => p.file === file)
}

/** Velocity (0…1, as GM engines read it) from a dynamics lane at time t (performance.js's mapping). */
export function velocityAt(ex, t) {
  if (!ex?.dyn) return null
  const k = Math.max(0, Math.min(ex.dyn.length - 1, Math.round((t + 0.06) * ex.rate)))
  return Math.max(0.05, Math.min(1, 0.7 + (ex.dyn[k] - 0.55) / 1.2))
}

export async function applyPerformer(id, violin, others = [], { engine = 'source', base = 'violinist/performances/' } = {}) {
  const rec = await load(base, id)
  const expression = applyRecording(rec, violin, { engine })
  if (!expression) return null
  // velocities for sample engines: the recorded dynamics at each onset
  if (expression.dyn) for (const n of violin) n.velocity = velocityAt(expression, n.on)
  // the accompaniment follows the recording's tempo map (an ensemble recording's
  // own, of every part; a solo recording's from the violin's notes)
  if (others.length) {
    const t = tempoMapOf(rec, violin)
    for (const n of others) { const on = t(n.q), off = t(n.q + n.dq); n.on = on; n.off = Math.max(on + 0.03, off) }
  }
  return { rec, expression }
}

/** One line of credit for a page (pitch: false for a page whose violin does not play the pitch curves, a GM soundfont). */
export const performerCredit = (r, { pitch = true } = {}) => !r ? '' : `${r.violinist}${r.year ? ` (${r.year})` : ''}: ${r.ensemble ? 'timing' : pitch ? 'timing, dynamics and pitch' : 'timing and dynamics'} from the recording (${r.licence}${r.url ? `, <a href="${r.url}" target="_blank" rel="noopener">source</a>` : ''})`
