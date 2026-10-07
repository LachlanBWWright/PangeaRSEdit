import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useAtomValue } from "jotai";
import Editor, { type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import type { Result } from "neverthrow";
import { toast } from "sonner";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { configureScriptMonaco, ensureScriptMonacoConfigured } from "./scriptMonaco";
import { scriptLspClient } from "./scriptLspClient";
import { formatScriptModel, renameAndApplyScriptSymbol } from "./scriptEditorLanguageActions";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptWorkspaceFileEdit } from "./scriptWorkspaceEdits";
import { scriptEditorUri } from "./scriptEditorUris";
import { getScriptBuildStatus } from "./scriptBuildStatus";
import { scriptRecoveryStatusAtom } from "./scriptWorkspaceRecovery";
import { focusScriptRenameInput, scriptEditorLanguageHelp, scriptEditorOrigin, scriptEditorRecoveryLabel, scriptEditorSymbolAtCursor, scriptLanguageActionHelp } from "./scriptSourceEditorHelp";
import { registerScriptEditorShortcuts } from "./scriptSourceEditorShortcuts";

export interface ScriptEditorReveal {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly sequence: number;
}

export interface ScriptSourceEditorProps {
  workspace: ScriptWorkspaceState;
  filePath: string;
  content: string;
  readOnly: boolean;
  onChange: (path: string, content: string) => void;
  onSave: (path: string, content: string) => void;
  onSelectFile: (path: string) => void;
  onValidate: () => void;
  onOpenReference: () => void;
  onApplyEdits: (edits: readonly ScriptWorkspaceFileEdit[]) => Result<void, string>;
  reveal?: ScriptEditorReveal;
  showFileNavigation?: boolean;
  onExpand?: () => void;
}

function sourceModel(gameId: string, path: string): monaco.editor.ITextModel | null {
  return monaco.editor.getModel(monaco.Uri.parse(scriptEditorUri(gameId, path)));
}

function revealEditorLocation(editor: monaco.editor.IStandaloneCodeEditor, location: ScriptEditorReveal | undefined, path: string): void {
  if (!location || location.filePath !== path) return;
  const model = editor.getModel();
  if (!model) return;
  const position = model.validatePosition({ lineNumber: Math.max(1, location.line), column: Math.max(1, location.column) });
  editor.setPosition(position);
  editor.revealPositionInCenter(position);
  editor.focus();
}

