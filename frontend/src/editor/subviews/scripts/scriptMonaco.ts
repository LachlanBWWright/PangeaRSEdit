import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import type { ScriptWorkspaceContext, ScriptWorkspaceState } from "./scriptWorkspaceState";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

let configured = false;

function buildHookSignatures(context: ScriptWorkspaceContext): string {
  return context.supportedHooks
    .map((hookId) => {
      if (hookId === "onObjectFrame") {
        return `  ${hookId}?: (ctx: ObjectFrameContext) => ObjectFrameResult | void;`;
      }
      if (
        hookId === "onTerrainItem" ||
        hookId === "onSplineItem" ||
        hookId === "onMapItem"
      ) {
        const ctxType =
          hookId === "onTerrainItem"
            ? "TerrainItemContext"
            : hookId === "onSplineItem"
              ? "SplineItemContext"
              : "MikeMapItemContext";
        return `  ${hookId}?: (ctx: ${ctxType}) => ItemSpawnResult | void;`;
      }

      if (
        hookId === "onCheckpoint" ||
        hookId === "onLapComplete" ||
        hookId === "onPowerupCollected" ||
        hookId === "onRaceFinish"
      ) {
        return `  ${hookId}?: (...args: unknown[]) => void;`;
      }

      return `  ${hookId}?: (ctx: LevelContext | FrameContext | SceneAreaContext | RaceContext) => void;`;
    })
    .join("\n");
}

function buildTagDeclarations(state: ScriptWorkspaceState): string {
  const tags = state.context.allowedTags
    .concat(state.behaviorCatalog.flatMap((behavior) => behavior.contributedTags))
    .map((tag) => JSON.stringify(tag.id));

  return tags.length > 0 ? tags.join(" | ") : "string";
}

function buildExtraLib(state: ScriptWorkspaceState): string {
  return [
    "declare const globalThis: Record<string, unknown>;",
    "declare function require(path: string): Record<string, unknown>;",
    "",
    "interface Vector2 { readonly x: number; readonly y: number; }",
    "interface Vector3 { readonly x: number; readonly y: number; readonly z: number; }",
    "interface ObjectHandle { readonly id: number; readonly generation: number; }",
    "interface GameContext { readonly gameId: string; readonly gameName: string; }",
    "interface LevelContext extends GameContext { readonly levelNum: number; readonly levelName?: string; }",
    "interface FrameContext extends LevelContext { readonly frameNum: number; readonly deltaSeconds: number; readonly levelTimeSeconds: number; }",
    "interface SceneAreaContext extends GameContext { readonly scene: number; readonly area: number; readonly sceneName?: string; readonly areaName?: string; }",
    "interface RaceContext extends LevelContext { readonly mode: 'local' | 'practice' | 'network'; readonly trackName?: string; }",
    "interface ObjectFrameContext extends FrameContext { readonly object: ObjectHandle; readonly position: Vector3; readonly tags: readonly ScriptTag[]; }",
    "interface ObjectFrameResult { readonly positionOffset?: Vector3; }",
    "interface TerrainItemContext extends LevelContext { readonly itemType: number; readonly remappedItemType: number; readonly position: Vector3; readonly flags: number; readonly params: readonly number[]; }",
    "interface SplineItemContext extends LevelContext { readonly itemType: number; readonly splineNum: number; readonly placement: number; readonly params: readonly number[]; }",
    "interface MikeMapItemContext extends GameContext { readonly scene: number; readonly area: number; readonly itemType: number; readonly position: Vector2; readonly params: readonly number[]; }",
    "type ScriptTag = " + buildTagDeclarations(state) + ";",
    "type ItemSpawnResult = { readonly handled: true; readonly markInUse?: boolean } | { readonly handled: false };",
    "interface ScriptedObjectSelf { readonly handle: ObjectHandle; readonly state: Record<string, unknown>; }",
    "interface ScriptedObjectDefinition { readonly onSpawn?: (self: ScriptedObjectSelf, ctx: LevelContext) => void; readonly onUpdate?: (self: ScriptedObjectSelf, ctx: FrameContext) => void; readonly onCollision?: (self: ScriptedObjectSelf, other: ObjectHandle, ctx: FrameContext) => void; readonly onDamage?: (self: ScriptedObjectSelf, amount: number, ctx: FrameContext) => number; readonly onDelete?: (self: ScriptedObjectSelf, ctx: LevelContext) => void; }",
    "interface PangeaApi {",
    "  readonly api: { readonly version: 1 };",
    "  readonly game: { readonly id: string; readonly name: string };",
    "  readonly level: { current(): number };",
    "  readonly time: { delta(): number };",
    "  readonly log: { info(message: string): void; warn(message: string): void; error(message: string): void; };",
    "  readonly player: { get(playerNum: number): ObjectHandle | undefined; };",
    "  readonly object: { position(handle: ObjectHandle): Vector3 | undefined; setPosition(handle: ObjectHandle, position: Vector3): boolean; setVelocity(handle: ObjectHandle, velocity: Vector3): boolean; delete(handle: ObjectHandle): boolean; };",
    "  readonly spawn: { native(id: string, position: Vector3, options?: { readonly amount?: number; readonly subtype?: number }): ObjectHandle | undefined; scripted(id: string, position: Vector3, options?: { readonly speed?: number; readonly amount?: number; readonly radius?: number }): ObjectHandle | undefined; };",
    "}",
    "declare const pangea: PangeaApi;",
    "declare function defineScriptedObject(definition: ScriptedObjectDefinition): ScriptedObjectDefinition;",
    "interface ScriptModule {",
    buildHookSignatures(state.context),
    "}",
    "",
  ].join("\n");
}

