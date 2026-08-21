import { err, ok, type Result } from "neverthrow";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import type { NativeSpawnAudit } from "./scriptApiSchema";

export type NativeReplacementClassification =
  | "directly-replaceable"
  | "replaceable-with-native-hooks"
  | "native-only";

export type NativeReplacementSurface = Exclude<
  NativeSpawnAudit["replacementSurface"],
  "none"
>;

export interface NativeItemAudit {
  readonly gameId: string;
  readonly nativeId: string;
  readonly nativeType: number;
  readonly label: string;
  readonly family: string;
  readonly classification: NativeReplacementClassification;
  readonly fallback: "native-initializer" | "skip-replacement";
  readonly requiredCapabilities: readonly string[];
  readonly requiredAssets: readonly string[];
  readonly lifecycle: "stateless" | "pickup" | "trigger" | "native-owned";
  readonly modeAudit: NativeSpawnAudit["modeAudit"];
  readonly replacementSurface: NativeSpawnAudit["replacementSurface"];
  readonly streaming: NativeSpawnAudit["streaming"];
  readonly childObjects: NativeSpawnAudit["childObjects"];
  readonly saveBehavior: NativeSpawnAudit["saveBehavior"];
  readonly auditBasis: string;
  readonly supportedModes: readonly string[];
}

export interface NativeReplacementCompatibility {
  readonly allowed: boolean;
  readonly label: string;
  readonly message: string;
  readonly tone: "good" | "warning" | "danger";
}

function supportedModesForGame(gameId: string): readonly string[] {
  return SCRIPTING_CONTRACT.games[gameId]?.modes ?? [];
}

function buildAudit(): readonly NativeItemAudit[] {
  return SCRIPTING_CONTRACT.api.games.flatMap((game) =>
    game.nativeSpawns.map((nativeSpawn) => {
      const audit: NativeSpawnAudit = nativeSpawn.audit;
      const nativeType = nativeSpawn.nativeType ?? Number(nativeSpawn.id);
      return {
        gameId: game.gameId,
        nativeId: nativeSpawn.id,
        nativeType,
        label: nativeSpawn.label,
        family: nativeSpawn.category,
        classification: audit.classification,
        fallback: audit.fallback,
        requiredCapabilities: audit.requiredCapabilities,
        requiredAssets: audit.requiredAssets,
        lifecycle: audit.lifecycle,
        modeAudit: audit.modeAudit,
        replacementSurface: audit.replacementSurface,
        streaming: audit.streaming,
        childObjects: audit.childObjects,
        saveBehavior: audit.saveBehavior,
        auditBasis: audit.auditBasis,
        supportedModes: supportedModesForGame(game.gameId),
      };
    }),
  );
}

export const NATIVE_ITEM_AUDIT = buildAudit();

export function getNativeReplacementDecision(
  gameId: string,
  nativeType: number,
  strict: boolean,
  replacementSurface?: NativeReplacementSurface,
): Result<NativeItemAudit, string> {
  const audit = getNativeItemAudit(gameId, nativeType, replacementSurface);
  if (!audit) {
    return err(
      replacementSurface === undefined
        ? `Native type ${nativeType} is not registered for game '${gameId}'`
        : `Native type ${nativeType} has no ${replacementSurface} replacement path for game '${gameId}'`,
    );
  }
  if (audit.classification === "native-only" && strict) {
    return err(
      `Native type ${nativeType} (${audit.label}) requires native fallback and cannot be strict-replaced for game '${gameId}'`,
    );
  }
  return ok(audit);
}

export function validateNativeReplacementBatch(
  gameId: string,
  nativeTypes: readonly number[],
  strict: boolean,
  replacementSurface?: NativeReplacementSurface,
): Result<readonly NativeItemAudit[], string> {
  if (nativeTypes.length === 0) {
    return err("A native replacement batch must contain at least one native type");
  }
  const audits: NativeItemAudit[] = [];
  const seenTypes = new Set<number>();
  for (const nativeType of nativeTypes) {
    if (seenTypes.has(nativeType)) continue;
    seenTypes.add(nativeType);
    const decision = getNativeReplacementDecision(gameId, nativeType, strict, replacementSurface);
    if (decision.isErr()) return err(decision.error);
    audits.push(decision.value);
  }
  return ok(audits);
}

export function getNativeItemAudit(
  gameId: string,
  nativeType: number,
  replacementSurface?: NativeReplacementSurface,
): NativeItemAudit | null {
  const matches = NATIVE_ITEM_AUDIT.filter(
    (item) => item.gameId === gameId && item.nativeType === nativeType,
  );
  const surfaceMatches = replacementSurface === undefined
    ? matches
    : matches.filter((item) => item.replacementSurface === replacementSurface);
  return (
    surfaceMatches.find((item) => item.nativeId.includes(".")) ?? surfaceMatches[0] ?? null
  );
}

export function getNativeReplacementCompatibility(
  gameId: string,
  nativeType: number,
  replacementSurface?: NativeReplacementSurface,
): NativeReplacementCompatibility {
  const audit = getNativeItemAudit(gameId, nativeType, replacementSurface);
  if (!audit) {
    return {
      allowed: false,
      label: "Unsupported native type",
      message: replacementSurface === undefined
        ? `Native type ${nativeType} is not registered for ${gameId}. Select a registered game object before creating a replacement.`
        : `Native type ${nativeType} has no ${replacementSurface} replacement path for ${gameId}. Select a compatible source surface before creating a replacement.`,
      tone: "danger",
    };
  }
  if (audit.classification === "native-only") {
    return {
      allowed: true,
      label: "Native fallback",
      message: `${audit.label} remains native when the scripted replacement cannot take ownership. The replacement is exported as non-strict.`,
      tone: "warning",
    };
  }
  return {
    allowed: true,
    label: "Script replacement",
    message: `${audit.label} has a registered scripted replacement path with native fallback available on failure.`,
    tone: "good",
  };
}

export function validateNativeReplacement(
  gameId: string,
  nativeType: number,
  replacementSurface?: NativeReplacementSurface,
): Result<NativeItemAudit, string> {
  const audit = getNativeItemAudit(gameId, nativeType, replacementSurface);
  if (!audit) {
    return err(
      replacementSurface === undefined
        ? `Native type ${nativeType} is not registered for game '${gameId}'`
        : `Native type ${nativeType} has no ${replacementSurface} replacement path for game '${gameId}'`,
    );
  }
  if (audit.classification === "native-only") {
    return err(
      `Native type ${nativeType} (${audit.label}) is native-only for game '${gameId}' and cannot be replaced safely`,
    );
  }
  return ok(audit);
}
