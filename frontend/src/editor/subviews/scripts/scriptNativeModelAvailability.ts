import { Game } from "@/data/globals/globals";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";
import { CLASSIC_NATIVE_MODEL_COUNTS, CLASSIC_NATIVE_SKELETON_ANIMATIONS, getClassicNativeBank, getClassicSkeletonBank, isClassicNativeLevel, MIKE_NATIVE_ANIMATIONS } from "./scriptClassicNativeBanks";
import { modernGameplayLevelCount, modernModelBank, modernModelBankCondition, type NativeModelBankOverrides } from "./scriptModernModelBanks";
import { getModernSkeletonAvailability, getNativeActorAvailability } from "./scriptModernSkeletonAvailability";

export interface NativeModelAvailability {
  readonly status: "Available" | "Unavailable" | "Choose level";
  readonly detail: string;
}

export function nativeModelOverrides(properties: Readonly<Record<string, string>> = {}): NativeModelBankOverrides {
  return { biome: properties["level.biome"], areaMode: properties["area.mode"],
    tunnel: properties["level.tunnel"], bugdom2Area: properties["level.bugdom2Area"] };
}

function classicSkeleton(game: Game, type: number, animation: number, level: number): NativeModelAvailability {
  const bank = getClassicSkeletonBank(game, type, level);
  if (!bank) return { status: "Unavailable", detail: `Skeleton ${type} is not loaded in this gameplay level.` };
  const count = CLASSIC_NATIVE_SKELETON_ANIMATIONS[bank] ?? 0;
  if (!Number.isInteger(animation) || animation < 0 || animation >= count) {
    return { status: "Unavailable", detail: `${bank}.skeleton has ${count} animations; animation ${animation} is outside that range.` };
  }
  return { status: "Available", detail: `${bank}.skeleton is loaded in this gameplay level; animation ${animation} exists.` };
}

function displayModel(game: Game, group: "global" | "levelSpecific", object: number, level: number, overrides: NativeModelBankOverrides): NativeModelAvailability {
  const modern = modernModelBank(game, group, level, overrides);
  const classic = getClassicNativeBank(game, group, level);
  const bank = modern?.file ?? classic;
  if (!bank) return { status: "Unavailable", detail: `The ${group === "global" ? "global" : "level-specific"} bank is not loaded in this gameplay mode.` };
  const count = modern?.objects ?? CLASSIC_NATIVE_MODEL_COUNTS[bank] ?? MIKE_NATIVE_ANIMATIONS[bank]?.length ?? 0;
  const valid = Number.isInteger(object) && object >= 0 && object < count;
  const condition = modernModelBankCondition(game, group, level);
  return {
    status: valid ? "Available" : "Unavailable",
    detail: `${bank} contains ${count} objects (0–${count - 1}). Object ${object} ${valid ? "exists" : "is outside that range"}.${condition ? ` ${condition}` : ""}`,
  };
}

export function getNativeModelAvailability(game: Game, definition: ScriptCustomObjectDefinition, levelNumber: number | null,
  properties?: Readonly<Record<string, string>>): NativeModelAvailability | null {
  const visual = definition.visual;
  if (visual.kind !== "nativeSkeleton" && visual.kind !== "nativeDisplayGroup" && visual.kind !== "nativeActor") return null;
  if (levelNumber === null) return { status: "Choose level", detail: "Select a target gameplay level to check its loaded native assets." };
  const modernLevels = modernGameplayLevelCount(game);
  const validLevel = modernLevels === null ? isClassicNativeLevel(game, levelNumber)
    : Number.isInteger(levelNumber) && levelNumber >= 0 && levelNumber < modernLevels;
  if (!validLevel) return { status: "Unavailable", detail: "This target is outside the game's gameplay levels." };
  if (visual.kind === "nativeActor") return getNativeActorAvailability(game, visual.spawnId, levelNumber);
  if (visual.kind === "nativeSkeleton") {
    return getModernSkeletonAvailability(game, visual.skeletonType, levelNumber, { ...nativeModelOverrides(properties), initialAnimation: visual.initialAnimation })
      ?? classicSkeleton(game, visual.skeletonType, visual.initialAnimation, levelNumber);
  }
  return displayModel(game, visual.group, visual.modelObject, levelNumber, nativeModelOverrides(properties));
}
