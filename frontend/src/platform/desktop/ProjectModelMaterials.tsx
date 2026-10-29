import { useState } from "react";
import type { AssetImportRecipe, ProjectAsset } from "@pangea/desktop-contracts";
import { Input } from "@/components/ui/input";
import { materialColorChannels, materialColorHex, setMaterialMapping, type MaterialMapping } from "./projectModelRecipe";

function MaterialOption({ label, value, disabled, onChange, positive, negative }: { label: string; value: boolean | undefined; disabled: boolean; onChange: (value: boolean | undefined) => void; positive: string; negative: string }) {
  return <label className="grid gap-1 text-sm">{label}<select className="rounded border border-slate-600 bg-slate-900 p-2" value={value === undefined ? "source" : value ? "yes" : "no"} disabled={disabled} onChange={(event) => onChange(event.target.value === "source" ? undefined : event.target.value === "yes")}><option value="source">From source</option><option value="yes">{positive}</option><option value="no">{negative}</option></select></label>;
}

export function ProjectModelMaterials({ asset, recipe, onChange, disabled }: { asset: ProjectAsset; recipe: AssetImportRecipe; onChange: (recipe: AssetImportRecipe) => void; disabled: boolean }) {
  const [selection, setSelection] = useState("");
  const materials = asset.materials ?? [];
  const selected = selection || materials[0]?.name || "";
  const mapping = recipe.materialMappings?.find((entry) => entry.material === selected);
  const color = mapping?.diffuseColor ?? [1, 1, 1, 1];
  const native3dmf = asset.outputs.model.endsWith(".3dmf");
  function update(patch: Partial<Omit<MaterialMapping, "material">>) { onChange(setMaterialMapping(recipe, selected, patch)); }
  if (!materials.length) return <p className="workbench-muted">Reimport this asset to inspect its source materials.</p>;
  return <section aria-label="Persistent material settings" className="grid gap-3">
    <label className="grid gap-1 text-sm">Source material<select className="rounded border border-slate-600 bg-slate-900 p-2" value={selected} disabled={disabled} onChange={(event) => setSelection(event.target.value)}>{materials.map((material) => <option key={material.index} value={material.name}>{material.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-3">
      <MaterialOption label="Transparency blending" value={mapping?.alwaysBlend} disabled={disabled || native3dmf} onChange={(alwaysBlend) => update({ alwaysBlend })} positive="Always blend" negative="Automatic blending" />
      <MaterialOption label="Horizontal texture wrapping" value={mapping?.clampU} disabled={disabled || native3dmf} onChange={(clampU) => update({ clampU })} positive="Clamp to edge" negative="Repeat" />
      <MaterialOption label="Vertical texture wrapping" value={mapping?.clampV} disabled={disabled || native3dmf} onChange={(clampV) => update({ clampV })} positive="Clamp to edge" negative="Repeat" />
    </div>
    {native3dmf && <p className="workbench-muted">3DMF retains source wrapping and blending. Material color can be overridden.</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mapping?.diffuseColor !== undefined} disabled={disabled} onChange={(event) => update({ diffuseColor: event.target.checked ? [1, 1, 1, 1] : undefined })} />Override material color</label>
    {mapping?.diffuseColor && <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Material color<Input type="color" value={materialColorHex(color)} disabled={disabled} onChange={(event) => update({ diffuseColor: materialColorChannels(event.target.value, color[3] ?? 1) })} /></label><label className="grid gap-1 text-sm">Opacity<Input type="number" min={0} max={1} step={0.05} value={color[3]} disabled={disabled} onChange={(event) => { const alpha = event.target.valueAsNumber; if (Number.isFinite(alpha) && alpha >= 0 && alpha <= 1) update({ diffuseColor: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1, alpha] }); }} /></label></div>}
    <p className="workbench-muted">Changes take effect after reimport and stay linked to source material names.</p>
  </section>;
}
