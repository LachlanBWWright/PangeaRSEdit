/**
 * Common Zod schemas and validation helpers
 *
 * Provides reusable schemas for type validation across the codebase.
 * All validation uses safeParse to return Result types instead of throwing.
 */

import { z } from "zod";
import type {
  Citation,
  FlagDescription,
  ParamDescription,
} from "../data/items/itemParams";

// ============================================================================
// Basic Type Guards as Zod Schemas
// ============================================================================

/**
 * Schema for any object (Record<string, unknown>), but NOT arrays.
 * Use this to validate that a value is a plain object.
 */
export const plainObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), "Must be a plain object, not an array");
export type PlainObject = z.infer<typeof plainObjectSchema>;

/**
 * Schema for any object (Record<string, unknown>), including arrays.
 */
export const recordSchema = z.record(z.string(), z.unknown());
export type Record = z.infer<typeof recordSchema>;

/**
 * Schema for unknown array.
 */
export const unknownArraySchema = z.array(z.unknown());
export type UnknownArray = z.infer<typeof unknownArraySchema>;

/**
 * Schema for string values.
 */
export const stringSchema = z.string();

/**
 * Schema for number values.
 */
export const numberSchema = z.number();

/**
 * Schema for boolean values.
 */
export const booleanSchema = z.boolean();

// ============================================================================
// Parameter & Citation Schemas (from itemParams.ts)
// ============================================================================

/**
 * Schema for a code sample citation.
 */
export const citationSchema = z.object({
  label: z.string(),
  url: z.string(),
  fileName: z.string(),
  lineNumber: z.number(),
  endLineNumber: z.number().optional(),
  code: z.string(),
}) as z.ZodType<Citation>;

/**
 * Schema for a bit flag description.
 */
export const flagDescriptionSchema = z.object({
  index: z.number(),
  description: z.string(),
  defaultCitation: citationSchema,
  additionalCitations: z.array(citationSchema).optional(),
}) as z.ZodType<FlagDescription>;

/**
 * Schema for parameter descriptions with union of multiple types.
 * Supports: "Unused", "Unknown", Integer, Rotation, TypeSelector, and Bit Flags.
 */
export const paramDescriptionSchema: z.ZodType<ParamDescription> = z.lazy(() =>
  z.union([
    z.literal("Unused"),
    z.literal("Unknown"),
    z.object({
      type: z.literal("Integer"),
      description: z.string(),
      defaultCitation: citationSchema,
      additionalCitations: z.array(citationSchema).optional(),
    }),
    z.object({
      type: z.literal("Rotation"),
      description: z.string(),
      divisions: z.number(),
      multiplier: z.string(),
      defaultCitation: citationSchema,
      additionalCitations: z.array(citationSchema).optional(),
    }),
    z.object({
      type: z.literal("TypeSelector"),
      description: z.string(),
      options: z.record(z.string(), z.string()),
      defaultCitation: citationSchema,
      additionalCitations: z.array(citationSchema).optional(),
    }),
    z.object({
      type: z.literal("Bit Flags"),
      flags: z.array(flagDescriptionSchema),
      defaultCitation: citationSchema,
      additionalCitations: z.array(citationSchema).optional(),
    }),
  ]),
);

// ============================================================================
// Three.js Type Helpers
// ============================================================================

/**
 * Validates if a value is a Three.js Object3D
 * Used instead of instanceof checks
 */
export const object3DSchema = z.object({
  type: z.string(),
  uuid: z.string(),
  name: z.string(),
  parent: z.unknown().nullable().optional(),
  children: z.array(z.unknown()).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  rotation: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  scale: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  quaternion: z.unknown().optional(),
  matrix: z.unknown().optional(),
  matrixWorld: z.unknown().optional(),
});
export type Object3DLike = z.infer<typeof object3DSchema>;

/**
 * Validates if a value is a Three.js Mesh
 */
export const meshSchema = object3DSchema.extend({
  type: z.string().refine((t) => t === "Mesh"),
  material: z.unknown().optional(),
  geometry: z.unknown().optional(),
  isMesh: z.boolean().optional(),
});
export type MeshLike = z.infer<typeof meshSchema>;

/**
 * Validates if a value is a Three.js SkinnedMesh
 */
export const skinnedMeshSchema = meshSchema.extend({
  type: z.string().refine((t) => t === "SkinnedMesh"),
  skeleton: z.unknown().optional(),
  isSkinnedMesh: z.boolean().optional(),
});
export type SkinnedMeshLike = z.infer<typeof skinnedMeshSchema>;

/**
 * Validates if a value is a Three.js Bone
 */
export const boneSchema = object3DSchema.extend({
  type: z.string().refine((t) => t === "Bone"),
  isBone: z.boolean().optional(),
});
export type BoneLike = z.infer<typeof boneSchema>;

/**
 * Validates if a value is a Three.js Group
 */
export const groupSchema = object3DSchema.extend({
  type: z.string().refine((t) => t === "Group"),
  isGroup: z.boolean().optional(),
});
export type GroupLike = z.infer<typeof groupSchema>;

// ============================================================================
// Material Schemas
// ============================================================================

/**
 * Validates if a value is a Three.js MeshStandardMaterial
 */
export const meshStandardMaterialSchema = z.object({
  type: z.string().refine((t) => t === "MeshStandardMaterial"),
  color: z.unknown().optional(),
  metalness: z.number().optional(),
  roughness: z.number().optional(),
  isMeshStandardMaterial: z.boolean().optional(),
});
export type MeshStandardMaterialLike = z.infer<typeof meshStandardMaterialSchema>;

