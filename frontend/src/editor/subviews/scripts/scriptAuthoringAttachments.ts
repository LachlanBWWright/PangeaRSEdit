import { strFromU8, strToU8 } from "fflate";
import { err, ok, Result, type Result as Outcome } from "neverthrow";
import { z } from "zod";
import { portableAssetsSchema, projectAssetSchema, type PortableAssets } from "@pangea/desktop-contracts";
import { desktopBridge, desktopRequest } from "@/platform/desktop/client";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptLibrary } from "./scriptLibrary";
import { definitionAssetPaths } from "./scriptDefinitionDependencies";

const root = "EditableAssets/";
const manifestPath = `${root}assets.json`;
const manifestSchema = portableAssetsSchema.omit({ files: true }).extend({ files: z.array(z.string()).max(8192) });

export interface ScriptAuthoringExportOptions { readonly includeAuthoringSources?: boolean }

export function sameScriptAuthoringAssets(left: PortableAssets | null | undefined, right: PortableAssets | null | undefined): boolean {
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  if (JSON.stringify(left.assets) !== JSON.stringify(right.assets) || JSON.stringify(left.warnings) !== JSON.stringify(right.warnings)
    || left.files.length !== right.files.length) return false;
  const files = new Map(right.files.map((file) => [file.path, file.bytes]));
  return left.files.every((file) => {
    const bytes = files.get(file.path);
    return bytes !== undefined && bytes.length === file.bytes.length
      && (bytes === file.bytes || bytes.every((byte, index) => byte === file.bytes[index]));
  });
}

export async function collectScriptAuthoringAssets(state: ScriptWorkspaceState, options: ScriptAuthoringExportOptions): Promise<Outcome<PortableAssets | null, string>> {
  const ids = [...new Set(state.customObjects.flatMap((object) => object.assetId ? [object.assetId] : []))];
  if (!ids.length) return ok(null);
  if (!desktopBridge()) {
    const retained = state.authoringAssets;
    const missing = ids.find((id) => !retained?.assets.some((asset) => asset.id === id));
    if (missing || !retained) return err("The editable asset record is missing. Import its original object archive before exporting.");
    const assets = retained.assets.filter((asset) => ids.includes(asset.id));
    const files = retained.files.filter((file) => assets.some((asset) => asset.outputs.files.includes(file.path)
      || options.includeAuthoringSources && file.path.startsWith(`AuthoringSources/${asset.id}/`)));
    return ok({ ...retained, assets, files });
  }
  const result = await desktopRequest({ operation: "assets.export-bundle", ids, includeSources: options.includeAuthoringSources ?? false }, portableAssetsSchema);
  return result.mapErr((error) => error.message);
}

export function authoringArchiveFiles(attachment: PortableAssets | null): Record<string, Uint8Array> {
  if (!attachment) return {};
  const entries: Record<string, Uint8Array> = {
    [manifestPath]: strToU8(JSON.stringify({ ...attachment, files: attachment.files.map((file) => file.path) }, null, 2)),
  };
  for (const file of attachment.files) entries[`${root}${file.path}`] = file.bytes;
  return entries;
}

export function readAuthoringArchiveFiles(entries: Readonly<Record<string, Uint8Array>>): Outcome<PortableAssets | null, string> {
  const bytes = entries[manifestPath];
  if (!bytes) return Object.keys(entries).some((path) => path.startsWith(root)) ? err("Editable asset metadata is missing.") : ok(null);
  if (bytes.byteLength > 8 * 1024 * 1024) return err("Editable asset metadata exceeds 8 MiB.");
  const json = Result.fromThrowable((): unknown => JSON.parse(strFromU8(bytes)), () => "Invalid editable asset metadata.")();
  if (json.isErr()) return err(json.error);
  const manifest = manifestSchema.safeParse(json.value);
  if (!manifest.success) return err("Invalid editable asset records.");
  const files = [];
  let total = 0;
  for (const path of manifest.data.files) {
    const data = entries[`${root}${path}`];
    if (!data) return err(`Missing editable asset file: ${path}`);
    total += data.byteLength;
    if (total > 512 * 1024 * 1024) return err("Editable assets exceed 512 MiB.");
    files.push({ path, bytes: data });
  }
  const attachment = portableAssetsSchema.safeParse({ ...manifest.data, files });
  if (!attachment.success) return err("Invalid editable asset file paths or sizes.");
  const declared = new Set([manifestPath, ...manifest.data.files.map((path) => `${root}${path}`)]);
  if (Object.keys(entries).some((path) => path.startsWith(root) && !declared.has(path))) return err("Undeclared editable asset file.");
  return ok(attachment.data);
}

export async function restoreScriptAuthoringAssets(attachment: PortableAssets | null | undefined): Promise<Outcome<void, string>> {
  if (!attachment?.assets.length) return ok(undefined);
  if (!desktopBridge()) return err("Open a desktop project to restore editable asset records and sources.");
  return (await desktopRequest({ operation: "assets.import-bundle", attachment }, z.array(projectAssetSchema))).map(() => undefined).mapErr((error) => error.message);
}

export function selectedScriptAuthoringAssets(library: ScriptLibrary, accepted: ReadonlySet<string>): PortableAssets | null {
  const attachment = library.authoringAssets;
  if (!attachment) return null;
  const ids = new Set(library.manifest.objects.flatMap((object) =>
    accepted.has(`object:${object.id}`) && object.assetId ? [object.assetId] : []));
  for (const object of library.manifest.objects) {
    if (object.assetId && definitionAssetPaths(object).some((path) => accepted.has(`asset:${path}`))) ids.add(object.assetId);
  }
  const assets = attachment.assets.filter((asset) => ids.has(asset.id));
  const files = attachment.files.filter((file) => assets.some((asset) => asset.outputs.files.includes(file.path)
    || file.path.startsWith(`AuthoringSources/${asset.id}/`)));
  return assets.length ? { ...attachment, assets, files } : null;
}

export function validateScriptAuthoringSelection(state: ScriptWorkspaceState, library: ScriptLibrary,
  accepted: ReadonlySet<string>): Outcome<void, string> {
  const attachment = selectedScriptAuthoringAssets(library, accepted);
  for (const asset of attachment?.assets ?? []) {
    const paths = new Set([
      ...Object.keys(library.assets).filter((path) => path.startsWith(`Data/Scripts/assets/project/${asset.id}/`)),
      ...library.manifest.objects.filter((object) => object.assetId === asset.id).flatMap(definitionAssetPaths),
    ]);
    for (const path of paths) {
      const incoming = library.assets[path];
      const merged = state.assets[path]?.bytes;
      if (!incoming || !merged || incoming.length !== merged.length || incoming.some((byte, index) => byte !== merged[index]))
        return err(`Select all runtime assets for ${asset.name} before importing its editable asset: ${path}`);
    }
  }
  return ok(undefined);
}

export function isAuthoringArchivePath(path: string): boolean { return path.startsWith(root); }
