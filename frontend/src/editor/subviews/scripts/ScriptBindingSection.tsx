import { useEffect, useMemo, useState } from "react";
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
  const { title, targetKind, selectionLabel } = props;
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const setActiveView = useSetAtom(ActiveView);
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
    setActiveView(View.scripts);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{selectionLabel}</p>
        </div>
        {existingBinding && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
            {existingBinding.compatibility === "preview-ready" ? "Preview Ready" : "Extended Only"}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div className="grid gap-2">
          <Label>Select behavior</Label>
          <Select value={selectedBehaviorId} onValueChange={setBehaviorId}>
            <SelectTrigger>
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
        <Button variant="outline" onClick={handleEditCode} disabled={!existingBinding}>
          Edit Code
        </Button>
      </div>
      {existingBinding && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateWorkspace((current) => removeBindingById(current, existingBinding.id));
              toast.success("Removed script behavior");
            }}
          >
            Remove Binding
          </Button>
        </div>
      )}
      {existingBinding && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
          Source file: {existingBinding.sourceFilePath}
        </div>
      )}
    </div>
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
