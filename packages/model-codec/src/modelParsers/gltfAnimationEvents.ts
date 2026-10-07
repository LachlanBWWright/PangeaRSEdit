import { WebIO, type Animation } from "@gltf-transform/core";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import { z } from "zod";
import { arrayBufferSchema, mapCodecError, plainObjectSchema } from "../schemas/common";

export interface AnimationEvent { time: number; type: number; value: number; }

const ANIMATION_EXTRA_NAMESPACE = "pangears";

export interface GltfAnimationMetadata {
  eventCount: number;
  events: AnimationEvent[];
}

function toExactArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  const parsed = arrayBufferSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(new Uint8Array(data));
  return copy;
}

function normalizeEvents(events: AnimationEvent[]): AnimationEvent[] {
  return events
    .map((event) => ({
      time: Number.isFinite(event.time) ? event.time : 0,
      type: Number.isFinite(event.type) ? event.type : 0,
      value: Number.isFinite(event.value) ? event.value : 0,
    }))
    .sort((a, b) => a.time - b.time);
}

function readAnimationEvents(anim: Animation): AnimationEvent[] {
  const extras = anim.getExtras();
  const container = z.object({ events: z.array(z.unknown()) });
  const namespaced = container.safeParse(extras[ANIMATION_EXTRA_NAMESPACE]);
  const legacy = container.safeParse(extras);
  const events = namespaced.success ? namespaced.data.events : legacy.success ? legacy.data.events : [];
  const schema = z.object({ time: z.number().finite().catch(0), type: z.number().finite().catch(0), value: z.number().finite().catch(0) });
  return events.flatMap((event) => { const parsed = schema.safeParse(event); return parsed.success ? [parsed.data] : []; });
}

export async function normalizeGlbBuffer(
  buffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const io = new WebIO();
  const doc = await io.readBinary(new Uint8Array(buffer));
  const glb = await io.writeBinary(doc);
  return toExactArrayBuffer(glb);
}

export async function extractAnimationMetadataFromGlb(
  buffer: ArrayBuffer,
): Promise<Record<string, GltfAnimationMetadata>> {
  const io = new WebIO();
  const doc = await io.readBinary(new Uint8Array(buffer));
  const animations = doc.getRoot().listAnimations();

  const metadata: Record<string, GltfAnimationMetadata> = {};
  return animations.reduce(
    (acc, animation, index) => {
      const name = animation.getName() || `Animation ${index + 1}`;
      const events = readAnimationEvents(animation);
      acc[name] = {
        eventCount: events.length,
        events,
      };
      return acc;
    },
    metadata,
  );
}

export async function updateGlbAnimationEvents(
  buffer: ArrayBuffer,
  animationIndex: number,
  events: AnimationEvent[],
): Promise<Result<ArrayBuffer, string>> {
  const io = new WebIO();
  const decoded = await ResultAsync.fromPromise(io.readBinary(new Uint8Array(buffer)), mapCodecError);
  if (decoded.isErr()) return err(decoded.error);
  const doc = decoded.value;
  const animation = doc.getRoot().listAnimations()[animationIndex];
  if (!animation) {
    return err(`Animation #${animationIndex + 1} was not found in the GLB`);
  }

  const parsedExtras = plainObjectSchema.safeParse(animation.getExtras());
  const nextExtras = parsedExtras.success ? { ...parsedExtras.data } : {};

  nextExtras[ANIMATION_EXTRA_NAMESPACE] = {
    numAnimEvents: events.length,
    events: normalizeEvents(events).map((event) => ({ ...event })),
  };

  animation.setExtras(nextExtras);

  const encoded = await ResultAsync.fromPromise(io.writeBinary(doc), mapCodecError);
  return encoded.isErr() ? err(encoded.error) : ok(toExactArrayBuffer(encoded.value));
}
