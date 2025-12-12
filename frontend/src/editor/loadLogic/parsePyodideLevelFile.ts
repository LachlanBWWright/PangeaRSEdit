import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import { validateLevelDataForGame } from "@/validation/validateLevelForGame";

export async function parsePyodideLevelFile(
  file: Blob,
  gameType: GlobalsInterface,
  pyodideWorker: Worker,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  const levelBuffer = await file.arrayBuffer();

  return new Promise<Result<LevelData, Error>>((resolve) => {
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

          // Apply preprocessing FIRST (converts liquid nubs from x_0/y_0 format to array format)
          const preprocessResult = preprocessJson(result, gameType);
          if (!preprocessResult.ok) {
            resolve(err(preprocessResult.error));
            return;
          }

          // Validate the preprocessed data using the appropriate game schema
          // Validation failures now throw errors for type safety
          const validationResult = validateLevelDataForGame(
            result,
            gameType.GAME_TYPE
          );
          if (!validationResult.ok) {
            resolve(
              err(
                new Error(
                  `Level validation failed for ${gameType.GAME_NAME}: ${validationResult.error.message}`
                )
              )
            );
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
