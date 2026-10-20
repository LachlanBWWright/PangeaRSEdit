import overview from "@/../../games/pangea-ports/docs/lua-scripting.md?raw";
import runtime from "@/../../games/pangea-ports/docs/scripting-runtime.md?raw";
import examples from "@/../../games/pangea-ports/docs/script-examples.md?raw";
import games from "@/../../games/pangea-ports/docs/script-game-matrix.md?raw";
import config from "@/../../games/pangea-ports/docs/script-config.md?raw";
import editor from "@/../../games/pangea-ports/docs/scripting-editor.md?raw";
import libraries from "@/../../games/pangea-ports/docs/script-library-workflow.md?raw";

export interface ScriptGuide {
  file: string;
  title: string;
  description: string;
  content: string;
}

export const SCRIPT_GUIDES: readonly ScriptGuide[] = [
  { file: "scripting-runtime.md", title: "Runtime and lifecycle", description: "Modules, hooks, contexts, handles, ownership, scheduling, budgets and errors.", content: runtime },
  { file: "script-examples.md", title: "Working Lua examples", description: "Startup, custom objects, timers, persistence and native interception.", content: examples },
  { file: "lua-scripting.md", title: "Full API and gameplay semantics", description: "All functions, presentation, dialogue, input, world queries and controller ownership.", content: overview },
  { file: "script-game-matrix.md", title: "Game and mode support", description: "Available lifecycle families, assets and native adapter restrictions.", content: games },
  { file: "script-config.md", title: "Configuration and packages", description: "Runtime config, assets, sidecars and package boundaries.", content: config },
  { file: "scripting-editor.md", title: "Editor authoring", description: "Definitions, instances, level events, validation and testing.", content: editor },
  { file: "script-library-workflow.md", title: "IDE and level-pack libraries", description: "Git authoring, library updates, source snapshots and conflict review.", content: libraries },
];

export function scriptGuideTarget(target: string): { file: string; anchor: string } | null {
  if (/^(?:[a-z]+:|#)/i.test(target)) return null;
  const [path = "", anchor = ""] = target.split("#");
  const file = path.split("/").at(-1);
  return SCRIPT_GUIDES.some((guide) => guide.file === file) && file ? { file, anchor } : null;
}

export function portableScriptGuide(content: string): string {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: string, label: string, target: string) => {
    if (/^(https?:|#)/.test(target)) return match;
    const guide = scriptGuideTarget(target);
    return guide ? `[${label}](${guide.file}${guide.anchor ? `#${guide.anchor}` : ""})` : `${label} (repository source: \`${target}\`)`;
  });
}
