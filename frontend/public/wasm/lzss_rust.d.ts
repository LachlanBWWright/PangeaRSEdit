/* tslint:disable */
/* eslint-disable */
export function wasm_lzss_compress(data: Uint8Array): Uint8Array;
export function wasm_lzss_decompress(compressed_data: Uint8Array, output_size: number): Uint8Array;
/**
 * Batch compress multiple tasks in parallel using Rayon
 */
export function wasm_lzss_compress_batch(tasks_js: any): any;
/**
 * Batch decompress multiple tasks in parallel using Rayon
 */
export function wasm_lzss_decompress_batch(tasks_js: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly wasm_lzss_compress: (a: number, b: number) => [number, number];
  readonly wasm_lzss_decompress: (a: number, b: number, c: number) => [number, number];
  readonly wasm_lzss_compress_batch: (a: any) => [number, number, number];
  readonly wasm_lzss_decompress_batch: (a: any) => [number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
