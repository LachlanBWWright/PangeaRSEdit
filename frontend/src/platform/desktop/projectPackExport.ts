import { err, ok } from "neverthrow";
import type { PackLevelInput, ProjectSnapshot } from "@pangea/desktop-contracts";
import { loadProjectLevel, readProjectFiles } from "./projectLoad";
import { prepareNativeTest } from "./projectTest";
import { readBoundAssets } from "./projectAssetBindings";
import { runtimeScriptFiles } from "./runtimeScriptFiles";

function ignoreLoad() { return undefined; }
const handlers = { setGlobals: ignoreLoad, setMapFile: ignoreLoad, setMapImagesFile: ignoreLoad, setMapImages: ignoreLoad, setData: ignoreLoad };

export async function prepareProjectPack(project: ProjectSnapshot, progress: (message: string) => void) {
  if (!project.manifest.levels.length) return err("Save at least one level before exporting a playable pack");
  const shared = await readProjectFiles(project, project.files.filter((file) => file.path.startsWith("Data/") && !file.path.startsWith("Data/Scripts/")).map((file) => file.path));
  if (shared.isErr()) return err(shared.error.message);
  const levels: PackLevelInput[] = [];
  let total = 0;
  for (const level of project.manifest.levels) {
    progress(`Validating ${level.name}…`);
    const loaded = await loadProjectLevel(project, level, handlers);
    if (loaded.isErr()) return err(`${level.name}: ${loaded.error}`);
    const native = await prepareNativeTest(loaded.value);
    if (native.isErr()) return err(`${level.name}: ${native.error}`);
    const assets = await readBoundAssets(project, level.id);
    if (assets.isErr()) return err(`${level.name}: ${assets.error}`);
    const runtime = runtimeScriptFiles([...new Map([...shared.value, ...native.value.files, ...assets.value].map((file) => [file.path, file])).values()]);
    if (runtime.isErr()) return err(`${level.name}: ${runtime.error}`);
    const files = runtime.value;
    total += files.reduce((size, file) => size + file.bytes.length, 0);
    if (total > 512 * 1024 * 1024) return err("Playable pack exceeds the 512 MiB export budget");
    levels.push({ id: level.id, name: level.name, args: native.value.args, files });
  }
  return ok(levels);
}
