import { useEffect, useId, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { scriptEditorNavigationAtom } from "./scriptEditorNavigation";
import {
  applyMapItemBehavior,
  applySplineBehavior,
  applyTerrainBehavior,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  getScriptWorkspaceId,
  removeBindingById,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  setScriptActiveFile,
  type ScriptBehaviorDefinition,
  type ScriptMapItemBinding,
  type ScriptMapItemSignature,
  type ScriptSplineBinding,
  type ScriptSplineBindingSignature,
  type ScriptTargetKind,
  type ScriptTerrainBinding,
  type ScriptTerrainBindingSignature,
} from "./scriptWorkspaceState";

function matchesTerrainBinding(
  binding: ScriptTerrainBinding,
  signature: ScriptTerrainBindingSignature,
): boolean {
  return (
    binding.signature.itemType === signature.itemType &&
    binding.signature.position.x === signature.position.x &&
    binding.signature.position.y === signature.position.y &&
    binding.signature.position.z === signature.position.z &&
    binding.signature.flags === signature.flags &&
    binding.signature.params.length === signature.params.length &&
    binding.signature.params.every((value, index) => value === signature.params[index])
  );
}

function matchesSplineBinding(
  binding: ScriptSplineBinding,
  signature: ScriptSplineBindingSignature,
): boolean {
  return (
    binding.signature.itemType === signature.itemType &&
    binding.signature.splineNum === signature.splineNum &&
    binding.signature.placement === signature.placement &&
    binding.signature.params.length === signature.params.length &&
    binding.signature.params.every((value, index) => value === signature.params[index])
  );
}

function matchesMapItemBinding(
  binding: ScriptMapItemBinding,
  signature: ScriptMapItemSignature,
): boolean {
  return (
    binding.signature.itemType === signature.itemType &&
    binding.signature.position.x === signature.position.x &&
    binding.signature.position.y === signature.position.y &&
    binding.signature.params.length === signature.params.length &&
    binding.signature.params.every((value, index) => value === signature.params[index])
  );
}

function filterBehaviors(
  behaviors: readonly ScriptBehaviorDefinition[],
  targetKind: ScriptTargetKind,
): readonly ScriptBehaviorDefinition[] {
  return behaviors.filter((behavior) => behavior.targetKinds.includes(targetKind));
}

type ScriptBindingPanelProps =
  | {
      title: string;
      targetKind: "terrainItem";
      selectionLabel: string;
      signature: ScriptTerrainBindingSignature;
    }
  | {
      title: string;
      targetKind: "splineItem";
      selectionLabel: string;
      signature: ScriptSplineBindingSignature;
    }
  | {
      title: string;
      targetKind: "mapItem";
      selectionLabel: string;
      signature: ScriptMapItemSignature;
    };

function ScriptBindingPanel(props: ScriptBindingPanelProps) {
  const behaviorSelectId = useId();
  const { title, targetKind, selectionLabel } = props;
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const setActiveView = useSetAtom(ActiveView);
  const setEditorNavigation = useSetAtom(scriptEditorNavigationAtom);
  const [workspaceStore, setWorkspaceStore] = useAtom(scriptWorkspaceStoreAtom);

  const context = useMemo(
    () => createScriptWorkspaceContext(globals, levelNumber ?? null),
    [globals, levelNumber],
  );
  const workspaceId = useMemo(() => getScriptWorkspaceId(context), [context]);
  const workspace = useMemo(
    () => ensureScriptWorkspace(workspaceStore, context),
    [context, workspaceStore],
  );
  const levelState =
    workspace.levels[context.levelKey] ?? {
      globalHooks: [],
      terrainBindings: [],
      splineBindings: [],
      mapItemBindings: [],
      customPlacements: [],
    };

  const behaviors = useMemo(
    () => filterBehaviors(workspace.behaviorCatalog, targetKind),
    [targetKind, workspace.behaviorCatalog],
  );
  const [behaviorId, setBehaviorId] = useState("");
  const selectedBehaviorId = behaviors.some((behavior) => behavior.id === behaviorId)
    ? behaviorId
    : behaviors[0]?.id ?? "";

  useEffect(() => {
    if (workspaceStore[workspaceId]) {
      return;
    }
    setWorkspaceStore((currentStore) =>
      replaceScriptWorkspace(currentStore, ensureScriptWorkspace(currentStore, context)),
    );
  }, [context, setWorkspaceStore, workspaceId, workspaceStore]);

  const existingBinding = useMemo(() => {
    if (targetKind === "terrainItem") {
      return levelState.terrainBindings.find((binding) =>
        matchesTerrainBinding(binding, props.signature),
      );
    }

    if (targetKind === "splineItem") {
      return levelState.splineBindings.find((binding) =>
        matchesSplineBinding(binding, props.signature),
      );
    }

    return levelState.mapItemBindings.find((binding) =>
      matchesMapItemBinding(binding, props.signature),
    );
  }, [levelState.mapItemBindings, levelState.splineBindings, levelState.terrainBindings, props.signature, targetKind]);

  const updateWorkspace = (
    updater: (current: typeof workspace) => typeof workspace,
  ) => {
    setWorkspaceStore((currentStore) => {
      const current = ensureScriptWorkspace(currentStore, context);
      return replaceScriptWorkspace(currentStore, updater(current));
    });
  };

  const handleAttach = () => {
    if (selectedBehaviorId.length === 0) {
      return;
    }
    if (targetKind === "terrainItem") {
      updateWorkspace((current) =>
        applyTerrainBehavior(
          current,
          selectedBehaviorId,
          selectionLabel,
          props.signature,
        ),
      );
    }
    if (targetKind === "splineItem") {
      updateWorkspace((current) =>
        applySplineBehavior(
          current,
          selectedBehaviorId,
          selectionLabel,
          props.signature,
        ),
      );
    }
    if (targetKind === "mapItem") {
      updateWorkspace((current) =>
        applyMapItemBehavior(
          current,
          selectedBehaviorId,
          selectionLabel,
          props.signature,
        ),
      );
    }
    toast.success("Attached script behavior");
  };

  const handleEditCode = () => {
    if (!existingBinding) {
      return;
    }
    updateWorkspace((current) => setScriptActiveFile(current, existingBinding.sourceFilePath));
    setEditorNavigation((previous) => ({ gameId: context.gameId, filePath: existingBinding.sourceFilePath, line: 1, column: 1, sequence: (previous?.sequence ?? 0) + 1 }));
    setActiveView(View.scripts);
  };

  return (
    <section className="min-w-0 py-2" aria-label={`${title} for ${selectionLabel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{selectionLabel}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="grid min-w-0 flex-1 gap-2">
          <Label htmlFor={behaviorSelectId}>Select behavior</Label>
          <Select value={selectedBehaviorId} onValueChange={setBehaviorId}>
            <SelectTrigger id={behaviorSelectId}>
              <SelectValue placeholder="Select a behavior" />
            </SelectTrigger>
            <SelectContent>
              {behaviors.map((behavior) => (
                <SelectItem key={behavior.id} value={behavior.id}>
                  {behavior.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAttach} disabled={selectedBehaviorId.length === 0}>
          {existingBinding ? "Replace" : "Attach"}
        </Button>
        <Button variant="ghost" onClick={handleEditCode} disabled={!existingBinding}>
          Edit
        </Button>
      {existingBinding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              updateWorkspace((current) => removeBindingById(current, existingBinding.id));
              toast.success("Removed script behavior");
            }}
          >
            Remove
          </Button>
      )}
      </div>
      {existingBinding && (
        <details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer">Behavior details</summary><p className="mt-1 break-all font-mono">{existingBinding.sourceFilePath}</p>{existingBinding.compatibility === "extended-only" && <p className="mt-1">Requires extended scripting</p>}</details>
      )}
    </section>
  );
}

export function TerrainItemScriptSection({
  selectionLabel,
  signature,
}: {
  selectionLabel: string;
  signature: ScriptTerrainBindingSignature;
}) {
  return (
    <ScriptBindingPanel
      title="Script"
      targetKind="terrainItem"
      selectionLabel={selectionLabel}
      signature={signature}
    />
  );
}

export function SplineItemScriptSection({
  selectionLabel,
  signature,
}: {
  selectionLabel: string;
  signature: ScriptSplineBindingSignature;
}) {
  return (
    <ScriptBindingPanel
      title="Script"
      targetKind="splineItem"
      selectionLabel={selectionLabel}
      signature={signature}
    />
  );
}

export function MapItemScriptSection({
  selectionLabel,
  signature,
}: {
  selectionLabel: string;
  signature: ScriptMapItemSignature;
}) {
  return (
    <ScriptBindingPanel
      title="Script"
      targetKind="mapItem"
      selectionLabel={selectionLabel}
      signature={signature}
    />
  );
}
