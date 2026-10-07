import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { configureScriptMonaco, ensureScriptMonacoConfigured } from "./scriptMonaco";
import { Button } from "@/components/ui/button";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { scriptLspClient } from "./scriptLspClient";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { preflightScriptSource } from "./scriptSourcePreflight";
import type { ScriptSourceEditorProps, ScriptEditorReveal } from "./ScriptSourceEditor";
import { ScriptEditorReferenceLayout } from "./ScriptEditorReferenceLayout";
import { ScriptCodeWorkspacePanel } from "./ScriptCodeWorkspacePanel";
import { scriptEditorUri } from "./scriptEditorUris";

interface ScriptCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: ScriptWorkspaceState;
  filePath: string;
  fileName: string;
  language: "lua";
  content: string;
  isReadOnly?: boolean;
  onSave?: (newContent: string) => void;
  onDelete?: () => void;
  editor?: ScriptSourceEditorProps;
}

export function getLuaIntelligenceStatus(
  configured: boolean,
  status: "disconnected" | "connecting" | "connected" | "unavailable",
): string {
  if (!configured) return "snippets only";
  if (status === "connected") return "LuaLS connected";
  if (status === "connecting") return "connecting to LuaLS";
  return "snippets only (LuaLS unavailable)";
}

export function ScriptCodeModal({
  open,
  onOpenChange,
  workspace,
  filePath,
  fileName,
  language,
  content,
  isReadOnly = false,
  onSave,
  onDelete,
  editor: integratedEditor,
}: ScriptCodeModalProps) {
  const lspStatus = useSyncExternalStore(
    (listener) => scriptLspClient.subscribe(listener),
    (): ReturnType<typeof scriptLspClient.getStatus> => scriptLspClient.getStatus(),
    (): ReturnType<typeof scriptLspClient.getStatus> => "disconnected",
  );
  const capabilities = useSyncExternalStore(
    (listener) => scriptLspClient.subscribe(listener),
    () => scriptLspClient.getCapabilities(),
  );
  const [draft, setDraft] = useState({ base: content, value: content });
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [diagnosticReveal, setDiagnosticReveal] = useState<ScriptEditorReveal>();
  const editorContent = draft.base === content ? draft.value : content;
  const hasChanges = editorContent !== content;
  const preflightFindings = useMemo(
    () => preflightScriptSource(editorContent, workspace.context.gameId, workspace.context.supportedHooks, workspace.context.levelNumber),
    [editorContent, workspace.context.gameId, workspace.context.levelNumber, workspace.context.supportedHooks],
  );
  const monacoEditorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(
    null,
  );

  useEffect(() => {
    if (!open || integratedEditor) {
      return;
    }

    ensureScriptMonacoConfigured();

    const disposables = configureScriptMonaco(workspace);

    return () => {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    };
  }, [integratedEditor, open, workspace]);

  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      monacoEditorRef.current = editor;
      editor.focus();
    },
    [],
  );

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? "";
      setDraft({ base: content, value: newContent });
    },
    [content],
  );

  const handleSave = useCallback(() => {
    if (!hasChanges || !onSave) {
      return;
    }
    onSave(editorContent);
    setDraft({ base: editorContent, value: editorContent });
  }, [editorContent, hasChanges, onSave]);

  const handleRevert = useCallback(() => {
    setDraft({ base: content, value: content });
  }, [content]);

  const handleFormat = useCallback(() => {
    monacoEditorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, []);

  const handleDelete = useCallback(() => {
    if (!onDelete) {
      return;
    }
    onDelete();
    onOpenChange(false);
  }, [onDelete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[96vw] flex-col gap-0 overflow-hidden bg-slate-950 p-0 sm:max-w-[96vw] xl:max-w-[1400px]">
        <DialogHeader className="border-b border-slate-800 px-4 py-4 pr-14">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-lg font-semibold text-white">
              {integratedEditor ? "Lua workspace" : fileName}
              {isReadOnly && !integratedEditor && (
                <span className="ml-2 text-xs text-slate-400">(read-only)</span>
              )}
              {hasChanges && !isReadOnly && !integratedEditor && (
                <span className="ml-2 text-xs text-amber-400">*</span>
              )}
            </span>
            {integratedEditor && <span className="text-sm font-normal text-slate-400">{workspace.context.gameLabel}</span>}
            {!integratedEditor && <div className="flex items-center gap-2">
              {!isReadOnly && hasChanges && (
                <>
                  <Button size="sm" variant="outline" onClick={handleRevert}>
                    Revert
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save
                  </Button>
                </>
              )}
              {!isReadOnly && (
                <Button size="sm" variant="outline" onClick={handleFormat} disabled={lspStatus !== "connected" || !capabilities.formatting} title="Requires LuaLS formatting support">
                  Format
                </Button>
              )}
              {onDelete && !isReadOnly && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
            </div>}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit the Lua source file and save or revert its changes.
          </DialogDescription>
        </DialogHeader>

        <div className={`relative min-h-0 flex-1 overflow-auto ${integratedEditor ? "px-4" : ""}`}>
          {integratedEditor ? <ScriptEditorReferenceLayout context={workspace.context} open={referenceOpen} onClose={() => setReferenceOpen(false)}>
            <ScriptCodeWorkspacePanel
              editor={{ ...integratedEditor, onExpand: undefined, onOpenReference: () => setReferenceOpen(true), reveal: diagnosticReveal ?? integratedEditor.reveal }}
              activeCodePath={filePath}
              activeCodeDescription="Choose a source file to edit."
              hasActiveCodeFile
              onOpenEditor={() => undefined}
              onCompile={integratedEditor.onValidate}
              buildErrorCount={workspace.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length}
              diagnostics={workspace.diagnostics}
              onNavigateDiagnostic={(diagnostic) => {
                integratedEditor.onSelectFile(diagnostic.filePath);
                setDiagnosticReveal((previous) => ({ filePath: diagnostic.filePath, line: diagnostic.line, column: diagnostic.column, sequence: (previous?.sequence ?? 0) + 1 }));
              }}
            />
          </ScriptEditorReferenceLayout> : (
          <Editor
            height="100%"
            language={language}
            path={scriptEditorUri(workspace.context.gameId, filePath)}
            value={editorContent}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            keepCurrentModel
            saveViewState
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              readOnly: isReadOnly,
            }}
          />
          )}
        </div>

        {!integratedEditor && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
          <span>
            {filePath}
            {preflightFindings.length > 0 && (
              <span className="ml-3 text-amber-400" title={preflightFindings.map((finding) => `Line ${finding.line}: ${finding.message}`).join("\n")}>
                {preflightFindings.length} preflight warning{preflightFindings.length === 1 ? "" : "s"}
              </span>
            )}
          </span>
          <span role="status" aria-live="polite">
            Lua intelligence: {getLuaIntelligenceStatus(
              hasConfiguredApiEndpoint(),
              lspStatus,
            )}
          </span>
        </div>}
        {integratedEditor && preflightFindings.length > 0 && <details className="border-t border-slate-800 px-4 py-2 text-xs text-amber-300">
          <summary className="cursor-pointer">{preflightFindings.length} preflight warning{preflightFindings.length === 1 ? "" : "s"}</summary>
          <ul className="mt-2 max-h-24 space-y-1 overflow-auto">{preflightFindings.map((finding, index) => <li key={index}>Line {finding.line}: {finding.message}</li>)}</ul>
        </details>}
      </DialogContent>
    </Dialog>
  );
}
