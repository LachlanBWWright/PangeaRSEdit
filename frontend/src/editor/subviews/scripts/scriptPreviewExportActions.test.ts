import { describe, expect, it, vi } from "vitest";
import { strToU8, unzipSync } from "fflate";
import { okAsync } from "neverthrow";
import { createBlankLevel } from "@/data/levelTemplates";
import { OttoGlobals } from "@/data/globals/globals";

vi.mock("@/data/level-io/levelIoWorkerClient", () => ({
  serializeDownloadWithWorker: vi.fn(() => okAsync({
    type: "serialized-download",
    requestId: "test",
    files: [
      {
        filename: "EarthFarm.ter",
        extension: ".ter",
        bytes: strToU8("terrain-bytes"),
      },
      {
        filename: "EarthFarm.ter.rsrc",
        extension: ".rsrc",
        bytes: strToU8("resource-bytes"),
      },
    ],
  })),
}));
import {
  buildExtendedLevelArchive,
  buildOriginalCompatibleArchive,
} from "./scriptPreviewExportActions";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
} from "./scriptWorkspaceState";

describe("script preview export actions", () => {
  it("packages original level files and preserves scripts in extended archives", async () => {
    const blankResult = createBlankLevel(OttoGlobals.GAME_TYPE, {
      width: 16,
      height: 16,
    });
    expect(blankResult.isOk()).toBe(true);
    if (blankResult.isErr()) return;

    const params = {
      ...blankResult.value,
      globals: OttoGlobals,
      levelNumber: 1,
      mapImages: [],
    };
    const originalResult = await buildOriginalCompatibleArchive(params);
    expect(originalResult.isOk()).toBe(true);
    if (originalResult.isErr()) return;

    const originalFiles = unzipSync(originalResult.value);
    expect(Array.from(originalFiles["EarthFarm.ter"] ?? [])).toEqual(
      Array.from(strToU8("terrain-bytes")),
    );
    expect(Array.from(originalFiles["EarthFarm.ter.rsrc"] ?? [])).toEqual(
      Array.from(strToU8("resource-bytes")),
    );

    const extendedResult = await buildExtendedLevelArchive({
      ...params,
      compiledState: loadScriptSample(
        createScriptWorkspaceContext(OttoGlobals, 1),
        "hover-beacon",
      ),
    });
    expect(extendedResult.isOk()).toBe(true);
    if (extendedResult.isErr()) return;
    const extendedFiles = unzipSync(extendedResult.value);
    expect(Object.keys(extendedFiles).some((path) => path.startsWith("Original/"))).toBe(true);
    expect(extendedFiles["Data/Scripts/config/manifest.json"]).toBeDefined();
  });
});
