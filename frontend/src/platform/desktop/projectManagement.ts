import { err, ok } from "neverthrow";
import { projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { desktopRequest } from "./client";
import { readProjectFiles } from "./projectLoad";

export type LevelAction = "rename" | "duplicate" | "delete" | "up" | "down";

export async function changeProjectLevel(project: ProjectSnapshot, id: string, action: LevelAction, name: string) {
  const levels = [...project.manifest.levels];
  const index = levels.findIndex((level) => level.id === id);
  const level = levels[index];
  if (!level) return err("This level no longer exists");
  const files = [];
  const removed: string[] = [];
  let duplicatedId: string | null = null;
  if (action === "rename") {
    if (!name.trim() || name.trim().length > 120) return err("Enter a level name up to 120 characters");
    levels[index] = { ...level, name: name.trim() };
  } else if (action === "delete") {
    levels.splice(index, 1);
    const shared = new Set(levels.flatMap((entry) => entry.files));
    removed.push(...level.files.filter((path) => path.startsWith(`.pangea/levels/${id}/`) && !shared.has(path)));
  } else if (action === "duplicate") {
    if (levels.length >= 512) return err("A project supports up to 512 levels");
    const source = await readProjectFiles(project, level.files);
    if (source.isErr()) return err(source.error.message);
    const nextId = crypto.randomUUID();
    duplicatedId = nextId;
    const mapped = new Map(level.files.map((path, i) => [path, `.pangea/levels/${nextId}/${i}-${path.split("/").at(-1)}`]));
    // Bindings are looked up by their fixed name when loading a level.
    for (const path of level.files) if (path.endsWith("/bindings.json")) mapped.set(path, `.pangea/levels/${nextId}/bindings.json`);
    files.push(...source.value.map((file) => ({ ...file, path: mapped.get(file.path) ?? file.path })));
    levels.splice(index + 1, 0, { ...level, id: nextId, name: `${level.name.slice(0, 115)} copy`,
      primary: mapped.get(level.primary) ?? level.primary, texture: level.texture ? mapped.get(level.texture) : undefined,
      files: files.map((file) => file.path) });
  } else {
    const target = index + (action === "up" ? -1 : 1);
    const other = levels[target];
    if (!other) return ok(project);
    levels[index] = other;
    levels[target] = level;
  }
  const assetBindings = project.manifest.assetBindings?.flatMap((binding) => {
    if (duplicatedId && binding.levels.includes(id)) return [{ ...binding, levels: [...binding.levels, duplicatedId] }];
    if (action !== "delete" || !binding.levels.includes(id)) return [binding];
    const retained = binding.levels.filter((level) => level !== id);
    return retained.length ? [{ ...binding, levels: retained }] : [];
  });
  const saved = await desktopRequest({ operation: "project.save", revision: project.revision,
    manifest: { ...project.manifest, levels, ...(assetBindings ? { assetBindings } : {}) }, files, removed }, projectSnapshotSchema);
  return saved.isErr() ? err(saved.error.message) : ok(saved.value);
}
