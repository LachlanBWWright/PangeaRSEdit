import { app, shell } from "electron";
import path from "node:path";
import { err, ok, Result } from "neverthrow";
import { failure, io, projectPath, statOrMissing } from "./files.ts";
import { readEditorSettings } from "./editorSettings.ts";
import { startProcess } from "./processes.ts";

export async function openProjectExternal(root: string | null, relative: string | undefined, action: "open" | "reveal" | "vscode" | "edit", line?: number) {
  if (!root) return err(failure("Open a project first", "no-project"));
  const target = relative ? await projectPath(root, relative) : ok(root);
  if (target.isErr()) return target;
  const info = await statOrMissing(target.value);
  if (info.isErr()) return info;
  if (!info.value) return err(failure("This project file no longer exists", "missing"));
  if (action === "reveal") return Result.fromThrowable(() => shell.showItemInFolder(target.value), () => failure("Cannot reveal project file"))();
  if (action === "vscode" || action === "edit") {
    const preferences = action === "vscode" ? ok({ editor: "vscode", executable: undefined }) : await readEditorSettings();
    if (preferences.isErr()) return err(preferences.error);
    const editor = preferences.value.editor;
    if (editor === "vscode" || editor === "vscodium") {
      const protocol = editor === "vscode" ? "vscode" : "vscodium";
      const registered = Result.fromThrowable(() => app.getApplicationNameForProtocol(`${protocol}://`), () => failure("Cannot locate editor"))();
      if (registered.isErr()) return err(registered.error);
      if (!registered.value) return err(failure("The selected editor is not registered. Install it or choose another editor in Project Settings.", "not-installed"));
      const location = encodeURI(target.value.replaceAll(path.sep, "/")).replaceAll("#", "%23").replaceAll("?", "%3F");
      return io(() => shell.openExternal(`${protocol}://file/${location}${relative && line ? `:${line}:1` : ""}`), "Cannot open selected code editor");
    }
    if (editor === "custom") {
      const executable = preferences.value.executable;
      if (!executable) return err(failure("Choose an editor application in Project Settings", "not-installed"));
      const child = process.platform === "darwin" && executable.endsWith(".app")
        ? startProcess("/usr/bin/open", ["-a", executable, target.value], root)
        : startProcess(executable, [target.value], root);
      if (child.isErr()) return err(child.error);
      return new Promise<Result<void, import("@pangea/desktop-contracts").HostError>>((resolve) => {
        child.value.stdout?.resume(); child.value.stderr?.resume();
        child.value.once("error", () => resolve(err(failure("Cannot start the configured editor. Choose its application again in Project Settings.", "not-installed"))));
        child.value.once("spawn", () => { child.value.unref(); resolve(ok(undefined)); });
      });
    }
    if (!relative) return io(() => shell.openPath(root), "Cannot open project folder").andThen((message) => message ? err(failure(message)) : ok(undefined));
  }
  if (relative && (!info.value.isFile() || !/\.(lua|json|txt|md|tga|png|jpg|jpeg|glb|gltf|shapes|tileset)$/i.test(relative)))
    return err(failure("Reveal this file to choose an external application", "unsupported"));
  const opened = await io(() => shell.openPath(target.value), "Cannot open external application");
  if (opened.isErr()) return opened;
  return opened.value ? err(failure(opened.value)) : ok(undefined);
}
