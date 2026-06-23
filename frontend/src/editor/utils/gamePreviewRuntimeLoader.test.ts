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
  isHost: z.number(),
  playerCount: z.number(),
  matchIdLow: z.number(),
  matchIdHigh: z.number(),
});

function buildValidMatchConfig(
  gameId: "cromagrally" | "nanosaur2",
  mode: string,
  trackOrLevel: string,
) {
  return {
    lobbyId: "f0985d6e-f6a8-4f55-b903-6d98ec3133ce",
    matchId: "8f5fd112-87d8-41dd-8656-4745b3caa34e",
    gameId,
    mode,
    trackOrLevel,
    seed: 1337,
    hostPlayerIndex: 0,
    tagDurationMinutes: 2,
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
  };
}

function createNetworkPreviewModule(
  game: Game,
  networkMatchConfig: unknown,
  onError?: (text: string) => void,
) {
  return createPreviewModule({
    config: GAME_PORT_CONFIGS[game],
    levelNumber: 0,
    currentLevelInfo: undefined,
    canvas: document.createElement("canvas"),
    assetBaseUrl: "https://example.com/",
    cacheBustToken: "test-token",
    terrainDataBytes: null,
    terrainRsrcBytes: null,
    terrainTextureBytes: null,
    terrainPaths: null,
    networkMatchConfig,
    localParticipantId: "host",
    onStatus: () => undefined,
    onError: onError ?? (() => undefined),
  });
}

describe("game preview runtime loader", () => {
  const launchCases: readonly {
    readonly gameId: "cromagrally" | "nanosaur2";
    readonly mode: string;
    readonly trackOrLevel: string;
  }[] = [
    { gameId: "cromagrally", mode: "multiplayerRace", trackOrLevel: "1" },
    { gameId: "cromagrally", mode: "multiplayerTag1", trackOrLevel: "10" },
    { gameId: "cromagrally", mode: "multiplayerTag2", trackOrLevel: "10" },
    {
      gameId: "cromagrally",
      mode: "multiplayerSurvival",
      trackOrLevel: "10",
    },
    {
      gameId: "cromagrally",
      mode: "multiplayerQuestForFire",
      trackOrLevel: "10",
    },
    { gameId: "nanosaur2", mode: "multiplayerRace", trackOrLevel: "3" },
    { gameId: "nanosaur2", mode: "multiplayerBattle", trackOrLevel: "5" },
    { gameId: "nanosaur2", mode: "multiplayerFlag", trackOrLevel: "7" },
  ];

  it.each(launchCases)(
    "passes $gameId $mode launch payload to WASM",
    ({ gameId, mode, trackOrLevel }) => {
      const ccall = vi.fn();
      const module = createNetworkPreviewModule(
        gameId === "cromagrally" ? Game.CRO_MAG : Game.NANOSAUR_2,
        buildValidMatchConfig(gameId, mode, trackOrLevel),
      );

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

      expect(parsedPayload.data.gameId).toBe(gameId);
      expect(parsedPayload.data.mode).toBe(mode);
      expect(parsedPayload.data.trackOrLevel).toBe(trackOrLevel);
      expect(parsedPayload.data.localPlayerIndex).toBe(0);
      expect(parsedPayload.data.isHost).toBe(1);
      expect(parsedPayload.data.playerCount).toBe(2);
    },
  );

  it("reports an error when multiplayer mode is omitted for a Cro-Mag arena launch", () => {
    const onError = vi.fn();
    const module = createNetworkPreviewModule(
      Game.CRO_MAG,
      {
        lobbyId: "f0985d6e-f6a8-4f55-b903-6d98ec3133ce",
        matchId: "8f5fd112-87d8-41dd-8656-4745b3caa34e",
        gameId: "cromagrally",
        trackOrLevel: "10",
        seed: 1337,
        hostPlayerIndex: 0,
        tagDurationMinutes: 2,
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
      onError,
    );

    module.ccall = vi.fn();
    module.onRuntimeInitialized?.();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Invalid multiplayer match config"),
    );
  });

  it("reports an error when multiplayer mode is malformed for a Nanosaur 2 battle launch", () => {
    const onError = vi.fn();
    const module = createNetworkPreviewModule(
      Game.NANOSAUR_2,
      buildValidMatchConfig("nanosaur2", "tagKeepAway", "5"),
      onError,
    );

    module.ccall = vi.fn();
    module.onRuntimeInitialized?.();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Invalid multiplayer match config"),
    );
  });

  it("configures scripting exports when the preview bundle is injected", () => {
    const onError = vi.fn();
    const ccall = vi.fn((ident: string) => {
      if (ident === "_PangeaScript_IsEnabled") {
        return 1;
      }
      return undefined;
    });
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
      customFiles: [
        {
          path: "Data/Scripts/dist/main.lua",
          data: new Uint8Array([1, 2, 3]),
        },
      ],
      onStatus: () => undefined,
      onError,
      normalLaunch: true,
    });

    module.ccall = ccall;
    module.onRuntimeInitialized?.();

    expect(ccall).toHaveBeenCalledWith(
      "_PangeaScript_IsEnabled",
      "number",
      [],
      [],
    );
    expect(ccall).toHaveBeenCalledWith(
      "_PangeaScript_SetStartupScript",
      null,
      ["string"],
      ["Data/Scripts/dist/main.lua"],
    );
    expect(ccall).toHaveBeenCalledWith("_PangeaScript_Reload", null, [], []);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports an error when ccall is unavailable for network launch", () => {
    const onError = vi.fn();
    const module = createNetworkPreviewModule(
      Game.CRO_MAG,
      buildValidMatchConfig("cromagrally", "multiplayerRace", "1"),
      onError,
    );

    module.onRuntimeInitialized?.();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports an error when local participant is missing from match players", () => {
    const ccall = vi.fn();
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
      networkMatchConfig: buildValidMatchConfig(
        "cromagrally",
        "multiplayerRace",
        "1",
      ),
      localParticipantId: "missing-participant",
      onStatus: () => undefined,
      onError,
    });

    module.ccall = ccall;
    module.onRuntimeInitialized?.();

    expect(ccall).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "Local participant missing-participant was not found in match player list",
    );
  });

});
