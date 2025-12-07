import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Result, ok, err } from "@/types/result";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";

export async function parsePyodideLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  pyodideWorker: Worker,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<ottoMaticLevel, Error>> {
  const levelBuffer = await file.arrayBuffer();

  return new Promise<Result<ottoMaticLevel, Error>>((resolve) => {
    pyodideWorker.postMessage({
      type: "save_to_json",
      bytes: levelBuffer,
      struct_specs: gameType.STRUCT_SPECS,
      include_types: [],
      exclude_types: [],
    } satisfies PyodideMessage);

    pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
      if (event.data.type === "save_to_json") {
        try {
          const result = event.data.result;
          // try preprocess result
          const preprocessResult = preprocessJson(result, gameType);
          if (!preprocessResult.ok) {
            resolve(err(preprocessResult.error));
            return;
          }
          setData(splitLevelData(result));
          resolve(ok(result));
        } catch (e) {
          resolve(err(e instanceof Error ? e : new Error(String(e))));
        }
      } else {
        resolve(err(new Error("Unexpected response from pyodide worker")));
      }
    };
  });
}

export default parsePyodideLevelFile;
