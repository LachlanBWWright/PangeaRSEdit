import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { configureScriptMonaco, ensureScriptMonacoConfigured } from "./scriptMonaco";
import { Button } from "@/components/ui/button";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

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
  const [editorContent, setEditorContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
  const monacoEditorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(
    null,
  );

  useEffect(() => {
    setEditorContent(content);
    setHasChanges(false);
  }, [content]);

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
      setEditorContent(newContent);
      setHasChanges(newContent !== content);
    },
    [content],
  );

  const handleSave = useCallback(() => {
    if (!hasChanges || !onSave) {
      return;
    }
    onSave(editorContent);
    setHasChanges(false);
  }, [editorContent, hasChanges, onSave]);

  const handleRevert = useCallback(() => {
    setEditorContent(content);
    setHasChanges(false);
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

        <div className="px-6 py-3 border-t border-slate-700 text-xs text-slate-400">
          {filePath}
        </div>
      </DialogContent>
    </Dialog>
  );
}
