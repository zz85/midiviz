// #045 desktop app: what the page may ask of the app's main process (native.cjs). The page stays sandboxed
// and isolated; it gets these calls and nothing else.
'use strict'
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('midivizNative', {
  /** which native renderers are built: { 'mu-native': true, 'rt-native': false } */
  engines: () => ipcRenderer.invoke('native:engines'),
  /** traces the scene native-scene.js encoded; resolves to { png: Uint8Array, report } */
  render: (key, manifest, buffer, options) => ipcRenderer.invoke('native:render', key, manifest, buffer, options),
  cancel: key => ipcRenderer.invoke('native:cancel', key),
  /** under run.mjs --record: writes the frame for a native render later instead of tracing it */
  record: (manifest, buffer) => ipcRenderer.invoke('native:record', manifest, buffer),
})
