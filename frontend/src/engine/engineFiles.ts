import { err, errAsync, ok, ResultAsync, type Result } from "neverthrow";
import { engineFile, parseManifest, parseScene, replaceEngineJSON, type EngineFile, type EnginePackage } from "./enginePackage";
import { enginePathSchema } from "./engineSchemas";
import { engineTypeFiles } from "./engineLanguage";

const maximumBytes = 128 * 1024 * 1024;
export function addEngineFiles(packageData: EnginePackage, added: readonly EngineFile[]): Result<EnginePackage, string> {
  const paths = new Set(packageData.files.map((file) => file.path));
  for (const file of added) {
    if (!enginePathSchema.safeParse(file.path).success) return err(`Use a relative package path: ${file.path}`);
    if (paths.has(file.path)) return err(`A file already exists at ${file.path}. Rename it before importing another file.`);
    paths.add(file.path);
  }
  const files = [...packageData.files, ...added];
  const generated = engineTypeFiles({ files });
  const outputPaths = new Set([...files.map((file) => file.path), ...generated.map((file) => file.path), "schemas/package.schema.json", "schemas/scene.schema.json"]);
  if (outputPaths.size > 512) return err("The exported package would exceed 512 files, including generated schemas and Lua types.");
  const outputSize = files.filter((file) => !generated.some((type) => type.path === file.path)).reduce((sum, file) => sum + file.bytes.length, 0) + generated.reduce((sum, file) => sum + file.bytes.length, 0);
  if (outputSize > maximumBytes) return err("The package exceeds 128 MiB. Import smaller assets or remove unused files.");
  return ok({ files });
}

export function createEngineSource(packageData: EnginePackage, path: string) {
  if (!/\.(lua|json)$/.test(path)) return err("New source files must end in .lua or .json.");
  const text = path.endsWith(".lua") ? "local engine = require('engine')\nlocal pangea = require('pangea')\n\nreturn {}\n" : "{}\n";
  return addEngineFiles(packageData, [{ path, bytes: new TextEncoder().encode(text) }]);
}

function protectedEngineFile(packageData: EnginePackage, path: string) {
  if (path === "package.json") return "The package manifest cannot be removed or renamed.";
  const manifest = parseManifest(packageData);
  if (manifest.isErr()) return "Repair package.json before changing file paths.";
  if (manifest.value.entry === path) return "This is the package entry script. Change its path in package.json first.";
  if (manifest.value.scenes.some((scene) => scene.file === path || scene.controller.replaceAll(".", "/") + ".lua" === path)) return "This file belongs to a scene. Change its scene catalog entry in package.json first.";
  return null;
}

export function removeEngineFile(packageData: EnginePackage, path: string) {
  const protectedReason = protectedEngineFile(packageData, path);
  if (protectedReason) return err(protectedReason);
  if (!engineFile(packageData, path)) return err("The selected file no longer exists.");
  const manifest = parseManifest(packageData);
  if (manifest.isErr()) return err(manifest.error);
  for (const entry of manifest.value.scenes) {
    const file = engineFile(packageData, entry.file);
    if (!file) return err(`Repair the missing scene ${entry.file} first.`);
    const scene = parseScene(file);
    if (scene.isErr()) return err(`Repair ${entry.file} before removing files.`);
    if (scene.value.assets.some((asset) => asset.file === path)) return err(`Remove this model from ${entry.name}'s model assets first.`);
  }
  return ok({ files: packageData.files.filter((file) => file.path !== path) });
}

export function renameEngineFile(packageData: EnginePackage, path: string, nextPath: string) {
  if (path === nextPath) return ok(packageData);
  const protectedReason = protectedEngineFile(packageData, path);
  if (protectedReason) return err(protectedReason);
  if (!enginePathSchema.safeParse(nextPath).success) return err("Use a relative path without empty, dot or parent folders.");
  if (engineFile(packageData, nextPath)) return err("Another file already uses this path.");
  const file = engineFile(packageData, path);
  if (!file) return err("The selected file no longer exists.");
  const oldExtension = path.slice(path.lastIndexOf("."));
  if (!nextPath.endsWith(oldExtension)) return err("Keep the original file extension when renaming an asset or script.");
  const manifest = parseManifest(packageData);
  if (manifest.isErr()) return err(manifest.error);
  let next: EnginePackage = { files: packageData.files.map((entry) => entry.path === path ? { ...entry, path: nextPath } : entry) };
  for (const entry of manifest.value.scenes) {
    const sceneFile = engineFile(packageData, entry.file);
    if (!sceneFile) return err(`Repair the missing scene ${entry.file} first.`);
    const scene = parseScene(sceneFile);
    if (scene.isErr()) return err(`Repair ${entry.file} before renaming files.`);
    if (scene.value.assets.some((asset) => asset.file === path)) next = replaceEngineJSON(next, entry.file, { ...scene.value, assets: scene.value.assets.map((asset) => asset.file === path ? { ...asset, file: nextPath } : asset) });
  }
  return ok(next);
}

export function readEngineAssets(files: readonly File[], directory: string) {
  if (!files.length || files.length > 510 || files.reduce((sum, file) => sum + file.size, 0) > maximumBytes) return errAsync<EngineFile[], string>("Choose 1..510 files totaling at most 128 MiB.");
  return ResultAsync.combine(files.map((file) => ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}.`).map((bytes): EngineFile => ({ path: directory ? `${directory}/${file.name}` : file.name, bytes: new Uint8Array(bytes) }))));
}
