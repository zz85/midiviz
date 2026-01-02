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

export class Synth {
  free(): void;
  [Symbol.dispose](): void;
  constructor(sf2_data: Uint8Array, sample_rate: number);
  note_on(channel: number, key: number, velocity: number): void;
  note_off(channel: number, key: number): void;
}

export class SynthManual {
  free(): void;
  [Symbol.dispose](): void;
  constructor(sf2_data: Uint8Array, sample_rate: number);
  note_on(channel: number, key: number, velocity: number): void;
  note_off(channel: number, key: number): void;
  render(left: Float32Array, right: Float32Array): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_synth_free: (a: number, b: number) => void;
  readonly synth_new: (a: number, b: number, c: number) => [number, number, number];
  readonly synth_note_on: (a: number, b: number, c: number, d: number) => void;
  readonly synth_note_off: (a: number, b: number, c: number) => void;
  readonly __wbg_synthmanual_free: (a: number, b: number) => void;
  readonly synthmanual_new: (a: number, b: number, c: number) => [number, number, number];
  readonly synthmanual_note_on: (a: number, b: number, c: number, d: number) => void;
  readonly synthmanual_note_off: (a: number, b: number, c: number) => void;
  readonly synthmanual_render: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
  readonly __wbg_outputdevice_free: (a: number, b: number) => void;
  readonly outputdevice_close: (a: number) => void;
  readonly wasm_bindgen__convert__closures_____invoke__hced286be6545c1a4: (a: number, b: number) => void;
  readonly wasm_bindgen__closure__destroy__h3d0c7cb23895baae: (a: number, b: number) => void;
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
