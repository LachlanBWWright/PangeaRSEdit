import { z } from "zod";
import {
  croMagMultiplayerModeSchema,
  multiplayerGameIdSchema,
  nanosaur2MultiplayerModeSchema,
} from "./modes";

/** Runtime schema for a multiplayer lobby player record. */
export const MultiplayerLobbyPlayerSchema = z.object({
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  playerIndex: z.number().int().nonnegative(),
  isHost: z.boolean(),
  isReady: z.boolean(),
  region: z.string().min(1).default("unknown"),
  pingMs: z.number().int().nonnegative().default(0),
  joinedAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
});

export const MultiplayerMatchConfigPlayerSchema = z.object({
  participantId: z.string().min(1),
  playerIndex: z.number().int().nonnegative(),
  displayName: z.string().min(1),
  connectionState: z.string().min(1),
});

const multiplayerMatchConfigBaseSchema = z.object({
  lobbyId: z.string().uuid(),
  matchId: z.string().uuid(),
  trackOrLevel: z.string().min(1),
  seed: z.number().int().positive(),
  hostPlayerIndex: z.number().int().nonnegative(),
  maxPlayers: z.number().int().min(2).max(6),
  requiredProtocolVersion: z.number().int().positive(),
  requiredRuntimeVersion: z.string().min(1),
  hostParticipantId: z.string().min(1),
  players: z.array(MultiplayerMatchConfigPlayerSchema),
});

export const CroMagMultiplayerMatchConfigSchema =
  multiplayerMatchConfigBaseSchema.extend({
    gameId: z.literal("cromagrally"),
    mode: croMagMultiplayerModeSchema,
  });

export const Nanosaur2MultiplayerMatchConfigSchema =
  multiplayerMatchConfigBaseSchema.extend({
    gameId: z.literal("nanosaur2"),
    mode: nanosaur2MultiplayerModeSchema,
  });

export const MultiplayerMatchConfigSchema = z.union([
  CroMagMultiplayerMatchConfigSchema,
  Nanosaur2MultiplayerMatchConfigSchema,
]);

const multiplayerLobbySummaryBaseSchema = z.object({
  id: z.string().uuid(),
  trackOrLevel: z.string().min(1),
  maxPlayers: z.number().int().min(2).max(6),
  isPublic: z.boolean().default(true),
  joinCode: z.string().min(1),
  state: z.string().min(1),
  playerCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  canJoin: z.boolean(),
});

/** Runtime schema for a compact multiplayer lobby summary. */
export const MultiplayerLobbySummarySchema = z.union([
  multiplayerLobbySummaryBaseSchema.extend({
    gameId: z.literal("cromagrally"),
    mode: croMagMultiplayerModeSchema,
  }),
  multiplayerLobbySummaryBaseSchema.extend({
    gameId: z.literal("nanosaur2"),
    mode: nanosaur2MultiplayerModeSchema,
  }),
]);

const multiplayerLobbyDetailsBaseSchema = z.object({
  id: z.string().uuid(),
  trackOrLevel: z.string().min(1),
  maxPlayers: z.number().int().min(2).max(6),
  isPublic: z.boolean().default(true),
  hostParticipantId: z.string().min(1),
  joinCode: z.string().min(1),
  state: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  players: z.array(MultiplayerLobbyPlayerSchema),
  participantId: z.string().min(1),
  matchConfig: MultiplayerMatchConfigSchema.nullable().optional(),
});

/** Runtime schema for a full multiplayer lobby detail payload. */
export const MultiplayerLobbyDetailsSchema = z.union([
  multiplayerLobbyDetailsBaseSchema.extend({
    gameId: z.literal("cromagrally"),
    mode: croMagMultiplayerModeSchema,
  }),
  multiplayerLobbyDetailsBaseSchema.extend({
    gameId: z.literal("nanosaur2"),
    mode: nanosaur2MultiplayerModeSchema,
  }),
]);

export const MultiplayerLobbyPreviewSchema = z.union([
  z.object({
    id: z.string().uuid(),
    gameId: z.literal("cromagrally"),
    mode: croMagMultiplayerModeSchema,
    trackOrLevel: z.string().min(1),
    maxPlayers: z.number().int().min(2).max(6),
    state: z.string().min(1),
    playerCount: z.number().int().nonnegative(),
    canJoin: z.boolean(),
  }),
  z.object({
    id: z.string().uuid(),
    gameId: z.literal("nanosaur2"),
    mode: nanosaur2MultiplayerModeSchema,
    trackOrLevel: z.string().min(1),
    maxPlayers: z.number().int().min(2).max(6),
    state: z.string().min(1),
    playerCount: z.number().int().nonnegative(),
    canJoin: z.boolean(),
  }),
]);

export const CreateLobbyInputSchema = z.object({
  gameId: multiplayerGameIdSchema,
  mode: z.union([croMagMultiplayerModeSchema, nanosaur2MultiplayerModeSchema]),
  trackOrLevel: z.string().min(1),
  maxPlayers: z.number().int().min(2).max(6),
  displayName: z.string().min(1),
  isPublic: z.boolean(),
});

/** Runtime schema for the lobby list response wrapper. */
export const MultiplayerLobbyListSchema = z.object({
  items: z.array(MultiplayerLobbySummarySchema),
});

export const HubBooleanResultSchema = z.object({
  value: z.boolean().nullable().optional(),
  errorCode: z.string().nullable().optional(),
});

export const HubThrownErrorSchema = z.object({
  message: z.string().min(1),
});
