import { WebIO, type Animation } from "@gltf-transform/core";
import type { AnimationEvent } from "@/components/AnimationViewer";
import { err, ok, type Result } from "@/types/result";

const ANIMATION_EXTRA_NAMESPACE = "pangears";

export interface GltfAnimationMetadata {
  eventCount: number;
  events: AnimationEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toExactArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
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
  const namespaced = isRecord(extras)
    ? isRecord(extras[ANIMATION_EXTRA_NAMESPACE])
      ? extras[ANIMATION_EXTRA_NAMESPACE]
      : undefined
    : undefined;
  const candidate =
    namespaced && Array.isArray(namespaced.events)
      ? namespaced
      : isRecord(extras) && Array.isArray(extras.events)
        ? extras
        : undefined;

  if (!candidate || !Array.isArray(candidate.events)) {
    return [];
  }

  return candidate.events
    .map((event) => {
      if (!isRecord(event)) {
        return null;
      }
      return {
        time: typeof event.time === "number" ? event.time : 0,
        type: typeof event.type === "number" ? event.type : 0,
        value: typeof event.value === "number" ? event.value : 0,
      };
    })
    .filter((event): event is AnimationEvent => event !== null);
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
    {} as Record<string, GltfAnimationMetadata>,
  );
}

export async function updateGlbAnimationEvents(
  buffer: ArrayBuffer,
  animationIndex: number,
  events: AnimationEvent[],
): Promise<Result<ArrayBuffer, Error>> {
  const io = new WebIO();
  const doc = await io.readBinary(new Uint8Array(buffer));
  const animation = doc.getRoot().listAnimations()[animationIndex];
  if (!animation) {
    return err(
      new Error(`Animation #${animationIndex + 1} was not found in the GLB`),
    );
  }

  const nextExtras = isRecord(animation.getExtras())
    ? { ...animation.getExtras() }
    : {};

  nextExtras[ANIMATION_EXTRA_NAMESPACE] = {
    numAnimEvents: events.length,
    events: normalizeEvents(events).map((event) => ({ ...event })),
  };

  animation.setExtras(nextExtras);

  const glb = await io.writeBinary(doc);
  return ok(toExactArrayBuffer(glb));
}
