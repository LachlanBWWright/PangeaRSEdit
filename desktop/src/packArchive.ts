import { unzipSync, zipSync } from "fflate";
import { err, ok, Result } from "neverthrow";
import { PROJECT_MANIFEST, packManifestSchema, projectManifestSchema, relativePathSchema, type PackLevelInput, type PackManifest, type ProjectFile, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { failure, hash, parseJson } from "./files.ts";
import { validLaunchArguments } from "./gameLaunch.ts";

const LIMIT = 512 * 1024 * 1024;
export const PACK_MANIFEST = "pangea-pack.json";

export function buildPackArchive(project: ProjectSnapshot, sources: ProjectFile[], levels: PackLevelInput[], includeEditableProject = true) {
  if (!levels.length || levels.length !== project.manifest.levels.length || new Set(levels.map((level) => level.id)).size !== levels.length)
    return err(failure("Export every saved level exactly once", "invalid"));
  const entries: Record<string, Uint8Array> = {};
  const paths = new Set<string>();
  let total = 0;
  const add = (relative: string, bytes: Uint8Array) => {
    total += bytes.byteLength;
    if (total > LIMIT || bytes.byteLength > 128 * 1024 * 1024 || paths.has(relative.toLowerCase()) || !relativePathSchema.safeParse(relative).success) return false;
    paths.add(relative.toLowerCase());
    entries[relative] = bytes; return true;
  };
  if (includeEditableProject) for (const file of sources) if (!add(`Project/${file.path}`, file.bytes)) return err(failure("Pack contains duplicate paths or exceeds size limits", "limit"));
  const nativeLevels = [];
  for (const level of levels) {
    if (!project.manifest.levels.some((saved) => saved.id === level.id) || !validLaunchArguments(level.args) || level.files.length === 0)
      return err(failure("Invalid native level export", "invalid"));
    const root = `Runtime/${level.id}`;
    for (const file of level.files) if (!file.path.startsWith("Data/") || !add(`${root}/${file.path}`, file.bytes))
      return err(failure("Invalid, duplicate or oversized runtime pack file", "invalid"));
    nativeLevels.push({ id: level.id, name: level.name, args: level.args, root });
  }
  const editing = includeEditableProject ? "Project/ contains editable project files. Use Import editable project to continue authoring.\n" : "This runtime-only export does not contain an editable project.\n";
  const readme = `${project.manifest.name}\n\nRequires a compatible ${project.manifest.game} installation (editor data-root and script contract version 2).\n\nOpen this .pangeapack in Pangea RS Edit using Playable Packs, install or locate the game, then select a level and Play.\n\nFor manual launch, copy the installed game's complete Data directory into a separate folder. Overlay Runtime/<level-id>/Data there, preserving paths. Launch the game's executable with --data-dir /absolute/path/to/that/Data plus the level's args from pangea-pack.json. Repeat using a fresh Data copy for each level.\n\nStock game files and game executables are not included. Runtime/ contains validated per-level output.\n${editing}`;
  add("README.txt", new TextEncoder().encode(readme));
  const manifest: PackManifest = { kind: "pangea-level-pack", version: 1, assetRootVersion: 2, scriptContractVersion: 2,
    editableProject: includeEditableProject,
    name: project.manifest.name, game: project.manifest.game, levels: nativeLevels,
    files: Object.entries(entries).map(([path, bytes]) => ({ path, size: bytes.length, sha256: hash(bytes) })) };
  const parsed = packManifestSchema.safeParse(manifest);
  if (!parsed.success) return err(failure("Invalid pack manifest", "invalid"));
  entries[PACK_MANIFEST] = new TextEncoder().encode(JSON.stringify(parsed.data, null, 2));
  return Result.fromThrowable(() => zipSync(entries, { level: 6, mtime: new Date("2020-01-01T00:00:00Z") }), () => failure("Cannot encode playable pack"))();
}

export function readPackArchive(bytes: Uint8Array) {
  let total = 0, count = 0, rejected = false;
  const unpacked = Result.fromThrowable(() => unzipSync(bytes, { filter: (entry) => {
    total += entry.originalSize; count++;
    if (entry.originalSize > 128 * 1024 * 1024 || total > LIMIT || count > 32769
      || !relativePathSchema.safeParse(entry.name.replace(/\/$/, "")).success) rejected = true;
    return !rejected;
  } }), () => failure("Cannot read playable pack", "invalid"))();
  if (unpacked.isErr()) return err(unpacked.error);
  if (rejected) return err(failure("Playable pack exceeds safe extraction limits", "limit"));
  const entries = unpacked.value;
  const metadata = entries[PACK_MANIFEST];
  if (!metadata || metadata.length > 8 * 1024 * 1024) return err(failure("Missing or oversized pack manifest", "invalid"));
  const json = parseJson(new TextDecoder().decode(metadata));
  if (json.isErr()) return err(json.error);
  const manifest = packManifestSchema.safeParse(json.value);
  if (!manifest.success) return err(failure("Unsupported or invalid pack manifest", "invalid"));
  const names = manifest.data.files.map((file) => file.path.toLowerCase());
  if (new Set(names).size !== names.length || new Set(manifest.data.levels.map((level) => level.id)).size !== manifest.data.levels.length)
    return err(failure("Pack contains duplicate identities or file paths", "invalid"));
  for (const file of manifest.data.files) {
    const data = entries[file.path];
    if (!data || data.length !== file.size || hash(data) !== file.sha256) return err(failure(`Pack integrity check failed: ${file.path}`, "checksum"));
  }
  const declared = new Set([PACK_MANIFEST, ...manifest.data.files.map((file) => file.path)]);
  if (Object.keys(entries).some((name) => !name.endsWith("/") && !declared.has(name))) return err(failure("Pack contains undeclared files", "invalid"));
  for (const level of manifest.data.levels) {
    if (level.root !== `Runtime/${level.id}` || !validLaunchArguments(level.args)
      || !manifest.data.files.some((file) => file.path.startsWith(`${level.root}/Data/`))) return err(failure("Invalid pack level route", "invalid"));
  }
  const source = entries[`Project/${PROJECT_MANIFEST}`];
  if (manifest.data.editableProject === false) {
    if (Object.keys(entries).some((name) => name.startsWith("Project/"))) return err(failure("Runtime-only pack contains editable project files", "invalid"));
    return ok({ manifest: manifest.data, entries });
  }
  if (!source) return err(failure("Pack has no editable project manifest", "invalid"));
  const projectJson = parseJson(new TextDecoder().decode(source));
  if (projectJson.isErr()) return err(projectJson.error);
  const project = projectManifestSchema.safeParse(projectJson.value);
  if (!project.success || project.data.game !== manifest.data.game) return err(failure("Pack project game does not match its runtime", "invalid"));
  if (project.data.levels.length !== manifest.data.levels.length || project.data.levels.some((level) => !manifest.data.levels.some((runtime) => runtime.id === level.id)
    || !entries[`Project/${level.primary}`] || level.files.some((file) => !entries[`Project/${file}`])))
    return err(failure("Pack is missing editable levels or their native source files", "invalid"));
  return ok({ manifest: manifest.data, entries });
}
