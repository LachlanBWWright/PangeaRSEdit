import { Game } from "../../data/globals/globals";
import { Result } from "neverthrow";
import type { GamePortConfig } from "./gamePortConfig";
import {
  type PreviewRuntimeModule,
  type PreviewTerrainPaths,
} from "./gamePreviewRuntimeTypes";
import { mapErr } from "../../utils/mapErr";
import { z } from "zod";

export function applyPreviewGlobals(
  win: Window,
  config: GamePortConfig,
  levelNumber: number,
  terrainPaths: PreviewTerrainPaths | null,
  normalLaunch = false,
): () => void {
  const previousValues = new Map<string, unknown>();
  const stringSchema = z.string();
  const undefinedSchema = z.undefined();

  const setGlobal = (key: string, value: unknown) => {
    const previous = Result.fromThrowable(
      () => Reflect.get(win, key),
      (e) => mapErr(e),
    )();
    previousValues.set(key, previous.isOk() ? previous.value : undefined);
    Result.fromThrowable(
      () => {
        Reflect.set(win, key, value);
      },
      (e) => mapErr(e),
    )();
  };

  if (config.game === Game.NANOSAUR) {
    setGlobal("SetCustomTerrainFile", (path: string) => {
      const module = win.Module;
      return module?.ccall?.("SetCustomTerrainFile", null, ["string"], [path]);
    });
  }

  if (!normalLaunch) {
    if (config.game === Game.BUGDOM) {
      setGlobal("BUGDOM_NO_FENCE_COLLISION", false);
      const bugdomTerrainPath = terrainPaths?.dataPath ?? null;
      if (bugdomTerrainPath && stringSchema.safeParse(bugdomTerrainPath).success) {
        setGlobal("BUGDOM_TERRAIN_FILE", bugdomTerrainPath);
      }
    }

    const preloadVars = config.getPreLoadVars?.(levelNumber) ?? {};
    for (const [key, value] of Object.entries(preloadVars)) {
      setGlobal(key, value);
    }

    if (
      config.game === Game.OTTO_MATIC ||
      config.game === Game.NANOSAUR ||
      config.game === Game.BUGDOM ||
      config.game === Game.BUGDOM_2 ||
      config.game === Game.NANOSAUR_2
    ) {
      setGlobal("_startLevel", levelNumber);
    }
    if (config.game === Game.NANOSAUR) {
      setGlobal("_skipMenu", 1);
    }
    if (config.game === Game.CRO_MAG) {
      setGlobal("_track", levelNumber);
    }
  }

  return () => {
    for (const [key, value] of previousValues.entries()) {
      if (undefinedSchema.safeParse(value).success) {
        Result.fromThrowable(
          () => {
            Reflect.deleteProperty(win, key);
          },
          (e) => mapErr(e),
        )();
      } else {
        Result.fromThrowable(
          () => {
            Reflect.set(win, key, value);
          },
          (e) => mapErr(e),
        )();
      }
    }
  };
}

export type { PreviewRuntimeModule };
