import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import { createPreviewModule } from "./gamePreviewRuntimeLoader";

const launchPayloadSchema = z.object({
  lobbyId: z.string(),
  matchId: z.string(),
  gameId: z.string(),
  mode: z.string(),
  trackOrLevel: z.string(),
  seed: z.number(),
  hostPlayerIndex: z.number(),
  maxPlayers: z.number(),
  requiredProtocolVersion: z.number(),
  requiredRuntimeVersion: z.string(),
  hostParticipantId: z.string(),
  players: z.array(
    z.object({
      participantId: z.string(),
      playerIndex: z.number(),
      displayName: z.string(),
      connectionState: z.string(),
    }),
  ),
  localPlayerIndex: z.number(),
  playerCount: z.number(),
  matchIdLow: z.number(),
  matchIdHigh: z.number(),
});

describe("game preview runtime loader", () => {
  it("passes derived network launch payload to WASM", () => {
    const ccall = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      networkMatchConfig: {
        lobbyId: "f0985d6e-f6a8-4f55-b903-6d98ec3133ce",
        matchId: "8f5fd112-87d8-41dd-8656-4745b3caa34e",
        gameId: "cro-mag",
        mode: "race",
        trackOrLevel: "0",
        seed: 1337,
        hostPlayerIndex: 0,
        maxPlayers: 2,
        requiredProtocolVersion: 1,
        requiredRuntimeVersion: "host-authoritative-v2",
        hostParticipantId: "host",
        players: [
          {
            participantId: "host",
            playerIndex: 0,
            displayName: "Host",
            connectionState: "connected",
          },
          {
            participantId: "guest",
            playerIndex: 1,
            displayName: "Guest",
            connectionState: "connected",
          },
        ],
      },
      onStatus: () => undefined,
      onError: () => undefined,
    });

    module.ccall = ccall;
    module.onRuntimeInitialized?.();

    expect(ccall).toHaveBeenNthCalledWith(
      1,
      "PangeaGame_SetNetworkMatchConfig",
      null,
      ["string", "number"],
      expect.any(Array),
    );
    expect(ccall).toHaveBeenNthCalledWith(
      2,
      "PangeaGame_StartNetworkMatch",
      null,
      [],
      [],
    );

    const callArgs = ccall.mock.calls[0]?.[3];
    const payloadArg = Array.isArray(callArgs) ? callArgs[0] : null;
    const parsedJson = z.string().safeParse(payloadArg);
    expect(parsedJson.success).toBe(true);
    if (!parsedJson.success) {
      return;
    }

    const parsedPayload = launchPayloadSchema.safeParse(
      JSON.parse(parsedJson.data),
    );
    expect(parsedPayload.success).toBe(true);
    if (!parsedPayload.success) {
      return;
    }

    expect(parsedPayload.data.localPlayerIndex).toBe(0);
    expect(parsedPayload.data.playerCount).toBe(2);
  });

  it("reports an error when ccall is unavailable for network launch", () => {
    const onError = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      networkMatchConfig: {
        lobbyId: "f0985d6e-f6a8-4f55-b903-6d98ec3133ce",
        matchId: "8f5fd112-87d8-41dd-8656-4745b3caa34e",
        gameId: "cro-mag",
        mode: "race",
        trackOrLevel: "0",
        seed: 1337,
        hostPlayerIndex: 0,
        maxPlayers: 2,
        requiredProtocolVersion: 1,
        requiredRuntimeVersion: "host-authoritative-v2",
        hostParticipantId: "host",
        players: [
          {
            participantId: "host",
            playerIndex: 0,
            displayName: "Host",
            connectionState: "connected",
          },
          {
            participantId: "guest",
            playerIndex: 1,
            displayName: "Guest",
            connectionState: "connected",
          },
        ],
      },
      onStatus: () => undefined,
      onError,
    });

    module.onRuntimeInitialized?.();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