export function ScriptSourceEditor(props: ScriptSourceEditorProps) {
  const { workspace, filePath, content, readOnly, onChange, onSave, onSelectFile, onValidate, onOpenReference, onApplyEdits, reveal, showFileNavigation = true, onExpand } = props;
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);
  const [renameName, setRenameName] = useState("");
  const [showRename, setShowRename] = useState(false);
  const [working, setWorking] = useState(false);
  const languageHelpId = useId();
  const recovery = useAtomValue(scriptRecoveryStatusAtom);
  const status = useSyncExternalStore((listener) => scriptLspClient.subscribe(listener), () => scriptLspClient.getStatus(), () => "disconnected");
  const capabilities = useSyncExternalStore((listener) => scriptLspClient.subscribe(listener), () => scriptLspClient.getCapabilities());
  const source = workspace.sourceFiles[filePath];
  const dirty = source !== undefined && content !== source.savedContent;
  const buildStatus = getScriptBuildStatus(workspace);
  const origin = scriptEditorOrigin(workspace, filePath, readOnly);
  const originPath = workspace.compiledFiles[filePath]?.sourcePath;
  const languageHelp = scriptEditorLanguageHelp(hasConfiguredApiEndpoint(), status, capabilities);
  const fileGroups = [{ label: "Source", paths: Object.keys(workspace.sourceFiles) }, { label: "Build output", paths: Object.keys(workspace.compiledFiles) }];

  useEffect(() => {
    ensureScriptMonacoConfigured();
    const disposables = configureScriptMonaco(propsRef.current.workspace, () => propsRef.current.workspace);
    return () => { for (const disposable of disposables) disposable.dispose(); };
  }, [workspace.context.gameId]);

  useEffect(() => {
    if (!hasConfiguredApiEndpoint()) return;
    void scriptLspClient.connect(workspace).match(() => undefined, () => undefined);
  }, [workspace]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) revealEditorLocation(editor, reveal, filePath);
  }, [reveal, filePath]);

  const mount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeModel(() => {
      const model = editor.getModel();
      if (!model) return;
      const path = scriptLspClient.sourcePath(model.uri.toString());
      const current = propsRef.current;
      if (path && path !== current.filePath && (current.workspace.sourceFiles[path] || current.workspace.compiledFiles[path])) current.onSelectFile(path);
      revealEditorLocation(editor, current.reveal, current.filePath);
    });
    const shortcuts = registerScriptEditorShortcuts(editor, () => propsRef.current);
    editor.onDidDispose(() => { for (const shortcut of shortcuts) shortcut.dispose(); });
    revealEditorLocation(editor, propsRef.current.reveal, propsRef.current.filePath);
  };

  const format = async () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    setWorking(true);
    const result = await formatScriptModel(editor, model.getOptions().tabSize, model.getOptions().insertSpaces);
    setWorking(false);
    if (result.isErr()) toast.error(result.error);
  };

  const rename = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setWorking(true);
    const result = await renameAndApplyScriptSymbol(workspace, editor, renameName, (path) => sourceModel(workspace.context.gameId, path), onApplyEdits);
    setWorking(false);
    if (result.isErr()) { toast.error(result.error); return; }
    setShowRename(false);
    toast.success(`Renamed symbol in ${String(result.value)} file(s)`);
  };

  return (
    <section className={`grid min-w-0 ${showFileNavigation ? "md:grid-cols-[220px_minmax(0,1fr)]" : ""}`} aria-label="Lua source editor">
      {showFileNavigation && <nav className="min-w-0 border-b border-slate-800 py-3 md:border-b-0 md:border-r md:pr-3" aria-label="Source and generated files">
        <div className="flex gap-4 overflow-x-auto md:max-h-[650px] md:flex-col md:overflow-y-auto">
          {fileGroups.filter((group) => group.paths.length > 0).map((group) => <div key={group.label} className="min-w-0 shrink-0 md:shrink">
            <p className="mb-2 px-2 text-xs font-medium text-slate-500">{group.label}</p>
            <div className="flex md:flex-col">{group.paths.map((path) => <Button key={path} size="sm" variant="ghost" className={`h-auto min-w-0 justify-start rounded-none border-l-2 px-2 py-2 text-left ${path === filePath ? "border-blue-400 bg-blue-500/10" : "border-transparent"}`} aria-pressed={path === filePath} title={path} onClick={() => onSelectFile(path)}>
              <span className="truncate">{path.replace("Data/Scripts/src/", "").replace("Data/Scripts/dist/", "")}{workspace.sourceFiles[path]?.content !== workspace.sourceFiles[path]?.savedContent ? " *" : ""}</span>
            </Button>)}</div>
          </div>)}
        </div>
      </nav>}
      <div className={`min-w-0 ${showFileNavigation ? "md:pl-4" : ""}`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800 py-3">
        <p className="min-w-0 flex-1 basis-full truncate text-sm font-medium text-slate-200 xl:basis-0" title={filePath}>{filePath.replace("Data/Scripts/src/", "").replace("Data/Scripts/dist/", "dist/")}</p>
        <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" disabled={readOnly || !dirty} onClick={() => onSave(filePath, editorRef.current?.getValue() ?? content)} title="Mark this draft as a saved checkpoint (Ctrl/Cmd+S). Browser recovery runs separately." aria-keyshortcuts="Control+S Meta+S">Save</Button>
        <Button size="sm" variant="outline" onClick={onValidate} title="Validate the current script bundle (Ctrl/Cmd+Enter)" aria-keyshortcuts="Control+Enter Meta+Enter">Validate Bundle</Button>
        <span className="inline-flex" title={scriptLanguageActionHelp("format", readOnly, working, status, capabilities, languageHelp)}><Button size="sm" variant="ghost" disabled={readOnly || working || status !== "connected" || !capabilities.formatting} onClick={() => void format()} aria-describedby={!readOnly && languageHelp ? languageHelpId : undefined}>Format</Button></span>
        <span className="inline-flex" title={scriptLanguageActionHelp("rename", readOnly, working, status, capabilities, languageHelp)}><Button size="sm" variant="ghost" disabled={readOnly || working || status !== "connected" || !capabilities.rename} onClick={() => { setRenameName(scriptEditorSymbolAtCursor(editorRef.current)); setShowRename(!showRename); }} aria-describedby={!readOnly && languageHelp ? languageHelpId : undefined}>Rename Symbol</Button></span>
        <Button size="sm" variant="ghost" onClick={onOpenReference}>Hooks & API Reference</Button>
        {onExpand && <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onExpand} aria-label="Full screen" title="Full screen"><Maximize2 className="size-4" aria-hidden="true" /></Button>}
        </div>
      </div>
      {origin && <div className="flex flex-wrap items-center gap-x-3 border-b border-slate-800 py-2 text-xs text-slate-400"><p>{origin}</p>{originPath && workspace.sourceFiles[originPath]?.readOnly === false && <Button size="sm" variant="ghost" onClick={() => onSelectFile(originPath)}>Edit source</Button>}</div>}
      {!readOnly && languageHelp && <p id={languageHelpId} className="py-2 text-xs text-slate-500">{languageHelp}</p>}
      {showRename && (
        <form className="flex flex-wrap gap-2 border-b border-slate-800 py-3" onSubmit={(event) => { event.preventDefault(); void rename(); }}>
          <p className="w-full text-xs text-slate-400">Rename the symbol at the cursor and its references across editable workspace files.</p>
          <Input ref={focusScriptRenameInput} aria-label="New symbol name" value={renameName} onChange={(event) => setRenameName(event.target.value)} placeholder="New symbol name" />
          <Button size="sm" disabled={working || renameName.trim().length === 0} type="submit">Apply Rename</Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => { setShowRename(false); editorRef.current?.focus(); }}>Cancel</Button>
        </form>
      )}
      <div className="h-[min(65vh,650px)] min-h-[350px] overflow-hidden bg-[#1e1e1e]">
        <Editor height="100%" language="lua" path={scriptEditorUri(workspace.context.gameId, filePath)} value={content} onChange={(value) => onChange(filePath, value ?? "")} onMount={mount} keepCurrentModel saveViewState theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, readOnly, scrollBeyondLastLine: false, wordWrap: "on" }} />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-800 py-2 text-xs text-slate-500" role="status">
        <span className={dirty ? "text-amber-300" : ""} title="Save marks an editing checkpoint. Draft recovery is automatic while browser storage is available; export a package for a portable backup.">{readOnly ? "Generated file · read-only" : dirty ? "Draft · Save to mark checkpoint" : "Saved checkpoint"}</span>
        {!readOnly && <span className={recovery.phase === "error" || recovery.phase === "unavailable" ? "text-amber-300" : ""} title={recovery.message}>{scriptEditorRecoveryLabel(recovery)}</span>}
        <span>{buildStatus.message}</span>
        <span className="md:ml-auto">{hasConfiguredApiEndpoint() ? status === "connected" ? "LuaLS connected" : `LuaLS ${status} · fallback snippets` : "Offline snippets and signatures"}</span>
      </p>
      </div>
    </section>
  );
}
