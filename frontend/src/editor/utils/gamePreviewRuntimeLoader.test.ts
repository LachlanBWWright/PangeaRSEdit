import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import {
  getPreviewTerrainPaths,
  type PreviewRuntimeModule,
} from "./gamePreviewRuntimeTypes";
import {
  createPreviewModule,
  loadPreviewRuntime,
} from "./gamePreviewRuntimeLoader";
import { writeTerrainToVfs } from "./gamePreviewRuntimeVfs";
import { SCRIPT_RUNTIME_ASSET_FIXTURES } from "./scriptRuntimeAssetFixtures";

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
  requiredContentHash: z.string(),
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

const SCRIPT_PREVIEW_GAMES = [
  Game.OTTO_MATIC,
  Game.BUGDOM,
  Game.BUGDOM_2,
  Game.NANOSAUR,
  Game.NANOSAUR_2,
  Game.CRO_MAG,
  Game.BILLY_FRONTIER,
  Game.MIGHTY_MIKE,
] as const;

function readPublicFixture(relativePath: string): Uint8Array {
  return new Uint8Array(
    readFileSync(join(__dirname, "../../../public", relativePath)),
  );
}

function createVfsModule() {
  const files = new Map<string, Uint8Array>();
  const directories = new Set<string>();
  const module: PreviewRuntimeModule = {
    canvas: document.createElement("canvas"),
    arguments: [],
    preRun: [],
    locateFile: (path) => path,
    FS: {
      writeFile: (path: string, data: Uint8Array) => {
        files.set(path, data);
      },
      analyzePath: (path: string) => ({ exists: directories.has(path) }),
      mkdir: (path: string) => {
        directories.add(path);
      },
    },
  };
  return { files, module };
}

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
    requiredContentHash: "development-unpinned",
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
        requiredContentHash: "development-unpinned",
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

  it.each(SCRIPT_PREVIEW_GAMES)(
    "configures scripting before game startup for port %s",
    (game) => {
      const onError = vi.fn();
      const ccall = vi.fn();
      const module = createPreviewModule({
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
        "PangeaScript_SetStartupScript",
        null,
        ["string"],
        ["Data/Scripts/dist/main.lua"],
      );
      expect(ccall).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it.each(SCRIPT_RUNTIME_ASSET_FIXTURES)(
    "injects a real terrain and custom asset fixture for $game",
    ({
      game,
      terrainDataPath,
      terrainRsrcPath,
      terrainTexturePath,
      customAssetPath,
      customAssetSourcePath,
    }) => {
      const config = GAME_PORT_CONFIGS[game];
      const level = config.levels[config.defaultLevel];
      const terrainPaths = getPreviewTerrainPaths(level, config);
      const { files, module } = createVfsModule();
      const onError = vi.fn();
      const terrainDataBytes = terrainDataPath
        ? readPublicFixture(terrainDataPath)
        : null;
      const terrainRsrcBytes = terrainRsrcPath
        ? readPublicFixture(terrainRsrcPath)
        : null;
      const terrainTextureBytes = terrainTexturePath
        ? readPublicFixture(terrainTexturePath)
        : null;
      const customAssetBytes = readPublicFixture(customAssetSourcePath);
      const scriptBytes = new Uint8Array(
        Buffer.from("return { onLevelStart = function() end }", "utf8"),
      );

      expect(terrainPaths).not.toBeNull();
      if (!terrainPaths) return;

      writeTerrainToVfs(
        module,
        config,
        level,
        terrainPaths,
        terrainDataBytes,
        terrainRsrcBytes,
        terrainTextureBytes,
        [
          { path: "Data/Scripts/dist/main.lua", data: scriptBytes },
          { path: customAssetPath, data: customAssetBytes },
        ],
        onError,
      );

      expect(onError).not.toHaveBeenCalled();
      if (terrainDataBytes) {
        expect(files.get(terrainPaths.dataPath)).toEqual(terrainDataBytes);
      }
      if (terrainRsrcBytes && terrainPaths.rsrcPath) {
        expect(files.get(terrainPaths.rsrcPath)).toEqual(terrainRsrcBytes);
      }
      if (terrainTextureBytes && terrainPaths.texturePath) {
        expect(files.get(terrainPaths.texturePath)).toEqual(terrainTextureBytes);
      }
      expect(files.get("Data/Scripts/dist/main.lua")).toEqual(scriptBytes);
      expect(files.get(customAssetPath)).toEqual(customAssetBytes);
    },
  );

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

  it("routes game keyboard listeners only when the preview canvas owns focus", async () => {
    const onStatus = vi.fn();
    const canvas = document.createElement("canvas");
    canvas.tabIndex = -1;
    document.body.append(canvas);
    const editorInput = document.createElement("textarea");
    document.body.append(editorInput);
    const source = [
      'window.addEventListener("keydown", function () {',
      '  Module.setStatus("game-key");',
      "});",
    ].join("\n");
    const fetchMock = vi.fn(async () => new Response(source));
    vi.stubGlobal("fetch", fetchMock);

    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas,
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      onStatus,
      onError: () => undefined,
      normalLaunch: true,
    });

    const stopRuntime = await loadPreviewRuntime(
      module,
      "https://example.com/runtime.js",
    );

    editorInput.focus();
    editorInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    expect(onStatus).not.toHaveBeenCalledWith("game-key");

    canvas.focus();
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    expect(onStatus).toHaveBeenCalledWith("game-key");

    stopRuntime();
    onStatus.mockClear();
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    expect(onStatus).not.toHaveBeenCalledWith("game-key");

    editorInput.remove();
    canvas.remove();
    vi.unstubAllGlobals();
  });

});
