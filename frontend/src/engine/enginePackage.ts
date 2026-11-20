import { err, errAsync, ok, Result, ResultAsync } from "neverthrow";
import { zipSync } from "fflate";
import { z } from "zod";
import { engineManifestSchema, enginePathSchema, engineSceneSchema } from "./engineSchemas";

export interface EngineFile { readonly path: string; readonly bytes: Uint8Array }
export interface EnginePackage { readonly files: readonly EngineFile[] }
export function isEngineSourcePath(path: string) { return /\.(lua|json|md|txt|glsl|vert|frag)$/i.test(path); }
const decoder = new TextDecoder("utf-8", { fatal: true });
export const engineFileText = Result.fromThrowable((file: EngineFile) => decoder.decode(file.bytes), () => "This file is not UTF-8 source.");
export const engineJSON = Result.fromThrowable((text: string): unknown => JSON.parse(text), () => "JSON is incomplete or invalid.");

export function engineFile(packageData: EnginePackage, path: string) { return packageData.files.find((file) => file.path === path); }
export function equalEnginePackages(left: EnginePackage, right: EnginePackage) {
  if (left === right) return true;
  if (left.files.length !== right.files.length) return false;
  const rightFiles = new Map(right.files.map((file) => [file.path, file]));
  return left.files.every((file) => {
    const other = rightFiles.get(file.path);
    return file === other || !!other && file.bytes.length === other.bytes.length && file.bytes.every((byte, index) => byte === other.bytes[index]);
  });
}
export function parseManifest(packageData: EnginePackage) {
  const file = engineFile(packageData, "package.json");
  if (!file) return err("The package needs package.json at its root.");
  if (file.bytes.length > 4 * 1024 * 1024) return err("Package JSON must fit the runtime's 4 MiB limit.");
  return engineFileText(file).andThen(engineJSON).andThen((value) => {
    const parsed = engineManifestSchema.safeParse(value);
    return parsed.success ? ok(parsed.data) : err(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
  });
}
export function parseScene(file: EngineFile) {
  if (file.bytes.length > 4 * 1024 * 1024) return err("Scene JSON must fit the runtime's 4 MiB limit.");
  return engineFileText(file).andThen(engineJSON).andThen((value) => {
    const parsed = engineSceneSchema.safeParse(value);
    if (!parsed.success) return err(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
    const scene = parsed.data;
    const { sizeX, sizeZ, chunkSize } = scene.terrain;
    const chunks = Math.ceil(Math.fround(Math.fround(sizeX) / Math.fround(chunkSize))) * Math.ceil(Math.fround(Math.fround(sizeZ) / Math.fround(chunkSize)));
    if (chunks > 512) return err("Terrain exceeds the runtime's 512 chunk limit.");
    if (scene.terrain.heights.length !== scene.terrain.samplesX * scene.terrain.samplesZ) return err("Height count must match the heightfield sample dimensions.");
    if (scene.colliders.some((box) => box.min.x >= box.max.x || box.min.y >= box.max.y || box.min.z >= box.max.z)) return err("Collider dimensions must be positive.");
    if (new Set(scene.entities.map((entity) => entity.id)).size !== scene.entities.length) return err("Entity IDs must be unique within a scene.");
    if (scene.entities.some((entity) => entity.model !== "box" && !scene.assets.some((asset) => asset.id === entity.model))) return err("Each entity model must be box or a declared scene model asset.");
    return ok(scene);
  });
}
export function validateEnginePackage(packageData: EnginePackage) {
  if (!packageData.files.length || packageData.files.length > 512 || packageData.files.reduce((sum, file) => sum + file.bytes.length, 0) > 128 * 1024 * 1024) return err("Packages must contain 1..512 files and at most 128 MiB.");
  const manifest = parseManifest(packageData);
  if (manifest.isErr()) return manifest;
  const files = new Set(packageData.files.map((file) => file.path));
  if (files.size !== packageData.files.length || packageData.files.some((file) => !enginePathSchema.safeParse(file.path).success)) return err("Package file paths must be unique, relative and stay inside the package.");
  if (!files.has(manifest.value.entry)) return err("The entry script is missing.");
  if (new Set(manifest.value.scenes.map((scene) => scene.id)).size !== manifest.value.scenes.length) return err("Scene IDs must be unique.");
  if (!manifest.value.scenes.some((scene) => scene.id === manifest.value.initialScene)) return err("The initial scene must be in the scene catalog.");
  for (const entry of manifest.value.scenes) {
    const sceneFile = engineFile(packageData, entry.file);
    if (!sceneFile) return err(`Scene file is missing: ${entry.file}`);
    const scene = parseScene(sceneFile);
    if (scene.isErr()) return err(`${entry.file}: ${scene.error}`);
    if (!files.has(entry.controller.replaceAll(".", "/") + ".lua")) return err(`Controller is missing: ${entry.controller}`);
    if (scene.value.assets.some((asset) => !files.has(asset.file))) return err(`${entry.file}: a declared model asset is missing.`);
    if (new Set(scene.value.assets.map((asset) => asset.id)).size !== scene.value.assets.length) return err(`${entry.file}: model asset IDs must be unique.`);
  }
  return manifest;
}
export function replaceEngineText(packageData: EnginePackage, path: string, content: string): EnginePackage {
  const bytes = new TextEncoder().encode(content);
  const existing = engineFile(packageData, path);
  if (!existing || existing.bytes.length === bytes.length && existing.bytes.every((byte, index) => byte === bytes[index])) return packageData;
  return { files: packageData.files.map((file) => file.path === path ? { path, bytes } : file) };
}
export function replaceEngineJSON(packageData: EnginePackage, path: string, value: unknown) {
  return replaceEngineText(packageData, path, JSON.stringify(value, null, 2) + "\n");
}
export function replaceEngineScene(packageData: EnginePackage, path: string, value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return parseScene({ path, bytes }).map((scene) => replaceEngineJSON(packageData, path, scene));
}
export function readEngineFolder(files: FileList) {
  const entries = Array.from(files);
  if (!entries.length || entries.length > 512 || entries.reduce((sum, file) => sum + file.size, 0) > 128 * 1024 * 1024) return errAsync<EnginePackage, string>("Choose a package with 1..512 files and at most 128 MiB.");
  const reads = entries.map((file) => ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`).map((bytes) => ({
    path: file.webkitRelativePath ? file.webkitRelativePath.split("/").slice(1).join("/") : file.name, bytes: new Uint8Array(bytes),
  })));
  return ResultAsync.combine(reads).map((loaded): EnginePackage => ({ files: loaded })).andThen((packageData) => validateEnginePackage(packageData).map(() => packageData));
}
export function enableEngineFolderPicker(element: HTMLInputElement | null) { element?.setAttribute("webkitdirectory", ""); }
export function prepareEngineArchive(packageData: EnginePackage) {
  const schema = Result.fromThrowable(() => ({
    "schemas/package.schema.json": new TextEncoder().encode(JSON.stringify(z.toJSONSchema(engineManifestSchema), null, 2)),
    "schemas/scene.schema.json": new TextEncoder().encode(JSON.stringify(z.toJSONSchema(engineSceneSchema), null, 2)),
  }), () => "Could not generate package schemas.")();
  return schema.andThen((schemas) => {
    const generated = Object.entries(schemas).map(([path, bytes]) => ({ path, bytes }));
    const complete = { files: [...packageData.files.filter((file) => !generated.some((schemaFile) => schemaFile.path === file.path)), ...generated] };
    return validateEnginePackage(complete).map(() => complete);
  });
}
export function exportEnginePackage(packageData: EnginePackage) {
  return prepareEngineArchive(packageData)
    .andThen((complete) => Result.fromThrowable(() => zipSync(Object.fromEntries(complete.files.map((file) => [file.path, file.bytes]))), () => "Could not build the package archive.")())
    .andThen((bytes) => Result.fromThrowable(() => {
      const copy = new Uint8Array(bytes.length); copy.set(bytes);
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/zip" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "pangea-game.zip"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, () => "Could not download the package.")());
}
