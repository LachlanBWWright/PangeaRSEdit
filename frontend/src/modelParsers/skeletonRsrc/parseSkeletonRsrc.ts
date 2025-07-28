import { skeletonSpecs } from "../../python/structSpecs/skeleton/skeleton";

import type {
  PyodideMessage,
  PyodideResponse,
} from "../../python/pyodideWorker";

/**
 * Parse a skeleton resource using the pyodide worker and skeletonSpecs
 * @param pyodideWorker The initialized Pyodide web worker
 * @param bytes The JSON data to parse (object or array)
 * @returns Promise resolving to the parsed ArrayBuffer result
 */
export function parseSkeletonRsrc({
  pyodideWorker,
  bytes,
}: {
  pyodideWorker: Worker;
  bytes: ArrayBuffer;
  only_types?: string[];
  skip_types?: string[];
  adf?: "True" | "False";
}): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    pyodideWorker.postMessage({
      type: "save_to_json",
      bytes,
      struct_specs: skeletonSpecs,
      include_types: [],
      exclude_types: [],
    } satisfies PyodideMessage);
    console.log("Sent save_to_json message to pyodide worker");

    pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
      if (event.data.type === "save_to_json") {
        resolve(event.data.result);
      } else {
        reject(new Error("Unexpected response from pyodide worker"));
      }
    };
  });
}
