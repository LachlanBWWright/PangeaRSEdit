import { z } from "zod";
import { err, ok, type Result } from "neverthrow";

interface BoundsNode {
  readonly children?: readonly BoundsNode[];
  readonly vertices?: readonly [number, number, number][];
}
export interface ObjectModelBounds { readonly width: number; readonly height: number; readonly depth: number; }
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const nodeSchema: z.ZodType<BoundsNode> = z.lazy(() => z.object({ children: z.array(nodeSchema).optional(), vertices: z.array(vector).optional() }));
const modelSchema = z.object({ groups: z.array(nodeSchema) });

function verticesFor(node: BoundsNode): readonly [number, number, number][] {
  return [...(node.vertices ?? []), ...(node.children?.flatMap(verticesFor) ?? [])];
}

export function getObjectModelBounds(parsed: unknown, scale: number, modelIndex?: number): Result<ObjectModelBounds, string> {
  if (!z.number().finite().positive().safeParse(scale).success) return err("Choose a positive visual scale before fitting collision.");
  const model = modelSchema.safeParse(parsed);
  if (!model.success) return err("The model does not contain readable bounds.");
  const selected = modelIndex === undefined ? model.data.groups : model.data.groups[0]?.children?.slice(modelIndex, modelIndex + 1) ?? [];
  const vertices = selected.flatMap(verticesFor);
  if (vertices.length === 0) return err("The selected model has no vertices to fit a collision box.");
  const xs = vertices.map((vertex) => vertex[0]);
  const ys = vertices.map((vertex) => vertex[1]);
  const zs = vertices.map((vertex) => vertex[2]);
  const extent = (values: readonly number[]) => values.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0) * scale * 2;
  const bounds = { width: Math.max(0.01, extent(xs)), height: Math.max(0.01, extent(ys)), depth: Math.max(0.01, extent(zs)) };
  const valid = z.object({ width: z.number().finite().positive().max(1000), height: z.number().finite().positive().max(1000), depth: z.number().finite().positive().max(1000) }).safeParse(bounds);
  return valid.success ? ok(valid.data) : err("The scaled model exceeds the collision editor’s 1000-unit size limit.");
}
