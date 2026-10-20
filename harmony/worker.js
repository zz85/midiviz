// Runs harmony.js off the main thread: post { id, notes, options }, get { id, result }.
import { analyze } from './harmony.js'

self.onmessage = ({ data }) => {
	const { id, notes, options } = data
	try {
		self.postMessage({ id, result: analyze(notes, options) })
	} catch (e) {
		self.postMessage({ id, error: e.message || String(e) })
	}
}
