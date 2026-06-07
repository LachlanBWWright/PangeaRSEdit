import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

let configured = false;

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
      insertText: 'pangea.log.info(${1:"LEVEL_EDITOR_SCRIPTING"});',
    },
    {
      label: "defineScriptedObject",
      kind: monaco.languages.CompletionItemKind.Snippet,
      range,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation:
        "Create a scripted object definition that the preview runtime can spawn.",
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
      if (label === "typescript") {
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
    strict: true,
    target: monaco.typescript.ScriptTarget.ES2019,
    module: monaco.typescript.ModuleKind.CommonJS,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    noEmit: true,
  });
  defaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
  defaults.setEagerModelSync(true);

  const extraLibDisposables = buildScriptTypeDeclarationFiles(state).map(
    (file) => defaults.addExtraLib(file.content, `file:///${file.path}`),
  );

  const completionDisposable = monaco.languages.registerCompletionItemProvider(
    "typescript",
    {
      provideCompletionItems(model, position) {
        return {
          suggestions: [
            ...buildCompletionItems(
              state,
              buildCompletionRange(model, position),
            ),
          ],
        };
      },
    },
  );

  return [...extraLibDisposables, completionDisposable];
}
