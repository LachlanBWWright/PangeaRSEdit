import type { AssetImportRecipe, ProjectAsset } from "@pangea/desktop-contracts";
import { Input } from "@/components/ui/input";
import { ProjectModelMaterials } from "./ProjectModelMaterials";
import { ProjectModelAnimationEvents } from "./ProjectModelAnimationEvents";

export function ProjectModelImportSettings({ recipe, onChange, disabled, asset }: { recipe: AssetImportRecipe; onChange: (recipe: AssetImportRecipe) => void; disabled: boolean; asset?: ProjectAsset }) {
  return <details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer text-sm">Import settings</summary>
    <p className="workbench-muted my-3">These adjustments are preserved when the source is reimported. Object scale, collision and behavior stay separate.</p>
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="grid gap-1 text-sm">Source scale<Input type="number" min={0.0001} max={10000} step={0.1} value={recipe.scale} disabled={disabled} onChange={(event) => { const scale = event.target.valueAsNumber; if (Number.isFinite(scale) && scale > 0 && scale <= 10000) onChange({ ...recipe, scale }); }} /></label>
      {recipe.rotation.map((value, index) => <label key={index} className="grid gap-1 text-sm">{["X", "Y", "Z"][index]} rotation (°)<Input type="number" step={1} value={value} disabled={disabled} onChange={(event) => {
        const angle = event.target.valueAsNumber;
        if (!Number.isFinite(angle)) return;
        const rotation: [number, number, number] = [recipe.rotation[0], recipe.rotation[1], recipe.rotation[2]];
        rotation[index] = angle;
        onChange({ ...recipe, rotation });
      }} /></label>)}
    </div>
    <label className="my-3 grid gap-1 text-sm">Blender collection (optional)<Input value={recipe.blenderCollection ?? ""} disabled={disabled} maxLength={120} placeholder="All visible objects" onChange={(event) => onChange({ ...recipe, blenderCollection: event.target.value.trim() || undefined })} /></label>
    {asset && <div className="grid gap-5 border-t border-slate-700 pt-4"><h4 className="text-sm font-medium">Material settings</h4><ProjectModelMaterials key={asset.id} asset={asset} recipe={recipe} onChange={onChange} disabled={disabled} /><h4 className="text-sm font-medium">Animation events</h4><ProjectModelAnimationEvents key={asset.id} asset={asset} recipe={recipe} onChange={onChange} disabled={disabled} /></div>}
  </details>;
}