function buildCompletionItems(
  state: ScriptWorkspaceState,
  range: monaco.IRange,
): readonly monaco.languages.CompletionItem[] {
  const hookItems = state.context.supportedHooks.map((hookId) => ({
    label: hookId,
    kind: monaco.languages.CompletionItemKind.Snippet,
    range,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: `Insert a ${hookId} hook using the current scripting runtime shape.`,
    insertText:
      hookId === "onObjectFrame"
        ? `export function ${hookId}(ctx: ObjectFrameContext): ObjectFrameResult | void {\n  \$0\n}\n`
        : hookId === "onTerrainItem"
          ? `export function ${hookId}(ctx: TerrainItemContext): ItemSpawnResult {\n  return { handled: false };\n}\n`
          : hookId === "onSplineItem"
            ? `export function ${hookId}(ctx: SplineItemContext): ItemSpawnResult {\n  return { handled: false };\n}\n`
            : hookId === "onMapItem"
              ? `export function ${hookId}(ctx: MikeMapItemContext): ItemSpawnResult {\n  return { handled: false };\n}\n`
              : `export function ${hookId}(ctx: LevelContext): void {\n  \$0\n}\n`,
  }));

  return [
    ...hookItems,
    {
      label: "pangea.log.info",
      kind: monaco.languages.CompletionItemKind.Snippet,
      range,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Log a message to the native scripting console.",
      insertText: "pangea.log.info(${1:\"LEVEL_EDITOR_SCRIPTING\"});",
    },
    {
      label: "defineScriptedObject",
      kind: monaco.languages.CompletionItemKind.Snippet,
      range,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Create a scripted object definition that the preview runtime can spawn.",
      insertText: [
        "export const ${1:hoverBeacon} = defineScriptedObject({",
        "  onUpdate(self, ctx) {",
        "    \$0",
        "  },",
        "});",
      ].join("\n"),
    },
  ];
}

function buildCompletionRange(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.IRange {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

export function ensureScriptMonacoConfigured(): void {
  if (configured) {
    return;
  }

  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };

  loader.config({ monaco });
  configured = true;
}

export function configureScriptMonaco(
  state: ScriptWorkspaceState,
): readonly monaco.IDisposable[] {
  ensureScriptMonacoConfigured();

  const defaults = monaco.typescript.typescriptDefaults;
  defaults.setCompilerOptions({
    allowJs: true,
    checkJs: true,
    strict: true,
    target: monaco.typescript.ScriptTarget.ES2019,
    module: monaco.typescript.ModuleKind.CommonJS,
    moduleResolution:
      monaco.typescript.ModuleResolutionKind.NodeJs,
    noEmit: true,
  });
  defaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
  defaults.setEagerModelSync(true);

  const extraLibDisposable = defaults.addExtraLib(
    buildExtraLib(state),
    "file:///Data/Scripts/types/runtime.d.ts",
  );

  const completionDisposable = monaco.languages.registerCompletionItemProvider(
    "typescript",
    {
      provideCompletionItems(model, position) {
        return {
          suggestions: [...buildCompletionItems(state, buildCompletionRange(model, position))],
        };
      },
    },
  );

  const javascriptCompletionDisposable =
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems(model, position) {
        return {
          suggestions: [...buildCompletionItems(state, buildCompletionRange(model, position))],
        };
      },
    });

  return [
    extraLibDisposable,
    completionDisposable,
    javascriptCompletionDisposable,
  ];
}
