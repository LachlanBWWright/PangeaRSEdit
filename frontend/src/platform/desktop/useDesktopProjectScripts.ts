import { useEffect, useMemo, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { z } from "zod";
import { toast } from "sonner";
import { ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptWorkspaceContext } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopBridge, desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";
import { loadProjectScripts } from "./projectBuild";
import { readProjectFiles } from "./projectLoad";
import { scriptCaptureKey } from "./projectCapture";
import { readRecovery } from "./projectActions";
import { saveProjectScripts } from "./scriptProjectActions";

export function useDesktopProjectScripts(context: ScriptWorkspaceContext) {
  const [project, setProject] = useAtom(desktopProjectAtom);
  const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
  const workspace = useMemo(() => ensureScriptWorkspace(store, context), [store, context]);
  const [dirty, setDirty] = useAtom(desktopProjectDirtyAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const setConflictOpen = useSetAtom(desktopConflictOpenAtom);
  const setDocument = useSetAtom(desktopActiveDocumentAtom);
  const saved = useRef(scriptCaptureKey(workspace));
  const loaded = useRef("");
  const busy = useRef(false);
  const latest = useRef(workspace);
  const actions = useRef<{ save: () => Promise<void>; backup: () => Promise<void>; recover: () => Promise<void>; discard: () => void }>({
    save: async () => undefined, backup: async () => undefined, recover: async () => undefined, discard: () => undefined,
  });
  async function recover() {
    if (!project) return;
    const files = await readRecovery();
    if (files.isErr()) { toast.error(files.error.message); return; }
    const result = await loadProjectScripts(files.value, context);
    if (result.isErr()) { toast.error(result.error); return; }
    if (!result.value) { toast.info("The recovery snapshot does not contain scripts"); return; }
    saved.current = "";
    loaded.current = `${project.folder}:${project.revision}`;
    const recovered = result.value;
    setStore((previous) => replaceScriptWorkspace(previous, recovered));
    setDirty(true);
  }

  async function save(recovery: boolean): Promise<void> {
    if (!project || busy.current) return;
    if (!recovery && external) { setConflictOpen(true); return; }
    busy.current = true;
    const captured = latest.current;
    const result = await saveProjectScripts(project, captured, recovery);
    if (result.isErr()) toast.error(result.error);
    else if (result.value === null) setProject((current) => current ? { ...current, recoveryAvailable: true } : current);
    else {
      saved.current = scriptCaptureKey(captured);
      loaded.current = `${result.value.folder}:${result.value.revision}`;
      setProject(result.value);
      setDirty(scriptCaptureKey(latest.current) !== saved.current);
      toast.success("Project scripts saved");
    }
    busy.current = false;
  }
  useEffect(() => { latest.current = workspace; }, [workspace]);
  useEffect(() => {
    actions.current = { save: () => save(false), backup: () => save(true), recover, discard: () => {
      saved.current = scriptCaptureKey(latest.current);
      loaded.current = "";
      setDirty(false);
      void desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
    } };
  });
  useEffect(() => {
    if (!desktopBridge() || !project) return;
    setDocument({ kind: "scripts", save: () => actions.current.save(), recover: () => actions.current.recover(), discard: () => actions.current.discard() });
    return () => setDocument(null);
  }, [project, setDocument]);
  useEffect(() => {
    if (!desktopBridge() || !project || dirty) return;
    const key = `${project.folder}:${project.revision}`;
    if (loaded.current === key) return;
    let current = true;
    const before = scriptCaptureKey(latest.current);
    void readProjectFiles(project, project.files.filter((file) => file.path.startsWith("Data/Scripts/") || file.path === ".luarc.json").map((file) => file.path)).then(async (files) => {
      if (files.isErr()) { toast.error(files.error.message); return; }
      const scripts = await loadProjectScripts(files.value, context);
      if (!current) return;
      if (scripts.isErr()) { toast.error(scripts.error); return; }
      loaded.current = key;
      if (scriptCaptureKey(latest.current) !== before) { setDirty(true); return; }
      const next = scripts.value ?? ensureScriptWorkspace({}, context);
      saved.current = scriptCaptureKey(next);
      setStore((previous) => replaceScriptWorkspace(previous, next));
    });
    return () => { current = false; };
  }, [project, dirty, context, setStore, setDirty]);
  useEffect(() => {
    if (!desktopBridge() || !project || loaded.current !== `${project.folder}:${project.revision}`) return;
    const changed = scriptCaptureKey(workspace) !== saved.current;
    setDirty(changed);
    void desktopRequest({ operation: "host.dirty", dirty: changed }, z.void());
  }, [workspace, project, dirty, setDirty]);
  useEffect(() => {
    if (!desktopBridge() || !project || !dirty) return;
    const timer = window.setInterval(() => { void actions.current.backup(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [project, dirty]);

}
