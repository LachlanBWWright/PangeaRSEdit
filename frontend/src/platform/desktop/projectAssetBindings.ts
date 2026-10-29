import { err, ok } from "neverthrow";
import { fileSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { readProjectFiles } from "./projectLoad";
import { validateUploadedScriptAssetAsync } from "@/editor/subviews/scripts/scriptAssetValidation";
import { desktopRequest } from "./client";
import { replaceTgaPalette } from "./replaceTgaPalette";

export function nativeAssetExtension(path: string) { return path.endsWith(".skeleton.rsrc") ? "skeleton.rsrc" : path.split(".").at(-1)?.toLowerCase(); }

export async function readBoundAssets(project: ProjectSnapshot, levelId: string | null) {
  const bindings = (project.manifest.assetBindings ?? []).filter((binding) => binding.levels.length === 0 || levelId !== null && binding.levels.includes(levelId));
  if (new Set(bindings.map((binding) => binding.target)).size !== bindings.length) return err("Two asset assignments replace the same target in this level");
  if (bindings.some((binding) => nativeAssetExtension(binding.source) !== nativeAssetExtension(binding.target))) return err("Native asset replacements must use the target's format");
  const source = await readProjectFiles(project, [...new Set(bindings.map((binding) => binding.source))]);
  if (source.isErr()) return err(source.error.message);
  const files = [];
  for (const binding of bindings) {
    const file = source.value.find((file) => file.path === binding.source);
    if (!file) return err(`Missing replacement asset: ${binding.source}`);
    if (file.bytes.length > 16 * 1024 * 1024) return err("Replacement assets must be at most 16 MiB");
    if (binding.mode === "palette") {
      if (!binding.target.toLowerCase().endsWith(".tga")) return err("Palettes can only be assigned to TGA images");
      const original = await desktopRequest({ operation: "games.asset-read", game: project.manifest.game, path: binding.target }, fileSchema);
      if (original.isErr()) return err(original.error.message);
      const combined = replaceTgaPalette(file.bytes, original.value.bytes);
      if (combined.isErr()) return err(combined.error);
      files.push({ path: binding.target, bytes: combined.value });
      continue;
    }
    if (/\.(bg3d|3dmf|shapes)$|\.skeleton\.rsrc$/i.test(binding.source)) {
      const validated = await validateUploadedScriptAssetAsync(`Data/Scripts/assets/project/${binding.source.split("/").at(-1)}`, file.bytes);
      if (validated.isErr()) return err(validated.error);
    }
    files.push({ path: binding.target, bytes: file.bytes });
  }
  return ok(files);
}
