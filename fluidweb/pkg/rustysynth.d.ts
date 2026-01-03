/* tslint:disable */
/* eslint-disable */

export class OutputDevice {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Closes the output device and release all system resources occupied by it. Any calls of this
   * method after the device was closed does nothing.
   */
  close(): void;
}

export class RustySynth {
  free(): void;
  [Symbol.dispose](): void;
  constructor(sf2_data: Uint8Array, sample_rate: number);
  note_on(channel: number, key: number, velocity: number): void;
  note_off(channel: number, key: number): void;
  program_change(channel: number, program: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_rustysynth_free: (a: number, b: number) => void;
  readonly rustysynth_new: (a: number, b: number, c: number) => [number, number, number];
  readonly rustysynth_note_on: (a: number, b: number, c: number, d: number) => void;
  readonly rustysynth_note_off: (a: number, b: number, c: number) => void;
  readonly rustysynth_program_change: (a: number, b: number, c: number) => void;
  readonly __wbg_outputdevice_free: (a: number, b: number) => void;
  readonly outputdevice_close: (a: number) => void;
  readonly wasm_bindgen__convert__closures_____invoke__ha03fd0a862b819c0: (a: number, b: number) => void;
  readonly wasm_bindgen__closure__destroy__h7fb8090f87f9b617: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
