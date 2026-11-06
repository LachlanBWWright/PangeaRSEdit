import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScriptNumberField } from "./ScriptNumberField";
import { CustomObjectAnimations } from "./CustomObjectAnimations";
import { changeObjectVisual } from "./scriptObjectVisuals";
import { getCustomModelFormat } from "./scriptObjectActions";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { useProjectModelAssets } from "@/platform/desktop/useProjectModelAssets";
import { desktopBridge } from "@/platform/desktop/client";
import { NativeObjectAvailability } from "./NativeObjectAvailability";
import { UploadedObjectModelPreview } from "./UploadedObjectModelPreview";
import { GameModelChooser } from "./GameModelChooser";
import { ObjectAppearanceAssets } from "./ObjectAppearanceAssets";
import { useObjectAnimationClips } from "./useObjectAnimationClips";
import { objectAppearanceName } from "./scriptObjectPreview";

interface Props {
  workspace: ScriptWorkspaceState;
  definition: ScriptCustomObjectDefinition;
  onChange: (definition: ScriptCustomObjectDefinition) => void;
  onUpload: (file: File, role: "model" | "skeleton") => void;
  uploading: boolean;
  update: (change: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void;
  nativeMetadata?: Readonly<Record<string, string>>;
}

export function CustomObjectAppearance({ workspace, definition, onChange, onUpload, uploading, nativeMetadata, update }: Props) {
  const globals = useAtomValue(Globals);
  const library = useProjectModelAssets();
  const visual = definition.visual;
  const format = getCustomModelFormat(workspace.context.gameId);
  const skeletal = visual.kind === "nativeSkeleton" || visual.kind === "customSkeleton";
  const custom = visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton";
  const projectModel = !!desktopBridge() && !!library.project && format !== "shapes";
  const asset = library.assets.find((entry) => entry.id === definition.assetId);
  const clips = useObjectAnimationClips(globals.GAME_TYPE, workspace, definition, nativeMetadata);
  const name = asset?.name ?? objectAppearanceName(globals.GAME_TYPE, workspace, definition, nativeMetadata);
  return <div className="object-appearance">
    <header className="object-appearance-header"><div><h3>Current appearance</h3><p className="object-appearance-name">{name}</p></div>
      <GameModelChooser key={definition.id} game={globals.GAME_TYPE} workspace={workspace} definition={definition} metadata={nativeMetadata} onChange={onChange} update={update} />
    </header>
    <div className="object-appearance-layout">
      <div className="object-appearance-preview">
        {visual.kind === "none" ? <p className="workbench-notice">Invisible objects can run Lua and use collision. Choose a model to make this object visible.</p>
          : format === "shapes" ? <p className="workbench-muted">Sprite dimensions are shown in Collision.</p>
          : !definition.assetId && <UploadedObjectModelPreview definition={definition} workspace={workspace} metadata={nativeMetadata} showCollision={false} />}
        {custom && projectModel && definition.assetId && <ObjectAppearanceAssets definition={definition} workspace={workspace} projectModel={projectModel} library={library} onChange={onChange} onUpload={onUpload} uploading={uploading} />}
      </div>
      <aside className="object-appearance-settings" aria-label="Appearance settings">
        <div className="workbench-field"><label htmlFor={`object-visual-${definition.id}`}>Appearance</label><Select value={visual.kind} onValueChange={(value) => onChange(changeObjectVisual(definition, value, workspace.context.gameId))}>
          <SelectTrigger id={`object-visual-${definition.id}`}><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="none">Invisible / logic only</SelectItem><SelectItem value="nativeDisplayGroup">Game model</SelectItem>
            <SelectItem value={projectModel && custom ? visual.kind : "customDisplayGroup"}>{projectModel ? "Project model" : "Uploaded model"}</SelectItem>
            {format !== "shapes" && <><SelectItem value="nativeSkeleton">Game skeleton</SelectItem>{!projectModel && <SelectItem value="customSkeleton">Uploaded skeleton</SelectItem>}</>}
            {visual.kind === "nativeActor" && <SelectItem value="nativeActor">Existing actor with native behavior</SelectItem>}
          </SelectContent></Select></div>
        <NativeObjectAvailability game={globals.GAME_TYPE} definition={definition} levelNumber={workspace.context.levelNumber} metadata={nativeMetadata} />
        {visual.kind !== "none" && <ScriptNumberField label="Model scale" value={visual.scale} min={0.01} max={100} step={0.05} onChange={(scale) => onChange({ ...definition, visual: { ...visual, scale } })} />}
        {skeletal && <CustomObjectAnimations definition={definition} onChange={onChange} availableClips={asset?.animations ?? clips} />}
        {custom && (!projectModel || !definition.assetId) && <ObjectAppearanceAssets definition={definition} workspace={workspace} projectModel={projectModel} library={library} onChange={onChange} onUpload={onUpload} uploading={uploading} />}
        {visual.kind === "nativeActor" && <p className="workbench-muted">Uses its native movement, collision and interactions.</p>}
        {visual.kind !== "none" && visual.kind !== "nativeActor" && <details className="workbench-disclosure"><summary>Native asset details</summary><div className="workbench-fields">
          {visual.kind === "nativeDisplayGroup" && <label className="workbench-field">Model bank<select value={visual.group} onChange={(event) => onChange({ ...definition, visual: { ...visual, group: event.target.value === "levelSpecific" ? "levelSpecific" : "global" } })}><option value="global">Global models</option><option value="levelSpecific">Current level models</option></select></label>}
          {(visual.kind === "nativeDisplayGroup" || visual.kind === "customDisplayGroup") && <ScriptNumberField label="Model object ID" value={visual.modelObject} onChange={(modelObject) => onChange({ ...definition, visual: { ...visual, modelObject } })} />}
          {visual.kind === "nativeSkeleton" && <ScriptNumberField label="Native skeleton ID" value={visual.skeletonType} onChange={(skeletonType) => onChange({ ...definition, visual: { ...visual, skeletonType } })} />}
          <ScriptNumberField label="Draw order" value={visual.slot} onChange={(slot) => onChange({ ...definition, visual: { ...visual, slot } })} />
        </div></details>}
      </aside>
    </div>
  </div>;
}
