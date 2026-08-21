import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { Game } from "../src/data/globals/globals";
import { SCRIPT_RUNTIME_ASSET_FIXTURES } from "../src/editor/utils/scriptRuntimeAssetFixtures";

interface GameArtifact {
  readonly gameId: string;
  readonly files: readonly string[];
  readonly entrypoint: string;
  readonly entrypointScript: string;
  readonly scriptingApiMarker: string;
}

const artifactRoot = "public/generated/pangea-ports/wasm";

const gameArtifacts: readonly GameArtifact[] = [
  {
    gameId: "BillyFrontier-Android",
    files: ["billyfrontier/billyfrontier.wasm", "billyfrontier/billyfrontier.js", "billyfrontier/billyfrontier.data"],
    entrypoint: "billyfrontier/billyfrontier.html",
    entrypointScript: "billyfrontier.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "Bugdom-android",
    files: ["bugdom/Bugdom.wasm", "bugdom/Bugdom.js", "bugdom/Bugdom.data"],
    entrypoint: "bugdom/game.html",
    entrypointScript: "Bugdom.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "Bugdom2-Android",
    files: ["bugdom2/Bugdom2.wasm", "bugdom2/Bugdom2.js", "bugdom2/Bugdom2.data"],
    entrypoint: "bugdom2/Bugdom2.html",
    entrypointScript: "Bugdom2.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "CroMagRally-Android",
    files: ["cromagrally/CroMagRally.wasm", "cromagrally/CroMagRally.js", "cromagrally/CroMagRally.data"],
    entrypoint: "cromagrally/CroMagRally.html",
    entrypointScript: "CroMagRally.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "MightyMike-Android",
    files: ["mightymike/MightyMike.wasm", "mightymike/MightyMike.js"],
    entrypoint: "mightymike/index.html",
    entrypointScript: "MightyMike.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "Nanosaur-android",
    files: ["nanosaur/Nanosaur.wasm", "nanosaur/Nanosaur.js", "nanosaur/Nanosaur.data"],
    entrypoint: "nanosaur/index.html",
    entrypointScript: "Nanosaur.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "Nanosaur2-Android",
    files: ["nanosaur2/Nanosaur2.wasm", "nanosaur2/Nanosaur2.js", "nanosaur2/Nanosaur2.data"],
    entrypoint: "nanosaur2/Nanosaur2.html",
    entrypointScript: "Nanosaur2.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
  {
    gameId: "OttoMatic-Android",
    files: ["ottomatic/OttoMatic.wasm", "ottomatic/OttoMatic.js", "ottomatic/OttoMatic.data"],
    entrypoint: "ottomatic/OttoMatic.html",
    entrypointScript: "OttoMatic.js",
    scriptingApiMarker: "PangeaScript_IsEnabled",
  },
];

function readArtifact(path: string): Result<Uint8Array, string> {
  return Result.fromThrowable(
    () => new Uint8Array(readFileSync(path)),
    () => `Missing staged scripting artifact: ${path}`,
  )();
}

function readTextArtifact(path: string): Result<string, string> {
  return Result.fromThrowable(
    () => readFileSync(path, "utf8"),
    () => `Missing staged scripting artifact: ${path}`,
  )();
}

function hasWasmHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 4
    && bytes[0] === 0x00
    && bytes[1] === 0x61
    && bytes[2] === 0x73
    && bytes[3] === 0x6d;
}

function readPublicFixture(path: string): Result<Uint8Array, string> {
  return Result.fromThrowable(
    () => new Uint8Array(readFileSync(resolve(process.cwd(), "public", path))),
    () => `Missing production scripting fixture: ${path}`,
  )();
}

function gameIdForFixture(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC: return "OttoMatic-Android";
    case Game.BUGDOM: return "Bugdom-android";
    case Game.BUGDOM_2: return "Bugdom2-Android";
    case Game.NANOSAUR: return "Nanosaur-android";
    case Game.NANOSAUR_2: return "Nanosaur2-Android";
    case Game.CRO_MAG: return "CroMagRally-Android";
    case Game.BILLY_FRONTIER: return "BillyFrontier-Android";
    case Game.MIGHTY_MIKE: return "MightyMike-Android";
  }
}

async function validateArtifacts(): Promise<Result<true, string>> {
  for (const game of gameArtifacts) {
    const entrypoint = readTextArtifact(resolve(process.cwd(), artifactRoot, game.entrypoint));
    if (entrypoint.isErr()) return err(`${game.gameId}: ${entrypoint.error}`);
    if (!entrypoint.value.includes(game.entrypointScript)) {
      return err(`${game.gameId}: entrypoint does not reference ${game.entrypointScript}`);
    }
    for (const relativePath of game.files) {
      const artifact = readArtifact(resolve(process.cwd(), artifactRoot, relativePath));
      if (artifact.isErr()) return err(`${game.gameId}: ${artifact.error}`);
      if (artifact.value.byteLength === 0) {
        return err(`${game.gameId}: staged scripting artifact is empty: ${relativePath}`);
      }
      if (relativePath.endsWith(".wasm") && !hasWasmHeader(artifact.value)) {
        return err(`${game.gameId}: staged artifact is not a WebAssembly module: ${relativePath}`);
      }
      if (relativePath.endsWith(".wasm")) {
        const wasmBuffer = new ArrayBuffer(artifact.value.byteLength);
        new Uint8Array(wasmBuffer).set(artifact.value);
        const compilation = await ResultAsync.fromPromise(
          WebAssembly.compile(wasmBuffer),
          () => `${game.gameId}: staged artifact cannot be compiled: ${relativePath}`,
        );
        if (compilation.isErr()) return err(compilation.error);
      }
      if (relativePath.endsWith(".js")) {
        const source = readTextArtifact(resolve(process.cwd(), artifactRoot, relativePath));
        if (source.isErr()) return err(`${game.gameId}: ${source.error}`);
        if (!source.value.includes(game.scriptingApiMarker)) {
          return err(`${game.gameId}: scripting API export is missing from ${relativePath}`);
        }
      }
    }
  }
  const fixtureGames = new Set<string>();
  for (const fixture of SCRIPT_RUNTIME_ASSET_FIXTURES) {
    const gameId = gameIdForFixture(fixture.game);
    fixtureGames.add(gameId);
    const artifact = gameArtifacts.find((candidate) => candidate.gameId === gameId);
    if (!artifact) return err(`Production fixture has no staged artifact: ${gameId}`);
    for (const path of [fixture.terrainDataPath, fixture.terrainRsrcPath, fixture.terrainTexturePath, fixture.customAssetSourcePath]) {
      if (!path) continue;
      const bytes = readPublicFixture(path);
      if (bytes.isErr()) return err(`${gameId}: ${bytes.error}`);
      if (bytes.value.byteLength === 0) return err(`${gameId}: production fixture is empty: ${path}`);
    }
    if (!fixture.customAssetPath.startsWith("Data/Scripts/assets/")) {
      return err(`${gameId}: custom fixture is outside the scripting asset namespace`);
    }
  }
  if (fixtureGames.size !== gameArtifacts.length) {
    return err("Every staged scripting artifact must have a production asset fixture");
  }
  return ok(true);
}

const result = await validateArtifacts();
if (result.isErr()) {
  console.error(result.error);
  process.exitCode = 1;
} else {
  console.log(`Validated staged scripting artifacts for ${String(gameArtifacts.length)} game targets.`);
}
