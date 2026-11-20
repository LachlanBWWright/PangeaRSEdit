import type { EngineScene } from "./engineSchemas";
import { addEngineAsset, moveEngineBox, resizeEngineBox } from "./engineSceneEditing";
import { EngineEntityInspector } from "./EngineEntityInspector";

interface Props { scene: EngineScene; modelFiles: string[]; onChange: (scene: EngineScene) => void; selectedEntityId?: string; onSelectEntity?: (id: string) => void }
export function EngineSceneInspector({ scene, modelFiles, onChange, selectedEntityId, onSelectEntity }: Props) {
  return <section className="engine-inspector" aria-label="Scene properties">
    <h2>Terrain</h2><p className="engine-muted">Render density is independent of heightfield samples and collision.</p>
    <div className="engine-fields">
      <label>World width<input type="number" min="1" max="10000000" value={scene.terrain.sizeX} onChange={(event) => onChange({ ...scene, terrain: { ...scene.terrain, sizeX: event.target.valueAsNumber } })} /></label>
      <label>World depth<input type="number" min="1" max="10000000" value={scene.terrain.sizeZ} onChange={(event) => onChange({ ...scene, terrain: { ...scene.terrain, sizeZ: event.target.valueAsNumber } })} /></label>
      <label>Chunk size<input type="number" min="1" max="10000000" value={scene.terrain.chunkSize} onChange={(event) => onChange({ ...scene, terrain: { ...scene.terrain, chunkSize: event.target.valueAsNumber } })} /></label>
      <label>Cells per chunk<input type="number" min="1" max="256" value={scene.terrain.cellsPerChunk} onChange={(event) => onChange({ ...scene, terrain: { ...scene.terrain, cellsPerChunk: event.target.valueAsNumber } })} /></label>
    </div>
    <p className="engine-muted">{scene.terrain.samplesX} × {scene.terrain.samplesZ} height samples · {scene.colliders.length} collision boxes · {scene.entities.length} actors · {scene.assets.length} model assets. Lua can create up to {256 - scene.colliders.length - scene.entities.length} more actors.</p>
    <h2>Collision geometry</h2>
    {scene.colliders.map((box, index) => <fieldset key={index}><legend>Box {index + 1}</legend>
      <div className="engine-fields">{(["x", "y", "z"] satisfies (keyof EngineScene["colliders"][number]["min"])[]).map((axis) => <label key={axis}>Position {axis.toUpperCase()}
        <input type="number" value={box.min[axis]} onChange={(event) => onChange(moveEngineBox(scene, index, axis, event.target.valueAsNumber))} /></label>)}</div>
      <div className="engine-fields">{(["x", "y", "z"] satisfies ("x" | "y" | "z")[]).map((axis) => <label key={axis}>Size {axis.toUpperCase()}
        <input type="number" min="0.001" step="any" value={box.max[axis] - box.min[axis]} onChange={(event) => onChange(resizeEngineBox(scene, index, axis, event.target.valueAsNumber))} /></label>)}</div>
      <label>Collision layer<select value={box.layer} onChange={(event) => onChange({ ...scene, colliders: scene.colliders.map((entry, i) => i === index ? { ...entry, layer: Number(event.target.value) } : entry) })}>
        <option value="1">Solid</option><option value="2">Sensor</option>{box.layer !== 1 && box.layer !== 2 && <option value={box.layer}>Custom layer {box.layer}</option>}
      </select></label>
      <button onClick={() => onChange({ ...scene, colliders: scene.colliders.filter((_, i) => i !== index) })}>Remove box</button>
    </fieldset>)}
    <button disabled={scene.colliders.length >= 128} onClick={() => onChange({ ...scene, colliders: [...scene.colliders, { min: { x: 100, y: 0, z: 100 }, max: { x: 200, y: 100, z: 200 }, layer: 1 }] })}>Add collision box</button>
    <EngineEntityInspector scene={scene} onChange={onChange} selectedId={selectedEntityId} onSelect={onSelectEntity} />
    <h2>Model assets</h2><p className="engine-muted">Declare BG3D or 3DMF models, then select them for scene actors.</p>
    {scene.assets.map((asset, index) => <fieldset key={index}><legend>Model {index + 1}</legend>
      <label>Asset ID<input value={asset.id} onChange={(event) => onChange({ ...scene, assets: scene.assets.map((entry, i) => i === index ? { ...entry, id: event.target.value } : entry), entities: scene.entities.map((entity) => entity.model === asset.id ? { ...entity, model: event.target.value } : entity) })} /></label>
      <label>Model file<select value={asset.file} onChange={(event) => onChange({ ...scene, assets: scene.assets.map((entry, i) => i === index ? { ...entry, file: event.target.value } : entry) })}>
        {modelFiles.map((file) => <option key={file}>{file}</option>)}
      </select></label><button disabled={scene.entities.some((entity) => entity.model === asset.id)} onClick={() => onChange({ ...scene, assets: scene.assets.filter((_, i) => i !== index) })}>Remove asset</button>
    </fieldset>)}
    <button disabled={!modelFiles.length || scene.assets.length >= 16} onClick={() => { const file = modelFiles[0]; if (file) onChange(addEngineAsset(scene, file)); }}>Add model asset</button>
    {!modelFiles.length && <p className="engine-muted">Include BG3D or 3DMF files when opening a package folder to make them available here.</p>}
  </section>;
}
