import type { DesktopBridge, ConflictReview, GameRun, InstalledPack, ProjectSnapshot } from "@pangea/desktop-contracts";

export const workflowProject: ProjectSnapshot = { folder: "/home/editor/Earth missions", revision: "base", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, name: "Earth missions", game: "OttoMatic", levels: [
    { id: "farm", name: "Farm rescue", baseLevel: 0, primary: ".pangea/levels/farm/level.ter.rsrc", files: [".pangea/levels/farm/level.ter.rsrc"] },
  ] }, files: [{ path: "Assets/sprites/farm.palette.tga", hash: "palette", size: 1042 }] };
export const workflowRun: GameRun = { id: "00000000-0000-4000-8000-000000000001", game: "OttoMatic", state: "running", startedAt: "2026-10-22T10:00:00.000Z",
  exitCode: null, signal: null, canRestart: true, droppedBytes: 0, sourceProject: workflowProject.folder,
  output: [{ sequence: 1, stream: "stdout", text: "Level started\n" }, { sequence: 2, stream: "stderr", text: "Data/Scripts/dist/modules/helpers/objectives.lua:12: missing objective\n" }] };
export const workflowPack: InstalledPack = { id: "a".repeat(64), manifest: { kind: "pangea-level-pack", version: 1, assetRootVersion: 2, scriptContractVersion: 2,
  name: "Earth missions", game: "OttoMatic", levels: [{ id: "farm", name: "Farm rescue", args: ["--level", "0"], root: "Runtime/farm" }], files: [] } };
export const workflowReview: ConflictReview = { id: "00000000-0000-4000-8000-000000000002", revision: "disk", files: [
  { path: "Data/Scripts/src/helpers/objectives.lua", binary: false, base: "local count = 1\nreturn count", editor: "local count = 2\nreturn count", disk: "local count = 1\nreturn count + 1", merged: "local count = 2\nreturn count + 1",
    decision: "merged", reason: "Independent line changes merged automatically.", baseAvailable: true, editorAvailable: true, editorSize: 28, diskSize: 32 },
  { path: "Assets/models/ufo.bg3d", binary: true, base: null, editor: null, disk: null, merged: null, decision: "unresolved", reason: "Choose which binary version to keep.", baseAvailable: false, editorAvailable: true, editorSize: 2048, diskSize: 4096 },
] };

export function installWorkflowBridge() {
  const previous = window.pangeaDesktop;
  let listener: ((value: unknown) => void) | undefined;
  let run = workflowRun;
  const bridge: DesktopBridge = {
    request: async (request) => {
      switch (request.operation) {
        case "project.restore": return { ok: true, value: null };
        case "project.session": case "host.dirty": return { ok: true, value: undefined };
        case "games.assets": return { ok: true, value: [] };
        case "games.runs": return { ok: true, value: [run] };
        case "games.stop": run = { ...run, state: "exited", exitCode: 0 }; listener?.([run]); return { ok: true, value: undefined };
        case "games.restart": run = { ...run, state: "running", exitCode: null }; listener?.([run]); return { ok: true, value: undefined };
        case "games.asset-files": return { ok: true, value: [{ path: "Data/Images/farmscene.tga", size: 65000 }] };
        case "project.save": return { ok: true, value: { ...workflowProject, revision: "saved", manifest: request.manifest } };
        case "packs.list": return { ok: true, value: [workflowPack] };
        case "packs.open": return { ok: true, value: workflowPack };
        case "packs.play": return { ok: true, value: undefined };
        case "packs.remove": return { ok: true, value: [] };
        case "project.review": return { ok: true, value: workflowReview };
        case "project.apply-review": return { ok: true, value: { ...workflowProject, revision: "merged" } };
        case "editor.preferences": return { ok: true, value: { editor: "system" } };
        case "editor.configure": return { ok: true, value: { editor: request.editor } };
        case "editor.updates": return { ok: true, value: { current: "0.1.0", latest: "0.2.0", available: true, url: "https://github.com/LachlanBWWright/PangeaRSEdit/releases/tag/editor-v0.2.0", platform: "linux", arch: "x64" } };
        case "editor.release": case "project.external": return { ok: true, value: undefined };
        default: return { ok: false, error: { code: "fixture", message: "This story exercises desktop workflow controls." } };
      }
    }, onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
    onGameRun: (callback) => { listener = callback; return () => { listener = undefined; }; },
  };
  window.pangeaDesktop = bridge;
  return () => { window.pangeaDesktop = previous; };
}
