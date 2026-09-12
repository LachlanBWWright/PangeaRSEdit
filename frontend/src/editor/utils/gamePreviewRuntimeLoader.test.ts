import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import {
  getPreviewTerrainPaths,
  type PreviewRuntimeFailure,
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

type Ccall = NonNullable<PreviewRuntimeModule["ccall"]>;

function createCcallAdapter(
  spy: (ident: string, returnType: string | null, argTypes: string[], args: unknown[]) => unknown,
  defaultNumber: number,
  defaultBoolean = false,
  defaultString = "",
): Ccall {
  function ccall(
    ident: string,
    returnType: "number",
    argTypes: string[],
    args: unknown[],
  ): number;
  function ccall(
    ident: string,
    returnType: "string",
    argTypes: string[],
    args: unknown[],
  ): string;
  function ccall(
    ident: string,
    returnType: "boolean",
    argTypes: string[],
    args: unknown[],
  ): boolean;
  function ccall(
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ): unknown;
  function ccall(
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ): unknown {
    spy(ident, returnType, argTypes, args);
    if (returnType === "string") return defaultString;
    if (returnType === "boolean") return defaultBoolean;
    return defaultNumber;
  }
  return ccall;
}

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
  onFailure?: (failure: PreviewRuntimeFailure) => void,
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
    onFailure,
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

      module.ccall = createCcallAdapter(ccall, 0);
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
    const onFailure = vi.fn();
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
      onFailure,
    );

    module.ccall = createCcallAdapter(vi.fn(), 0);
    module.onRuntimeInitialized?.();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Invalid multiplayer match config"),
    );
    expect(onFailure).toHaveBeenCalledWith({
      category: "native-adapter",
      code: "runtime.network-config",
      message: expect.stringContaining("Invalid multiplayer match config"),
    });
  });

  it("reports an error when multiplayer mode is malformed for a Nanosaur 2 battle launch", () => {
    const onError = vi.fn();
    const module = createNetworkPreviewModule(
      Game.NANOSAUR_2,
      buildValidMatchConfig("nanosaur2", "tagKeepAway", "5"),
      onError,
    );

    module.ccall = createCcallAdapter(vi.fn(), 0);
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

      module.FS = { writeFile: () => undefined };
      module.ccall = createCcallAdapter(ccall, 0, true);
      module.onRuntimeInitialized?.();

      expect(ccall).toHaveBeenCalledWith(
        "PangeaScript_SetStartupScript",
        "number",
        ["string"],
        ["Data/Scripts/dist/main.lua"],
      );
      expect(ccall).toHaveBeenCalledWith("PangeaScript_Reload", "number", [], []);
      expect(ccall).toHaveBeenCalledTimes(2);
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it("surfaces a rejected startup-script status from the runtime", () => {
    const onError = vi.fn();
    const onFailure = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.BUGDOM_2],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      customFiles: [{
        path: "Data/Scripts/dist/main.lua",
        data: new Uint8Array([1]),
      }],
      onStatus: () => undefined,
      onError,
      onFailure,
      normalLaunch: true,
    });

    module.FS = { writeFile: () => undefined };
    module.ccall = createCcallAdapter(vi.fn(), 8, true);
    module.onRuntimeInitialized?.();

    expect(onError).toHaveBeenCalledWith(
      "PangeaScript_SetStartupScript failed with status 8",
    );
    expect(onFailure).toHaveBeenCalledWith({
      category: "native-adapter",
      code: "scripting.startup",
      message: "PangeaScript_SetStartupScript failed with status 8",
    });
  });

  it("preserves native context for a rejected startup-script status", () => {
    const onError = vi.fn();
    const onFailure = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.BUGDOM_2],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      customFiles: [{ path: "Data/Scripts/dist/main.lua", data: new Uint8Array([1]) }],
      onStatus: () => undefined,
      onError,
      onFailure,
      normalLaunch: true,
    });

    module.FS = { writeFile: () => undefined };
    module.ccall = createCcallAdapter(vi.fn(), 8, true, "startup script rejected by native adapter");
    module.onRuntimeInitialized?.();

    expect(onFailure).toHaveBeenCalledWith({
      category: "native-adapter",
      code: "scripting.startup",
      message: "PangeaScript_SetStartupScript failed with status 8: startup script rejected by native adapter",
    });
  });

  it("classifies preview VFS failures as packaging diagnostics", () => {
    const onError = vi.fn();
    const onFailure = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.OTTO_MATIC],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      customFiles: [{ path: "Data/Scripts/dist/main.lua", data: new Uint8Array([1]) }],
      onStatus: () => undefined,
      onError,
      onFailure,
      normalLaunch: true,
    });

    module.onRuntimeInitialized?.();

    expect(onFailure).toHaveBeenCalledWith({
      category: "packaging",
      code: "preview.vfs",
      message: expect.stringContaining("No VFS write mechanism available"),
    });
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to write preview override file"),
    );
  });

  it("surfaces a failed level-jump call as a runtime load error", () => {
    const onError = vi.fn();
    const onRuntimeEvent = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.OTTO_MATIC],
      levelNumber: 0,
      currentLevelInfo: GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[0],
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      onStatus: () => undefined,
      onError,
      onRuntimeEvent,
    });

    const ccall = vi.fn((...args: unknown[]) => {
      const name = z.string().safeParse(args[0]);
      if (name.success && name.data === "OttoMatic_SkipToLevel") return decodeURIComponent("%");
      return 0;
    });
    module.ccall = createCcallAdapter(ccall, 0);
    module.onRuntimeInitialized?.();

    expect(onError).toHaveBeenCalledWith("URI malformed");
    expect(onRuntimeEvent).toHaveBeenCalledWith({
      type: "runtimeLoadFailed",
      detail: "URI malformed",
    });
  });

  it.each(SCRIPT_RUNTIME_ASSET_FIXTURES)(
    "injects a real terrain and custom asset fixture for $game",
    ({
      game,
      terrainDataPath,
      terrainRsrcPath,
      terrainTexturePath,
      customAssets,
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
      const customAssetFiles = customAssets.map((asset) => ({
        path: asset.path,
        data: readPublicFixture(asset.sourcePath),
      }));
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
          ...customAssetFiles,
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
      for (const asset of customAssetFiles) {
        expect(files.get(asset.path)).toEqual(asset.data);
      }
    },
  );

  it("injects scripting files when no terrain path is available", () => {
    const { files, module } = createVfsModule();
    const ccall = vi.fn();
    const onError = vi.fn();
    const scriptBytes = new Uint8Array([0x72, 0x65, 0x74, 0x75, 0x72, 0x6e]);
    const assetBytes = new Uint8Array([1, 2, 3]);
    const previewModule = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.MIGHTY_MIKE],
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
        { path: "/Data/Scripts/dist/main.lua", data: scriptBytes },
        {
          path: "Data/Scripts/assets/models/converted.bg3d",
          data: assetBytes,
        },
      ],
      onStatus: () => undefined,
      onError,
    });
    previewModule.FS = module.FS;
    previewModule.ccall = createCcallAdapter(ccall, 0);

    previewModule.onRuntimeInitialized?.();

    expect(files.get("/Data/Scripts/dist/main.lua")).toEqual(scriptBytes);
    expect(files.get("Data/Scripts/assets/models/converted.bg3d")).toEqual(
      assetBytes,
    );
    expect(onError).not.toHaveBeenCalled();
    expect(ccall).toHaveBeenCalledWith(
      "PangeaScript_SetStartupScript",
      "number",
      ["string"],
      ["Data/Scripts/dist/main.lua"],
    );
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

    module.ccall = createCcallAdapter(ccall, 0);
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

    const stopResult = await loadPreviewRuntime(
      module,
      "https://example.com/runtime.js",
    );
    expect(stopResult.isOk()).toBe(true);
    if (stopResult.isErr()) return;
    const stopRuntime = stopResult.value;

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

  it("does not let stale runtime cleanup restore over a replacement module", async () => {
    vi.useFakeTimers();
    const canvas = document.createElement("canvas");
    const oldModule = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas,
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "old",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      onStatus: () => undefined,
      onError: () => undefined,
      normalLaunch: true,
    });
    const newModule = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas,
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "new",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      onStatus: () => undefined,
      onError: () => undefined,
      normalLaunch: true,
    });
    oldModule.ccall = createCcallAdapter(vi.fn(), 0);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("")));
    const stopResult = await loadPreviewRuntime(
      oldModule,
      "https://example.com/old.js",
    );
    expect(stopResult.isOk()).toBe(true);
    if (stopResult.isErr()) return;

    window.Module = oldModule;
    stopResult.value();
    window.Module = newModule;
    vi.advanceTimersByTime(3_000);

    expect(window.Module).toBe(newModule);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("restores host scheduling APIs synchronously when stopping", async () => {
    vi.useFakeTimers();
    const canvas = document.createElement("canvas");
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas,
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "stop",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      onStatus: () => undefined,
      onError: () => undefined,
      normalLaunch: true,
    });
    const hostRequestAnimationFrame = window.requestAnimationFrame;
    const hostSetTimeout = window.setTimeout;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("")));

    const stopResult = await loadPreviewRuntime(
      module,
      "https://example.com/stop.js",
    );
    expect(stopResult.isOk()).toBe(true);
    if (stopResult.isErr()) return;

    stopResult.value();

    expect(window.requestAnimationFrame).toBe(hostRequestAnimationFrame);
    expect(window.setTimeout).toBe(hostSetTimeout);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

});
