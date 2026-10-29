import { z } from "zod";
import type { BG3DKeyframe } from "./parseBG3D";
import { eulerToQuaternion } from "./rotationUtils";

const rotationSchema = z.object({
  tick: z.number().finite(),
  rotationX: z.number().finite(), rotationY: z.number().finite(), rotationZ: z.number().finite(),
});
const tracksSchema = z.record(z.string(), z.array(rotationSchema));
export type NativeRotationTracks = z.infer<typeof tracksSchema>;

export function recordNativeRotations(keyframes: Readonly<Record<string, readonly BG3DKeyframe[]>>): NativeRotationTracks {
  return Object.fromEntries(Object.entries(keyframes).map(([bone, frames]) => [bone,
    frames.map(({ tick, rotationX, rotationY, rotationZ }) => ({ tick, rotationX, rotationY, rotationZ })),
  ]));
}

export function parseNativeRotations(value: unknown): NativeRotationTracks {
  const parsed = tracksSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function unchangedNativeRotation(tracks: NativeRotationTracks, bone: string, tick: number, quaternion: readonly number[]) {
  const frame = tracks[bone]?.find((item) => item.tick === tick);
  if (!frame) return null;
  const expected = eulerToQuaternion(frame.rotationX, frame.rotationY, frame.rotationZ);
  const dot = Math.abs(expected.reduce((sum, value, index) => sum + value * (quaternion[index] ?? 0), 0));
  return Math.abs(1 - dot) < 0.000001 ? frame : null;
}
