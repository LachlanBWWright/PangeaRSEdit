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
}: ScriptCodeModalProps) {
  const lspStatus = useSyncExternalStore(
    (listener) => scriptLspClient.subscribe(listener),
    () => scriptLspClient.getStatus(),
    () => "disconnected",
  );
  const [draft, setDraft] = useState({ base: content, value: content });
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
    if (!open) {
      return;
    }

    ensureScriptMonacoConfigured();

    const disposables = configureScriptMonaco(workspace);

    return () => {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    };
  }, [open, workspace]);

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
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-700">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">
              {fileName}
              {isReadOnly && (
                <span className="ml-2 text-xs text-slate-400">(read-only)</span>
              )}
              {hasChanges && !isReadOnly && (
                <span className="ml-2 text-xs text-amber-400">*</span>
              )}
            </span>
            <div className="flex items-center gap-2">
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
                <Button size="sm" variant="outline" onClick={handleFormat}>
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
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit the Lua source file and save or revert its changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative">
          <Editor
            height="100%"
            language={language}
            path={`file:///workspace/${filePath}`}
            value={editorContent}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            theme="vs-dark"
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
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-700 px-6 py-3 text-xs text-slate-400">
          <span>
            {filePath}
            {preflightFindings.length > 0 && (
              <span className="ml-3 text-amber-400" title={preflightFindings.map((finding) => `Line ${finding.line}: ${finding.message}`).join("\n")}>
                {preflightFindings.length} preflight warning{preflightFindings.length === 1 ? "" : "s"}
              </span>
            )}
          </span>
          <span>
            Lua intelligence: {hasConfiguredApiEndpoint()
              ? lspStatus === "connected"
                ? "LuaLS connected"
                : lspStatus === "connecting"
                  ? "connecting"
                  : "snippets only"
              : "snippets only"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
