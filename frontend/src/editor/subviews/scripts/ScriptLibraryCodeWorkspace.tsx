import { useState } from "react";
import { ScriptCodeWorkspacePanel } from "./ScriptCodeWorkspacePanel";
import { ScriptCodeModal } from "./ScriptCodeModal";
import type { ScriptEditorReveal } from "./ScriptSourceEditor";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { useScriptWorkspaceEditor } from "./useScriptWorkspaceEditor";
import { ScriptEditorReferenceLayout } from "./ScriptEditorReferenceLayout";
import { ScriptFileUsage } from "./ScriptFileUsage";

export function ScriptLibraryCodeWorkspace({ workspace, filePath, onSelectFile, onOpenAssignments }: {
  readonly workspace: ScriptWorkspaceState;
  readonly filePath: string;
  readonly onSelectFile: (path: string) => void;
  readonly onOpenAssignments: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [reveal, setReveal] = useState<ScriptEditorReveal>();
  const editor = useScriptWorkspaceEditor(workspace, filePath, onSelectFile, () => setReferenceOpen(true));
  const activeEditor = editor ? { ...editor, reveal } : undefined;
  return <>
    <ScriptEditorReferenceLayout context={workspace.context} open={referenceOpen} onClose={() => setReferenceOpen(false)}>
    <ScriptFileUsage workspace={workspace} filePath={filePath} onOpenAssignments={onOpenAssignments} returnLabel="Back to custom items" />
    <ScriptCodeWorkspacePanel
      editor={activeEditor ? { ...activeEditor, onExpand: () => setFullscreen(true) } : undefined}
      activeCodePath={filePath}
      activeCodeDescription="Create an item to start editing its Lua behavior."
      hasActiveCodeFile={Boolean(editor)}
      onOpenEditor={() => setFullscreen(true)}
      onCompile={() => editor?.onValidate()}
      buildErrorCount={workspace.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length}
      diagnostics={workspace.diagnostics}
      onNavigateDiagnostic={(diagnostic) => {
        if (!workspace.sourceFiles[diagnostic.filePath] && !workspace.compiledFiles[diagnostic.filePath]) return;
        onSelectFile(diagnostic.filePath);
        setReveal((previous) => ({ filePath: diagnostic.filePath, line: diagnostic.line, column: diagnostic.column, sequence: (previous?.sequence ?? 0) + 1 }));
      }}
    />
    </ScriptEditorReferenceLayout>
    {activeEditor && <ScriptCodeModal
      open={fullscreen} onOpenChange={setFullscreen}
      workspace={workspace} filePath={filePath} fileName={filePath}
      language="lua" content={activeEditor.content} isReadOnly={activeEditor.readOnly}
      editor={activeEditor}
    />}
  </>;
}
