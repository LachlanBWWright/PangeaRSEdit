import { err, ok, type Result } from "neverthrow";
import { relativePathSchema, type PreparedEdits, type ProjectFile, type ProjectSnapshot } from "@pangea/desktop-contracts";

export async function prepareAssetEdits(project: ProjectSnapshot, kind: "models" | "sprites", name: string, selected: string,
  exportFiles: (stem: string) => Promise<Result<ProjectFile[], string>>) {
  const stem = name.trim();
  if (!stem || !relativePathSchema.safeParse(stem).success || stem.includes("/")) return err("Choose a safe asset name");
  const directory = selected ? selected.slice(0, selected.lastIndexOf("/") + 1) : `Assets/${kind}/`;
  const exported = await exportFiles(`${directory}${stem}`);
  if (exported.isErr()) return err(exported.error);
  const edits: PreparedEdits = { manifest: project.manifest, files: exported.value, removed: [] };
  return ok(edits);
}
