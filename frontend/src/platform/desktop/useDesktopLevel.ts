import { useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { z } from "zod";
import { PROJECT_MANIFEST, projectManifestSchema, type ProjectFile, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { Result } from "neverthrow";
import { toast } from "sonner";
import type { OpenFileArgs } from "@/editor/loadLogic/openFile";
import { replaceScriptWorkspace, type ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopBridge, desktopRequest } from "./client";
import { desktopGameId } from "./games";
import { desktopActiveDocumentAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDirtyAtom } from "./projectState";
import { guardProjectLoadHandlers, loadProjectLevel } from "./projectLoad";
import { prepareProjectSave, type LevelProjectInput } from "./projectBuild";
import { err } from "neverthrow";
import { readRecovery, saveProjectLevel, testProjectLevel } from "./projectActions";
import { projectCaptureKey } from "./projectCapture";
import { mergeExternalSources } from "./mergeExternalSources";

interface DesktopLevelOptions {
  input: LevelProjectInput | null;
  handlers: Omit<OpenFileArgs, "url" | "gameType">;
  setBaseLevel: (level: number) => void;
  clearLevel: () => void;
  setScriptStore: (update: (store: Readonly<Record<string, ScriptWorkspaceState>>) => Readonly<Record<string, ScriptWorkspaceState>>) => void;
}

export function useDesktopLevel(options: DesktopLevelOptions) {
  const canSave = options.input !== null;
  const baseLevel = options.input?.baseLevel ?? 0;
  const setBaseLevel = options.setBaseLevel;
  const [project, setProject] = useAtom(desktopProjectAtom);
  const [levelId, setLevelId] = useAtom(desktopLevelIdAtom);
  const [dirty, setDirty] = useAtom(desktopProjectDirtyAtom);
  const setCommands = useSetAtom(desktopProjectCommandsAtom);
  const setActiveDocument = useSetAtom(desktopActiveDocumentAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const setConflictOpen = useSetAtom(desktopConflictOpenAtom);
  const latest = useRef(options);
  const savedCapture = useRef("");
  const loaded = useRef("");
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(() => () => { generation.current++; }, [project?.folder, project?.revision, levelId]);
  useEffect(() => { latest.current = options; }, [options]);
  useEffect(() => {
    if (project && !levelId && loaded.current) {
      loaded.current = "";
      savedCapture.current = "";
      latest.current.clearLevel();
      setDirty(false);
    }
  }, [project, levelId, setDirty]);

  const load = useCallback(async (snapshot: ProjectSnapshot, id: string, recovered?: ProjectFile[]) => {
    const token = ++generation.current;
    const level = snapshot.manifest.levels.find((entry) => entry.id === id);
    if (!level) return false;
    if (!recovered && !snapshot.files.some((file) => file.path === level.primary)) {
      latest.current.clearLevel();
      savedCapture.current = "";
      loaded.current = `${snapshot.folder}:${snapshot.revision}:${id}`;
      setDirty(false);
      toast.info("The level file was deleted outside the editor. The document was closed.");
      return false;
    }
    const handlers = guardProjectLoadHandlers(latest.current.handlers, () => generation.current === token);
    const result = await loadProjectLevel(snapshot, level, handlers, recovered);
    if (generation.current !== token) return false;
    if (result.isErr()) { toast.error("Could not open project level", { description: result.error }); return false; }
    savedCapture.current = recovered === undefined ? projectCaptureKey(result.value) : "";
    latest.current.setBaseLevel(level.baseLevel);
    latest.current.setScriptStore((store) => replaceScriptWorkspace(store, result.value.workspace));
    loaded.current = `${snapshot.folder}:${snapshot.revision}:${id}`;
    if (recovered) { savedCapture.current = ""; setDirty(true); }
    else toast.success("Project level opened");
    return true;
  }, [setDirty]);

  useEffect(() => {
    if (!desktopBridge() || !project) return;
    if (levelId && loaded.current !== `${project.folder}:${project.revision}:${levelId}`) return;
    const capture = options.input;
    const key = projectCaptureKey(capture);
    const changed = capture !== null && key !== savedCapture.current;
    setDirty(changed);
    void desktopRequest({ operation: "host.dirty", dirty: changed }, z.void());
  }, [options.input, project, levelId, setDirty]);

  useEffect(() => {
    if (!desktopBridge() || !project || !levelId || dirty) return;
    const key = `${project.folder}:${project.revision}:${levelId}`;
    if (loaded.current !== key) void load(project, levelId);
  }, [project, levelId, dirty, load]);

  const save = useCallback(async () => {
    if (external) { setConflictOpen(true); return; }
    const input = latest.current.input;
    if (!project || !input) { toast.error("Load or create a level before saving the project"); return; }
    if (saving.current) return;
    if (desktopGameId(input.globals.GAME_TYPE) !== project.manifest.game) { toast.error("The open level targets a different game from this project"); return; }
    saving.current = true;
    await saveProjectLevel(project, levelId, input, (snapshot, id, capture) => {
      savedCapture.current = projectCaptureKey(capture);
      loaded.current = `${snapshot.folder}:${snapshot.revision}:${id}`;
      setLevelId(id);
      setProject(snapshot);
      setDirty(projectCaptureKey(latest.current.input) !== savedCapture.current);
    });
    saving.current = false;
  }, [project, levelId, setDirty, setLevelId, setProject, external, setConflictOpen]);

  const test = useCallback(async (withScripts = true) => {
    const input = latest.current.input;
    if (input) await testProjectLevel(project, input, withScripts, levelId);
  }, [project, levelId]);

  const recover = useCallback(async () => {
    if (!project) return;
    const files = await readRecovery();
    if (files.isErr()) { toast.error(files.error.message); return; }
    const manifestFile = files.value.find((file) => file.path === PROJECT_MANIFEST);
    if (!manifestFile) return;
    const json = Result.fromThrowable((): unknown => JSON.parse(new TextDecoder().decode(manifestFile.bytes)), () => "Invalid recovery data")();
    if (json.isErr()) { toast.error(json.error); return; }
    const parsed = projectManifestSchema.safeParse(json.value);
    if (!parsed.success) { toast.error("Invalid recovery manifest"); return; }
    const id = parsed.data.levels.findLast((level) => files.value.some((file) => file.path === level.primary))?.id;
    if (!id) { toast.info("The recovery snapshot does not contain a level"); return; }
    const snapshot = { ...project, manifest: parsed.data };
    setDirty(true);
    const restored = await load(snapshot, id, files.value);
    if (restored) {
      setProject(snapshot);
      setLevelId(id);
      toast.success("Unsaved level recovered");
    } else setDirty(dirty);
  }, [project, load, setLevelId, setProject, setDirty, dirty]);

  const discard = useCallback(() => {
    savedCapture.current = projectCaptureKey(latest.current.input);
    setDirty(false);
    loaded.current = "";
    void desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
  }, [setDirty]);

  useEffect(() => {
    if (!desktopBridge()) return;
    setCommands({ save, test, recover, discard, canSave, baseLevel, setBaseLevel });
    setActiveDocument({ kind: "level", save, discard, recover, mergeSources: async (snapshot, paths) => {
      const input = latest.current.input;
      if (!input) return false;
      const merged = await mergeExternalSources(input.workspace, snapshot, paths);
      if (merged.isErr()) { toast.error(merged.error); return false; }
      loaded.current = `${snapshot.folder}:${snapshot.revision}:${levelId}`;
      latest.current.setScriptStore((store) => replaceScriptWorkspace(store, merged.value));
      setDirty(true);
      return true;
    }, capture: () => projectCaptureKey(latest.current.input), prepare: async () => {
      const input = latest.current.input;
      return project && input ? prepareProjectSave(project, levelId, input) : err("Load a level before building a conflict review");
    } });
    return () => { setCommands(null); setActiveDocument(null); };
  }, [save, test, recover, discard, setCommands, setActiveDocument, baseLevel, canSave, setBaseLevel, levelId, setDirty, project]);

  useEffect(() => {
    if (!desktopBridge() || !project || !dirty) return;
    const timer = window.setInterval(() => {
      const input = latest.current.input;
      if (!input || saving.current) return;
      saving.current = true;
      void saveProjectLevel(project, levelId, input, () => undefined, true).then((created) => {
        if (created) setProject((current) => current ? { ...current, recoveryAvailable: true } : current);
        saving.current = false;
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [project, levelId, dirty, setProject]);
  return { test };
}
