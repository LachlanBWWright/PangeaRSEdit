import { strToU8 } from "fflate";
import { SCRIPT_GUIDES, portableScriptGuide } from "./scriptGuides";
import { buildFullApiReference } from "./scriptFullApiReference";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export function buildScriptDocumentationFiles(state?: ScriptWorkspaceState): readonly { path: string; bytes: Uint8Array }[] {
  const guides = SCRIPT_GUIDES.map((guide) => ({ path: `Data/Scripts/docs/${guide.file}`, bytes: strToU8(portableScriptGuide(guide.content)) }));
  return state ? [{ path: "Data/Scripts/docs/API.md", bytes: strToU8(buildFullApiReference(state)) }, ...guides] : guides;
}
