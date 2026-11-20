import { useEffect, useRef, useState } from "react";
import type { EngineScene } from "./engineSchemas";
import { editEngineHeight, engineCanvasPoint, rasterizeEngineTerrain, type EngineTerrainTool } from "./engineTerrainEditing";
import { moveEngineBox } from "./engineSceneEditing";
import { moveEngineEntity } from "./engineEntityEditing";

interface Props { scene: EngineScene; tool: EngineTerrainTool; amount: number; radius: number; onChange: (scene: EngineScene) => void; selectedEntityId?: string; onSelectEntity?: (id: string) => void }
export function EngineSceneCanvas({ scene, tool, amount, radius, onChange, selectedEntityId, onSelectEntity }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; z: number; dx: number; dz: number } | null>(null);
  const [actorDrag, setActorDrag] = useState<{ id: string; x: number; z: number; dx: number; dz: number } | null>(null);
  useEffect(() => { if (canvas.current) rasterizeEngineTerrain(canvas.current, scene.terrain); }, [scene.terrain]);
  return <div className="engine-scene-map" style={{ aspectRatio: `${scene.terrain.sizeX} / ${scene.terrain.sizeZ}` }}>
    <canvas ref={canvas} width={512} height={512} aria-label="Engine terrain heightfield" onPointerDown={(event) => {
      const point = engineCanvasPoint(event.currentTarget, event.clientX, event.clientY, scene);
      const edited = editEngineHeight(scene, point.x, point.z, tool, amount, radius);
      if (edited !== scene) onChange(edited);
    }} />
    <svg viewBox={`0 0 ${scene.terrain.sizeX} ${scene.terrain.sizeZ}`} preserveAspectRatio="none" aria-label="Scene actors and collision boxes">
      {scene.colliders.map((box, index) => <rect key={index} x={box.min.x} y={box.min.z} width={box.max.x - box.min.x} height={box.max.z - box.min.z}
        vectorEffect="non-scaling-stroke" fill={box.layer === 2 ? "#83bea544" : "#e6b25755"} stroke="#e6b257" strokeWidth={2}
        style={{ pointerEvents: tool === "select" ? "all" : "none", cursor: "grab" }}
        transform={drag?.index === index ? `translate(${drag.dx} ${drag.dz})` : undefined}
        onPointerDown={(event) => {
          const svg = event.currentTarget.ownerSVGElement;
          if (!svg) return;
          const point = engineCanvasPoint(svg, event.clientX, event.clientY, scene);
          event.currentTarget.setPointerCapture(event.pointerId); setDrag({ index, ...point, dx: 0, dz: 0 });
        }} onPointerMove={(event) => {
          const svg = event.currentTarget.ownerSVGElement;
          if (!drag || drag.index !== index || !svg) return;
          const point = engineCanvasPoint(svg, event.clientX, event.clientY, scene);
          setDrag({ ...drag, dx: point.x - drag.x, dz: point.z - drag.z });
        }} onPointerUp={() => {
          if (drag?.index !== index) return;
          if (drag.dx || drag.dz) onChange(moveEngineBox(moveEngineBox(scene, index, "x", box.min.x + drag.dx), index, "z", box.min.z + drag.dz));
          setDrag(null);
        }} onPointerCancel={() => setDrag(null)}><title>Collision box {index + 1}. Drag to move; edit dimensions in Scene properties.</title></rect>)}
      {scene.entities.map((entity) => <g key={entity.id} transform={`translate(${entity.position.x + (actorDrag?.id === entity.id ? actorDrag.dx : 0)} ${entity.position.z + (actorDrag?.id === entity.id ? actorDrag.dz : 0)})`}>
        <circle r={Math.max(scene.terrain.sizeX, scene.terrain.sizeZ) / 65} fill={entity.id === selectedEntityId ? "#e6b257" : "#ecf0e4"} stroke="#111c27" strokeWidth={2} vectorEffect="non-scaling-stroke"
          role="button" tabIndex={tool === "select" ? 0 : -1} aria-label={`Select actor ${entity.id}`}
          style={{ pointerEvents: tool === "select" ? "all" : "none", cursor: "grab" }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectEntity?.(entity.id); } }}
          onPointerDown={(event) => { const svg = event.currentTarget.ownerSVGElement; if (!svg) return; const point = engineCanvasPoint(svg, event.clientX, event.clientY, scene); onSelectEntity?.(entity.id); event.currentTarget.setPointerCapture(event.pointerId); setActorDrag({ id: entity.id, ...point, dx: 0, dz: 0 }); }}
          onPointerMove={(event) => { const svg = event.currentTarget.ownerSVGElement; if (!svg || actorDrag?.id !== entity.id) return; const point = engineCanvasPoint(svg, event.clientX, event.clientY, scene); setActorDrag({ ...actorDrag, dx: point.x - actorDrag.x, dz: point.z - actorDrag.z }); }}
          onPointerUp={() => { if (actorDrag?.id !== entity.id) return; if (actorDrag.dx || actorDrag.dz) onChange(moveEngineEntity(moveEngineEntity(scene, entity.id, "x", entity.position.x + actorDrag.dx), entity.id, "z", entity.position.z + actorDrag.dz)); setActorDrag(null); }}
          onPointerCancel={() => setActorDrag(null)}><title>{entity.id} · {entity.model}. Drag to move.</title></circle>
        <text y={-Math.max(scene.terrain.sizeX, scene.terrain.sizeZ) / 45} textAnchor="middle" fontSize={Math.max(scene.terrain.sizeX, scene.terrain.sizeZ) / 60} fill="#edf0e4">{entity.id}</text>
      </g>)}
    </svg>
  </div>;
}
