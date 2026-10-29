import { getCollisionPreviewBounds } from "./scriptCollisionPreview";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

function BoundsProjection({ width, height, label }: { width: number; height: number; label: string }) {
  const extent = Math.max(width, height, 1) * 1.4;
  return <figure className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3">
    <figcaption className="text-sm">{label}</figcaption>
    <svg role="img" aria-label={`${label}: ${width} by ${height} world units, centered on the object origin`} viewBox={`${-extent / 2} ${-extent / 2} ${extent} ${extent}`} className="h-44 w-full">
      <path d={`M ${-extent / 2} 0 H ${extent / 2} M 0 ${-extent / 2} V ${extent / 2}`} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <rect x={-width / 2} y={-height / 2} width={width} height={height} fill="#22d3ee22" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle r={extent / 100} fill="#f8fafc" />
    </svg>
    <p className="workbench-muted">{width} × {height} world units</p>
  </figure>;
}

export function CustomObjectCollisionPreview({ definition, gameId }: { definition: ScriptCustomObjectDefinition; gameId: string }) {
  if (definition.collision.kind === "none") return null;
  if (definition.visual.kind === "nativeActor") return <p className="workbench-notice">Native actors retain their own collision geometry. Definition box settings do not describe that actor's native collision.</p>;
  const bounds = getCollisionPreviewBounds(definition, gameId);
  if (!bounds) return <p className="workbench-notice">Bounds are derived from the loaded native model or sprite. Set explicit dimensions to inspect a predictable box; the editor cannot infer this actor's runtime bounds here.</p>;
  return <section className="grid gap-3" aria-label="Collision bounds preview">
    <h4 className="font-medium">Collision bounds</h4>
    <div className="grid gap-3 sm:grid-cols-2">
      <BoundsProjection width={bounds.width} height={bounds.height} label={bounds.planar ? "Sprite plane (X / Y)" : "Front (X / Y)"} />
      {!bounds.planar && <BoundsProjection width={bounds.width} height={bounds.depth} label="Top (X / Z)" />}
    </div>
    <p className="workbench-muted">The white point is the object origin. Bounds stay aligned to world axes; model scale and rotation do not resize the explicit box. Dimensions include native rounding.{bounds.planar ? " Mighty Mike uses X / Y; depth is ignored." : " Each projection fits independently."}</p>
    {(bounds.width === 0 || bounds.height === 0 || !bounds.planar && bounds.depth === 0) && <p role="alert" className="workbench-notice" data-tone="warning">A dimension collapses to zero after native rounding. Increase it to give the object collision volume.</p>}
  </section>;
}
