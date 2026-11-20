import { useState } from "react";
import type { EngineScene } from "./engineSchemas";

export function EngineHeightSampleEditor({ scene, onChange }: { scene: EngineScene; onChange: (scene: EngineScene) => void }) {
  const [column, setColumn] = useState(0), [row, setRow] = useState(0);
  const x = Math.min(column, scene.terrain.samplesX - 1), z = Math.min(row, scene.terrain.samplesZ - 1);
  const index = z * scene.terrain.samplesX + x;
  return <section className="engine-inspector" aria-label="Height sample editor"><h2>Height sample</h2><div className="engine-fields">
    <label>Sample column<input type="number" min={0} max={scene.terrain.samplesX - 1} value={x} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isInteger(value) && value >= 0 && value < scene.terrain.samplesX) setColumn(value); }} /></label>
    <label>Sample row<input type="number" min={0} max={scene.terrain.samplesZ - 1} value={z} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isInteger(value) && value >= 0 && value < scene.terrain.samplesZ) setRow(value); }} /></label>
    <label>Sample height<input type="number" min={-1e7} max={1e7} value={scene.terrain.heights[index] ?? 0} onChange={(event) => {
      const value = event.target.valueAsNumber;
      if (!Number.isFinite(value) || value < -1e7 || value > 1e7) return;
      onChange({ ...scene, terrain: { ...scene.terrain, heights: scene.terrain.heights.map((height, i) => i === index ? value : height) } });
    }} /></label>
  </div></section>;
}
