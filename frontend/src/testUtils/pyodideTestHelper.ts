/**
 * Pyodide test helper for running rsrcdump operations in tests
 * This initializes pyodide directly (not in a worker) for testing purposes
 */

import { loadPyodide, PyodideInterface, version as pyodideVersion } from "pyodide";
import rsrcDumpUrl from "../assets/rsrcdump-0.1.0-py3-none-any.whl?url";
import { LevelData } from "@/python/structSpecs/LevelTypes";

let pyodideInstance: PyodideInterface | null = null;

/**
 * Initialize pyodide with the rsrcdump package
 * This is cached so subsequent calls return the same instance
 */
export async function initPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  console.log("Initializing Pyodide for testing...");
  const indexURL = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
  const pyodide = await loadPyodide({
    indexURL,
  });

  console.log("Pyodide initialized, loading rsrcdump package...");
  await pyodide.loadPackage(rsrcDumpUrl);

  console.log("rsrcdump package loaded, importing...");
  await pyodide.runPythonAsync("import rsrcdump");

  console.log("rsrcdump imported successfully");
  pyodideInstance = pyodide;
  return pyodide;
}

/**
 * Parse a binary buffer to JSON using pyodide
 *
 * @param buffer - The raw binary data
 * @param structSpecs - The struct specification strings
 * @param includeTypes - Types to include (empty = all)
 * @param excludeTypes - Types to exclude
 * @returns The parsed JSON object
 */
export async function parseBufferToJson(
  buffer: ArrayBuffer,
  structSpecs: string[],
  includeTypes: string[] = [],
  excludeTypes: string[] = [],
): Promise<LevelData> {
  const pyodide = await initPyodide();

  // Set buffer in global scope for pyodide to access
  const globalWithTest = globalThis as unknown as {
    testBuffer?: ArrayBuffer;
    jsonBuffer?: LevelData;
  };
  globalWithTest.testBuffer = buffer;

  await pyodide.runPythonAsync(`
    from js import testBuffer
    buffer = testBuffer.to_py()
    buffer = buffer.tobytes()
  `);

  const result = await pyodide.runPythonAsync(`rsrcdump.save_to_json(
    buffer,
    ${JSON.stringify(structSpecs)},
    ${JSON.stringify(includeTypes)},
    ${JSON.stringify(excludeTypes)}
  )`);

  return JSON.parse(result);
}

/**
 * Serialize JSON data back to binary using pyodide
 *
 * @param jsonData - The JSON object to serialize
 * @param structSpecs - The struct specification strings
 * @param onlyTypes - Types to include (empty = all)
 * @param skipTypes - Types to skip
 * @param adf - Whether to use Apple Double Format
 * @returns The serialized binary buffer
 */
export async function serializeJsonToBuffer(
  jsonData: LevelData,
  structSpecs: string[],
  onlyTypes: string[] = [],
  skipTypes: string[] = [],
  adf: boolean = true,
): Promise<ArrayBuffer> {
  const pyodide = await initPyodide();

  // Set JSON in global scope for pyodide to access
  const globalWithTest = globalThis as unknown as {
    testBuffer?: ArrayBuffer;
    jsonBuffer?: LevelData;
  };
  globalWithTest.jsonBuffer = jsonData;

  await pyodide.runPythonAsync(`
    from js import jsonBuffer
    json_buffer = jsonBuffer.to_py()
  `);

  const res = await pyodide.runPythonAsync(`rsrcdump.load_bytes_from_json(
    json_buffer,
    ${JSON.stringify(structSpecs)},
    ${JSON.stringify(onlyTypes)},
    ${JSON.stringify(skipTypes)},
    ${adf ? "True" : "False"}
  )`);

  const pyBuffer = res.getBuffer("dataview").data;
  const resBuffer = pyBuffer.buffer.slice(
    pyBuffer.byteOffset,
    pyBuffer.byteOffset + pyBuffer.byteLength,
  );

  return resBuffer;
}

/**
 * Perform a complete roundtrip test
 *
 * @param buffer - The original binary data
 * @param structSpecs - The struct specification strings
 * @returns Object with original, serialized, and roundtrip data
 */
export async function performRoundtripTest(
  buffer: ArrayBuffer,
  structSpecs: string[],
): Promise<{
  originalJson: LevelData;
  serializedBuffer: ArrayBuffer;
  roundtripJson: LevelData;
  bufferSizeMatch: boolean;
  jsonMatch: boolean;
}> {
  // Parse original buffer to JSON
  const originalJson = await parseBufferToJson(buffer, structSpecs);

  // Serialize JSON back to binary
  const serializedBuffer = await serializeJsonToBuffer(
    originalJson,
    structSpecs,
  );

  // Parse serialized buffer back to JSON
  const roundtripJson = await parseBufferToJson(serializedBuffer, structSpecs);

  // Compare sizes
  const bufferSizeMatch = buffer.byteLength === serializedBuffer.byteLength;

  // Compare JSON (simple string comparison for now)
  const jsonMatch =
    JSON.stringify(originalJson) === JSON.stringify(roundtripJson);

  return {
    originalJson,
    serializedBuffer,
    roundtripJson,
    bufferSizeMatch,
    jsonMatch,
  };
}

/**
 * Helper to read a file as ArrayBuffer (works in Node.js environment)
 * For tests running in vitest with Node.js
 */
export async function readFileAsBuffer(filePath: string): Promise<ArrayBuffer> {
  const fs = await import("fs/promises");
  const buffer = await fs.readFile(filePath);
  // Create a new ArrayBuffer and copy the data to ensure proper type
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  return arrayBuffer;
}

/**
 * Reset the pyodide instance (useful for test cleanup)
 */
export function resetPyodide(): void {
  pyodideInstance = null;
}
