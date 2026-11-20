import type { EngineEntity } from "./engineSchemas";

interface Props { entity: EngineEntity; onChange: (update: Partial<EngineEntity>) => void }
export function EngineEntityBody({ entity, onChange }: Props) {
  const body = entity.body;
  return <section aria-label="Actor physics"><label className="engine-checkbox"><input type="checkbox" checked={!!body} onChange={(event) => onChange({ body: event.target.checked ? { mode: "static", halfExtents: { x: .5, y: .5, z: .5 }, layer: "solid", gravity: -980, collision: true } : undefined })} />Physics body</label>
    {body && <><label>Body movement<select value={body.mode} onChange={(event) => { const mode = event.target.value; if (mode === "static" || mode === "kinematic" || mode === "dynamic") onChange({ body: { ...body, mode } }); }}><option value="static">Static obstacle</option><option value="kinematic">Moved by Lua</option><option value="dynamic">Dynamic with gravity</option></select></label>
      <label>Body layer<select value={body.layer} onChange={(event) => { const layer = event.target.value; if (layer === "solid" || layer === "sensor") onChange({ body: { ...body, layer } }); }}><option value="solid">Solid</option><option value="sensor">Sensor</option></select></label>
      <p className="engine-muted">Local half-sizes follow actor scale and rotation. They also size box primitives.</p>
      <div className="engine-fields">{(["x", "y", "z"] satisfies (keyof EngineEntity["position"])[]).map((axis) => <label key={axis}>Body half-size {axis.toUpperCase()}<input type="number" min={.001} max={1e7} step="any" value={body.halfExtents[axis]} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value) && value > 0) onChange({ body: { ...body, halfExtents: { ...body.halfExtents, [axis]: value } } }); }} /></label>)}</div>
      {body.mode === "dynamic" && <label>Gravity<input type="number" value={body.gravity} onChange={(event) => { const gravity = event.target.valueAsNumber; if (Number.isFinite(gravity)) onChange({ body: { ...body, gravity } }); }} /></label>}
      <label className="engine-checkbox"><input type="checkbox" checked={body.collision} onChange={(event) => onChange({ body: { ...body, collision: event.target.checked } })} />Enable collision</label>
    </>}
  </section>;
}
