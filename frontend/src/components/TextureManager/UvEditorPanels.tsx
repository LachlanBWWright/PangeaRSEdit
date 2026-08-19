import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UvLayout, UvMeshLayout, UvVertex } from "@/modelEditing/uv/uvTypes";
import { getMeshStroke } from "./uvMapEditorState";

interface MeshPanelProps {
  readonly layout: UvLayout;
  readonly selectedMesh: UvMeshLayout | null;
  readonly overlappingMeshIds: ReadonlySet<string>;
  readonly showOtherMeshes: boolean;
  readonly editSelectedOnly: boolean;
  readonly onShowOtherMeshesChange: (checked: boolean) => void;
  readonly onEditSelectedOnlyChange: (checked: boolean) => void;
  readonly onSelectMesh: (mesh: UvMeshLayout) => void;
}

export function UvMeshPanel({
  layout,
  selectedMesh,
  overlappingMeshIds,
  showOtherMeshes,
  editSelectedOnly,
  onShowOtherMeshesChange,
  onEditSelectedOnlyChange,
  onSelectMesh,
}: MeshPanelProps) {
  const showOtherMeshesId = useId();
  const editSelectedOnlyId = useId();

  return (
    <section className="flex min-h-0 flex-col gap-3 rounded border border-gray-700 bg-gray-900/60 p-3">
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Texture material</p>
        <p className="text-sm text-gray-100">
          {layout.materialName ?? "Unknown"}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor={showOtherMeshesId} className="text-xs text-gray-400">
          Show other meshes
        </Label>
        <Switch
          id={showOtherMeshesId}
          checked={showOtherMeshes}
          onCheckedChange={onShowOtherMeshesChange}
        />
      </div>
      <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-950/50 px-2 py-1.5">
        <Label htmlFor={editSelectedOnlyId} className="text-xs text-gray-400">
          Edit selected mesh only
        </Label>
        <Switch
          id={editSelectedOnlyId}
          checked={editSelectedOnly}
          onCheckedChange={onEditSelectedOnlyChange}
        />
      </div>
      {overlappingMeshIds.size > 0 && (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
          {overlappingMeshIds.size} mesh
          {overlappingMeshIds.size === 1 ? "" : "es"} overlap the selected UV
          bounds.
        </p>
      )}
      <div className="min-h-0 space-y-2">
        <p className="text-xs text-gray-400">Meshes</p>
        <div className="max-h-[32vh] space-y-1 overflow-y-auto rounded border border-gray-700 bg-gray-950/50 p-1 xl:max-h-none">
          {layout.meshes.map((mesh, meshIndex) => {
            const isSelected = mesh.meshId === selectedMesh?.meshId;
            return (
              <Button
                key={mesh.meshId}
                type="button"
                variant="ghost"
                className={`h-auto w-full justify-start rounded-md border px-2 py-2 text-left ${
                  isSelected
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-transparent bg-gray-900/70"
                }`}
                aria-pressed={isSelected}
                onClick={() => onSelectMesh(mesh)}
              >
                <span
                  className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getMeshStroke(meshIndex) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-100">
                    {mesh.meshName}
                  </span>
                  <span className="mt-1 flex justify-between text-[11px] text-gray-400">
                    <span>{mesh.vertices.length} vertices</span>
                    <span>
                      {overlappingMeshIds.has(mesh.meshId)
                        ? "overlap"
                        : `${mesh.faces.length} faces`}
                    </span>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface InspectorProps {
  readonly layout: UvLayout;
  readonly selectedMesh: UvMeshLayout | null;
  readonly selectedVertexIndex: number | null;
  readonly selectedVertex: UvVertex | null;
  readonly canApply: boolean;
  readonly onCoordinateChange: (axis: "u" | "v", value: string) => void;
  readonly onApply: () => void;
}

export function UvVertexInspector({
  layout,
  selectedMesh,
  selectedVertexIndex,
  selectedVertex,
  canApply,
  onCoordinateChange,
  onApply,
}: InspectorProps) {
  const uInputId = useId();
  const vInputId = useId();
  const faceCount = layout.meshes.reduce(
    (sum, mesh) => sum + mesh.faces.length,
    0,
  );

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded border border-gray-700 bg-gray-900/60 p-3">
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Selected mesh</p>
        <p className="text-sm text-gray-100">
          {selectedMesh?.meshName ?? "None"}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Selected vertex</p>
        <p className="text-sm text-gray-100">
          {selectedVertexIndex === null ? "Pick a vertex" : `#${selectedVertexIndex}`}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={uInputId} className="text-xs text-gray-400">U coordinate</Label>
        <Input
          id={uInputId}
          type="number"
          min={0}
          max={1}
          step={0.001}
          value={selectedVertex?.u.toFixed(3) ?? ""}
          disabled={!selectedVertex}
          onChange={(event) => onCoordinateChange("u", event.target.value)}
        />
        <Label htmlFor={vInputId} className="text-xs text-gray-400">V coordinate</Label>
        <Input
          id={vInputId}
          type="number"
          min={0}
          max={1}
          step={0.001}
          value={selectedVertex?.v.toFixed(3) ?? ""}
          disabled={!selectedVertex}
          onChange={(event) => onCoordinateChange("v", event.target.value)}
        />
      </div>
      <dl className="rounded border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-400">
        <div className="flex justify-between"><dt>Meshes</dt><dd>{layout.meshes.length}</dd></div>
        <div className="mt-1 flex justify-between"><dt>Total faces</dt><dd>{faceCount}</dd></div>
      </dl>
      <Button size="sm" onClick={onApply} disabled={!canApply}>
        Apply UV edits
      </Button>
    </aside>
  );
}
