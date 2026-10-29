import { err, ok, Result } from "neverthrow";
import type { ProjectFile } from "@pangea/desktop-contracts";
import { scriptProjectSchema } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import { buildScriptPackageManifest, SCRIPT_PACKAGE_MANIFEST_PATH } from "@/editor/subviews/scripts/scriptPackageValidator";

const runtimeProjectSchema = scriptProjectSchema.omit({ editor: true });

export function runtimeScriptFiles(files: readonly ProjectFile[]): Result<ProjectFile[], string> {
  const retained: ProjectFile[] = [];
  for (const file of files) {
    if (!file.path.startsWith("Data/")) continue;
    if (!file.path.startsWith("Data/Scripts/")) { retained.push(file); continue; }
    if (!/^Data\/Scripts\/(dist|config|assets)\//.test(file.path) || file.path === SCRIPT_PACKAGE_MANIFEST_PATH) continue;
    if (file.path !== "Data/Scripts/config/project.json") { retained.push(file); continue; }
    const json = Result.fromThrowable((): unknown => JSON.parse(new TextDecoder().decode(file.bytes)), () => "Cannot read generated script project metadata")();
    if (json.isErr()) return err(json.error);
    const parsed = runtimeProjectSchema.safeParse(json.value);
    if (!parsed.success) return err("Invalid generated script runtime metadata");
    retained.push({ path: file.path, bytes: new TextEncoder().encode(JSON.stringify(parsed.data)) });
  }
  const scripts = retained.filter((file) => file.path.startsWith("Data/Scripts/"));
  if (scripts.length) retained.push({ path: SCRIPT_PACKAGE_MANIFEST_PATH,
    bytes: new TextEncoder().encode(JSON.stringify(buildScriptPackageManifest(Object.fromEntries(scripts.map((file) => [file.path, file.bytes]))))) });
  return ok(retained);
}
