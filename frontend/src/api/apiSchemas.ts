import { z } from "zod";

/** Runtime schema for the authenticated user profile payload. */
export const UserProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

/** Runtime schema for a saved-level summary record. */
export const SavedLevelSummarySchema = z.object({
  id: z.string(),
  gameName: z.string(),
  levelId: z.string(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  payloadVersion: z.number().int(),
});

/** Runtime schema for a full saved-level detail record. */
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

/** Runtime schema for the list of saved-level summaries. */
export const SavedLevelListSchema = z.array(SavedLevelSummarySchema);

/** Parsed authenticated user profile type. */
export type UserProfile = z.infer<typeof UserProfileSchema>;
/** Parsed saved-level summary type. */
export type SavedLevelSummary = z.infer<typeof SavedLevelSummarySchema>;
/** Parsed saved-level detail type. */
export type SavedLevelDetail = z.infer<typeof SavedLevelDetailSchema>;
