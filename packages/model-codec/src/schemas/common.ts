import { z } from "zod";

export const plainObjectSchema = z.record(z.string(), z.unknown());
export const arrayBufferSchema = z.instanceof(ArrayBuffer);
export const uint8ArraySchema = z.instanceof(Uint8Array);
export const float32ArraySchema = z.instanceof(Float32Array);
export const uint32ArraySchema = z.instanceof(Uint32Array);
export const uint16ArraySchema = z.instanceof(Uint16Array);
export const numberSchema = z.number();
export const stringSchema = z.string();
export const unknownArraySchema = z.array(z.unknown());
export const boundingBoxSchema = z.object({ min: z.array(z.number()).length(3), max: z.array(z.number()).length(3) });

export function getNumberField(value: unknown, field: string, fallback = 0): number {
  const object = plainObjectSchema.safeParse(value);
  if (!object.success) return fallback;
  const parsed = numberSchema.safeParse(object.data[field]);
  return parsed.success ? parsed.data : fallback;
}

export function getStringField(value: unknown, field: string, fallback = ""): string {
  const object = plainObjectSchema.safeParse(value);
  if (!object.success) return fallback;
  const parsed = stringSchema.safeParse(object.data[field]);
  return parsed.success ? parsed.data : fallback;
}

export function getArrayNumberField(value: unknown, index: number, fallback = 0): number {
  const array = unknownArraySchema.safeParse(value);
  if (!array.success) return fallback;
  const parsed = numberSchema.safeParse(array.data[index]);
  return parsed.success ? parsed.data : fallback;
}

export function mapCodecError(error: unknown): string {
  const text = z.string().safeParse(error);
  if (text.success) return text.data;
  const object = z.object({ message: z.string() }).safeParse(error);
  return object.success ? object.data.message : "Model codec operation failed";
}

export const boneRawSchema = z.object({
  parentBone: z.number(), name: z.string(), coordX: z.number(), coordY: z.number(), coordZ: z.number(), numPointsAttachedToBone: z.number(), numNormalsAttachedToBone: z.number(),
  reserved0: z.number().optional(), reserved1: z.number().optional(), reserved2: z.number().optional(), reserved3: z.number().optional(), reserved4: z.number().optional(), reserved5: z.number().optional(), reserved6: z.number().optional(), reserved7: z.number().optional(),
});
export const anHdRawSchema = z.object({ animName: z.string(), numAnimEvents: z.number() });
export const bonPRawSchema = z.object({ pointIndex: z.number() });
export const bonNRawSchema = z.object({ normal: z.number() });
export const relPRawSchema = z.object({ relOffsetX: z.number(), relOffsetY: z.number(), relOffsetZ: z.number() });
export const evntRawSchema = z.object({ time: z.number(), type: z.number(), value: z.number() });
export const numKRawSchema = z.object({ numKeyFrames: z.number() });
export const keyFRawSchema = z.object({ tick: z.number(), accelerationMode: z.number(), coordX: z.number(), coordY: z.number(), coordZ: z.number(), rotationX: z.number(), rotationY: z.number(), rotationZ: z.number(), scaleX: z.number(), scaleY: z.number(), scaleZ: z.number() });
export type BoneRawType = z.infer<typeof boneRawSchema>;
export type AnHdRawType = z.infer<typeof anHdRawSchema>;
export type BonPRawType = z.infer<typeof bonPRawSchema>;
export type BonNRawType = z.infer<typeof bonNRawSchema>;
export type RelPRawType = z.infer<typeof relPRawSchema>;
export type EvntRawType = z.infer<typeof evntRawSchema>;
export type NumKRawType = z.infer<typeof numKRawSchema>;
export type KeyFRawType = z.infer<typeof keyFRawSchema>;
