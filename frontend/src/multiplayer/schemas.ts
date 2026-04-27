import { z } from "zod";

/** Runtime schema for a multiplayer lobby player record. */
export const MultiplayerLobbyPlayerSchema = z.object({
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  playerIndex: z.number().int().nonnegative(),
  isHost: z.boolean(),
  isReady: z.boolean(),
  joinedAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
});

/** Runtime schema for a compact multiplayer lobby summary. */
export const MultiplayerLobbySummarySchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().min(1),
  mode: z.string().min(1),
  trackOrLevel: z.string().min(1),
  maxPlayers: z.number().int().min(2).max(6),
  joinCode: z.string().min(1),
  state: z.string().min(1),
  playerCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
});

/** Runtime schema for a full multiplayer lobby detail payload. */
export const MultiplayerLobbyDetailsSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().min(1),
  mode: z.string().min(1),
  trackOrLevel: z.string().min(1),
  maxPlayers: z.number().int().min(2).max(6),
  hostParticipantId: z.string().min(1),
  joinCode: z.string().min(1),
  state: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  players: z.array(MultiplayerLobbyPlayerSchema),
  participantId: z.string().min(1),
});

/** Runtime schema for the lobby list response wrapper. */
export const MultiplayerLobbyListSchema = z.object({
  items: z.array(MultiplayerLobbySummarySchema),
});
