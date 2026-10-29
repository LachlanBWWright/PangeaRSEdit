import { expect, it, vi } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createBlankLevel } from "@/data/levelTemplates";
import { combineLevelData } from "@/data/utils/levelDataUtils";
import { serializeLevelDownloadBytes } from "@/data/level-io/serializeLevelBytes";
import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";
import { prepareDownloadData } from "@/editor/utils/introPromptUtils";
import { prepareNativeTest } from "./projectTest";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";

vi.mock("@/data/level-io/levelIoWorkerClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/level-io/levelIoWorkerClient")>();
  const { preparePreviewLevelBytes } = await import("@/data/level-io/serializeLevelBytes");
  return { ...original, preparePreviewWithWorker: preparePreviewLevelBytes };
});

it("serializes and reopens a real blank project level with empty required resources", async () => {
  const blank = createBlankLevel(OttoGlobals.GAME_TYPE, { width: 16, height: 16 });
  expect(blank.isOk()).toBe(true);
  if (blank.isErr()) return;
  const combined = combineLevelData(blank.value);
  expect(combined.isOk()).toBe(true);
  if (combined.isErr()) return;
  const serialized = await serializeLevelDownloadBytes({ levelData: prepareDownloadData(combined.value, OttoGlobals),
    globals: OttoGlobals, fileName: "level.ter.rsrc", mapImagesFileName: "level.ter", mapImages: [] });
  expect(serialized.isOk()).toBe(true);
  if (serialized.isErr()) return;
  const primary = serialized.value.find((file) => file.filename.endsWith(".rsrc"));
  expect(primary).toBeDefined();
  if (!primary) return;
  const buffer = new ArrayBuffer(primary.bytes.length);
  new Uint8Array(buffer).set(primary.bytes);
  const parsed = await parseLevelBytes({ levelBytes: buffer, globals: OttoGlobals });
  expect(parsed.isErr() ? parsed.error : null).toBeNull();
  if (parsed.isErr()) return;
  expect(parsed.value.levelData.Hedr[1000].obj.mapWidth).toBe(16);
  expect(parsed.value.levelData.ItCo[1000]?.data).toBe("");
  expect(parsed.value.levelData.alis[1000]?.data).toBe("");
  const native = await prepareNativeTest({ globals: OttoGlobals, data: blank.value, baseLevel: 0,
    mapFile: new File([], "level.ter.rsrc"), mapImages: [],
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)) });
  expect(native.isErr() ? native.error : null).toBeNull();
  if (native.isErr()) return;
  expect(native.value.files.every((file) => file.path.startsWith("Data/"))).toBe(true);
  expect(native.value.files.some((file) => file.path === "Data/Scripts/config/project.json")).toBe(true);
  expect(native.value.files.some((file) => file.path.endsWith(".rsrc"))).toBe(true);
});
