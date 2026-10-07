import { scriptEditorPath } from "./scriptEditorUris";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export class ScriptMonacoWorkspaceRegistry {
  private readonly workspaces = new Map<symbol, () => ScriptWorkspaceState>();

  public register(read: () => ScriptWorkspaceState): { dispose: () => boolean } {
    const key = Symbol();
    this.workspaces.set(key, read);
    return { dispose: () => this.workspaces.delete(key) };
  }

  public get size(): number { return this.workspaces.size; }

  public forUri(uri: string): ScriptWorkspaceState | null {
    let matching: ScriptWorkspaceState | null = null;
    for (const read of this.workspaces.values()) {
      const state = read();
      const path = scriptEditorPath(uri, state.context.gameId);
      if (path && (state.sourceFiles[path] || state.compiledFiles[path])) matching = state;
    }
    return matching;
  }
}
