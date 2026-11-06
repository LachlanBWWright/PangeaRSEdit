import { Game } from "@/data/globals/globals";

const knownBaseLevels = new WeakMap<File, number>();

export function nativeLevelNumber(game: Game, previewLevel: number): number {
  return game === Game.CRO_MAG ? Math.max(0, previewLevel - 1) : previewLevel;
}

export function previewLevelNumber(game: Game, nativeLevel: number): number {
  return game === Game.CRO_MAG ? nativeLevel + 1 : nativeLevel;
}

export function rememberBaseLevel(file: File, level: number): File {
  knownBaseLevels.set(file, level);
  return file;
}

export function knownBaseLevel(file: File): number | undefined {
  return knownBaseLevels.get(file);
}
