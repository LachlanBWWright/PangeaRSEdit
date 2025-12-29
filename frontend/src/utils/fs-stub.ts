/**
 * Stub for fs/promises module used by rsrcdump-ts
 * This is only needed because rsrcdump-ts imports it at the top level
 * but we never call the functions that use it (we pass Uint8Array data directly)
 */

export async function readFile(_path: string): Promise<Buffer> {
  throw new Error('fs/promises.readFile is not available in browser');
}