/**
 * Validates if a value is a Three.js MeshPhysicalMaterial
 */
export const meshPhysicalMaterialSchema = meshStandardMaterialSchema.extend({
  type: z.string().refine((t) => t === "MeshPhysicalMaterial"),
  isMeshPhysicalMaterial: z.boolean().optional(),
});
export type MeshPhysicalMaterialLike = z.infer<typeof meshPhysicalMaterialSchema>;

/**
 * Generic schema for any Three.js Material
 */
export const materialSchema = z.object({
  type: z.string(),
  wireframe: z.boolean().optional(),
  dispose: z.function().optional(),
});
export type MaterialLike = z.infer<typeof materialSchema>;

/**
 * Validates if a value is a Three.js SkeletonHelper
 */
export const skeletonHelperSchema = z.object({
  type: z.string().refine((t) => t === "SkeletonHelper"),
  isSkeletonHelper: z.boolean().optional(),
  dispose: z.function().optional(),
  parent: z.unknown().nullable().optional(),
  remove: z.function().optional(),
});
export type SkeletonHelperLike = z.infer<typeof skeletonHelperSchema>;

// ============================================================================
// ArrayBuffer & TypedArray Schemas
// ============================================================================

/**
 * Validates if a value is an ArrayBuffer
 */
export const arrayBufferSchema = z.instanceof(ArrayBuffer);
export type ArrayBufferLike = ArrayBuffer;

/**
 * Validates if a value is a Uint8Array
 */
export const uint8ArraySchema = z.instanceof(Uint8Array);
export type Uint8ArrayLike = Uint8Array;

/**
 * Validates if a value is a Float32Array
 */
export const float32ArraySchema = z.instanceof(Float32Array);
export type Float32ArrayLike = Float32Array;

/**
 * Validates if a value is a Uint16Array
 */
export const uint16ArraySchema = z.instanceof(Uint16Array);
export type Uint16ArrayLike = Uint16Array;

/**
 * Validates if a value is a Uint32Array
 */
export const uint32ArraySchema = z.instanceof(Uint32Array);
export type Uint32ArrayLike = Uint32Array;

/**
 * Validates if a value is any ArrayBufferView
 */
export const arrayBufferViewSchema = z.union([
  uint8ArraySchema,
  float32ArraySchema,
  uint16ArraySchema,
  uint32ArraySchema,
  z.instanceof(Int8Array),
  z.instanceof(Int16Array),
  z.instanceof(Int32Array),
  z.instanceof(Uint8ClampedArray),
  z.instanceof(Float64Array),
]);
export type ArrayBufferViewLike =
  | Uint8Array
  | Float32Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8ClampedArray
  | Float64Array;

// ============================================================================
// Error Schemas
// ============================================================================

/**
 * Validates if a value is an Error
 */
export const errorSchema = z.instanceof(Error);
export type ErrorLike = Error;

// ============================================================================
// Citation Verification Schemas
// ============================================================================

/**
 * Verification status enum for citation validation
 */
export const verificationStatusSchema = z.enum([
  "verified",
  "partial_match",
  "code_changed",
  "line_not_found",
  "file_not_found",
  "network_error",
  "no_repository",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

/**
 * Full Citation schema for verification results
 */
export const fullCitationSchema = z.object({
  game: z.string(),
  itemType: z.string(),
  itemTypeNumber: z.number(),
  parameterName: z.string(),
  citation: citationSchema,
  sourceFile: z.string(),
});
export type FullCitation = z.infer<typeof fullCitationSchema>;

/**
 * Result of verifying a single citation
 */
export const verificationResultSchema = z.object({
  citation: fullCitationSchema,
  status: verificationStatusSchema,
  actualCode: z.string().optional(),
  actualLineNumber: z.number().optional(),
  similarity: z.number().min(0).max(1).optional(),
  message: z.string().optional(),
});
export type VerificationResult = z.infer<typeof verificationResultSchema>;

/**
 * Summary statistics for verification results
 */
export const verificationSummarySchema = z.object({
  total: z.number(),
  verified: z.number(),
  partialMatches: z.number(),
  codeChanged: z.number(),
  fileNotFound: z.number(),
  lineNotFound: z.number(),
  networkErrors: z.number(),
  noRepository: z.number(),
  byGame: z.record(
    z.string(),
    z.object({
      total: z.number(),
      verified: z.number(),
      failures: z.number(),
    }),
  ),
});
export type VerificationSummary = z.infer<typeof verificationSummarySchema>;

// ============================================================================
// Item Audit Schemas
// ============================================================================

/**
 * Status values for item model and parameter audits
 */
export const paramStatusSchema = z.enum(["correct", "incorrect", "unknown"]);
export type ParamStatus = z.infer<typeof paramStatusSchema>;

/**
 * Parameter status mapping for all 4 parameters
 */
export const paramStatusMapSchema = z.object({
  p0: paramStatusSchema,
  p1: paramStatusSchema,
  p2: paramStatusSchema,
  p3: paramStatusSchema,
});
export type ParamStatusMap = z.infer<typeof paramStatusMapSchema>;

/**
 * Single item audit decision (model correctness + all param statuses)
 */
export const itemAuditDecisionSchema = z.object({
  modelStatus: paramStatusSchema,
  paramStatus: paramStatusMapSchema,
  notes: z.string(),
});
export type ItemAuditDecision = z.infer<typeof itemAuditDecisionSchema>;

/**
 * Imported decisions as array of {itemType, decision}
 */
export const importedDecisionSchema = z.object({
  itemType: z.number(),
  decision: itemAuditDecisionSchema,
});
export type ImportedDecision = z.infer<typeof importedDecisionSchema>;

