import { renderToStaticMarkup } from "react-dom/server";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { EMPTY_SCRIPT_EVIDENCE } from "./scriptWorkflowEvidence";
import { ScriptWorkflowStatus } from "./ScriptWorkflowStatus";

const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

it("separates browser workspace storage from a portable backup", () => {
  window.pangeaDesktop = undefined;
  const markup = renderToStaticMarkup(<Provider><ScriptWorkflowStatus workspace={workspace} evidence={EMPTY_SCRIPT_EVIDENCE} /></Provider>);
  expect(markup).toContain("Browser: changes stay in the local workspace");
  expect(markup).toContain("Export a script package");
  expect(markup).not.toContain("project files saved to disk");
});

it("reports authoritative project dirty state and requires a project before claiming disk save", () => {
  window.pangeaDesktop = { request: async () => ({ ok: true, value: undefined }), onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  const store = createStore();
  const render = () => renderToStaticMarkup(<Provider store={store}><ScriptWorkflowStatus workspace={workspace} evidence={EMPTY_SCRIPT_EVIDENCE} /></Provider>);
  expect(render()).toContain("open a project to save files to disk");
  store.set(desktopProjectAtom, { folder: "/project", revision: "saved", recoveryAvailable: false, files: [], manifest: { kind: "pangea-editor-project", version: 1, game: "OttoMatic", name: "Objects", levels: [] } });
  store.set(desktopProjectDirtyAtom, true);
  expect(render()).toContain("Project: unsaved changes");
  store.set(desktopProjectDirtyAtom, false);
  expect(render()).toContain("project files saved to disk");
});
