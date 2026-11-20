import { useState } from "react";
import type { EngineEntity, EngineScene } from "./engineSchemas";
import { changeEngineEntity, dropEngineEntity, newEngineEntity } from "./engineEntityEditing";
import { EngineEntityBody } from "./EngineEntityBody";

interface Props { scene: EngineScene; onChange: (scene: EngineScene) => void; selectedId?: string; onSelect?: (id: string) => void }
const axes = ["x", "y", "z"] satisfies (keyof EngineEntity["position"])[];
export function EngineEntityInspector({ scene, onChange, selectedId, onSelect }: Props) {
  const [localId, setLocalId] = useState("");
  const entity = scene.entities.find((entry) => entry.id === (selectedId ?? localId)) ?? scene.entities[0];
  const select = (id: string) => { setLocalId(id); onSelect?.(id); };
  return <section className="engine-entities" aria-label="Scene actors"><h2>Scene actors</h2>
    <p className="engine-muted">Place actors here. Lua controls their gameplay with engine.entity(id).</p>
    {!!scene.entities.length && <label>Selected actor<select value={entity?.id ?? ""} onChange={(event) => select(event.target.value)}>{scene.entities.map((entry) => <option key={entry.id}>{entry.id}</option>)}</select></label>}
    <button disabled={scene.entities.length >= 128} onClick={() => { const added = newEngineEntity(scene); onChange({ ...scene, entities: [...scene.entities, added] }); select(added.id); }}>Add actor</button>
    {entity && <fieldset><legend>{entity.id}</legend>
      <label>Actor ID<input value={entity.id} maxLength={63} onChange={(event) => { const id = event.target.value; if (/^(?!\.{1,2}$)[A-Za-z0-9_.-]+$/.test(id) && !scene.entities.some((entry) => entry.id !== entity.id && entry.id === id)) { onChange(changeEngineEntity(scene, entity.id, { id })); select(id); } }} /></label>
      <p className="engine-muted">Keep IDs stable once Lua refers to them. Renaming an actor does not rewrite scripts.</p>
      <label>Actor model<select value={entity.model} onChange={(event) => onChange(changeEngineEntity(scene, entity.id, { model: event.target.value }))}><option value="box">Box primitive</option>{scene.assets.filter((asset) => asset.id !== "box").map((asset) => <option key={asset.id} value={asset.id}>{asset.id} · {asset.file}</option>)}</select></label>
      <div className="engine-fields">{axes.map((axis) => <label key={axis}>Actor position {axis.toUpperCase()}<input type="number" step="any" value={entity.position[axis]} onChange={(event) => { if (Number.isFinite(event.target.valueAsNumber)) onChange(changeEngineEntity(scene, entity.id, { position: { ...entity.position, [axis]: event.target.valueAsNumber } })); }} /></label>)}</div>
      <button disabled={entity.model !== "box" && !entity.body} onClick={() => onChange(dropEngineEntity(scene, entity.id))}>Rest actor on terrain</button>
      <div className="engine-fields">{axes.map((axis) => <label key={axis}>Rotation {axis.toUpperCase()} (degrees)<input type="number" step="any" value={Number((entity.rotation[axis] * 180 / Math.PI).toFixed(3))} onChange={(event) => { if (Number.isFinite(event.target.valueAsNumber)) onChange(changeEngineEntity(scene, entity.id, { rotation: { ...entity.rotation, [axis]: event.target.valueAsNumber * Math.PI / 180 } })); }} /></label>)}
      <label>Actor scale<input type="number" min="0.001" max="10000" step="any" value={entity.scale} onChange={(event) => { const scale = event.target.valueAsNumber; if (Number.isFinite(scale) && scale > 0 && scale <= 10000) onChange(changeEngineEntity(scene, entity.id, { scale })); }} /></label></div>
      <div className="engine-fields">{(["r", "g", "b", "a"] satisfies (keyof EngineEntity["color"])[]).map((channel) => <label key={channel}>{({ r: "Red", g: "Green", b: "Blue", a: "Opacity" })[channel]}<input type="range" min={0} max={1} step={.01} value={entity.color[channel]} onChange={(event) => onChange(changeEngineEntity(scene, entity.id, { color: { ...entity.color, [channel]: event.target.valueAsNumber } }))} /></label>)}</div>
      <EngineEntityBody entity={entity} onChange={(update) => onChange(changeEngineEntity(scene, entity.id, update))} />
      <button onClick={() => { const copy = { ...entity, id: newEngineEntity(scene).id, position: { ...entity.position, x: entity.position.x + 25, z: entity.position.z + 25 } }; onChange({ ...scene, entities: [...scene.entities, copy] }); select(copy.id); }} disabled={scene.entities.length >= 128}>Duplicate actor</button>{" "}
      <button onClick={() => onChange({ ...scene, entities: scene.entities.filter((entry) => entry.id !== entity.id) })}>Remove actor</button>
    </fieldset>}
  </section>;
}
