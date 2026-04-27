import { z } from "zod";

// ---- Auth ----

export const UserProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

// ---- Saved Levels ----

export const SavedLevelSummarySchema = z.object({
  id: z.string(),
  gameName: z.string(),
  levelId: z.string(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  payloadVersion: z.number().int(),
});

export const SavedLevelDetailSchema = SavedLevelSummarySchema.extend({
  payload: z.unknown(),
  sourceFileMetadata: z
    .object({
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      sha256: z.string().optional(),
    })
    .optional(),
});

export const SavedLevelListSchema = z.array(SavedLevelSummarySchema);

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type SavedLevelSummary = z.infer<typeof SavedLevelSummarySchema>;
export type SavedLevelDetail = z.infer<typeof SavedLevelDetailSchema>;
