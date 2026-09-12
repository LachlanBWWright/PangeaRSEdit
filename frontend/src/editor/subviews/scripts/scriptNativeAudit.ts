import { err, ok, type Result } from "neverthrow";
import {
  AUTHORITATIVE_API_SCHEMA,
  type NativeSpawnAudit,
} from "./scriptApiSchema";

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
  readonly runtimeVerification: NativeSpawnAudit["runtimeVerification"];
  readonly auditBasis: string;
  readonly supportedModes: readonly string[];
}

export interface NativeReplacementCompatibility {
  readonly allowed: boolean;
  readonly label: string;
  readonly message: string;
  readonly tone: "good" | "warning" | "danger";
  readonly auditWarnings: readonly string[];
}

function getAuditWarnings(audit: NativeItemAudit): readonly string[] {
  const warnings: string[] = [];
  if (audit.modeAudit === "not-audited") warnings.push("mode coverage");
  if (audit.childObjects === "not-audited") warnings.push("child-object ownership");
  if (audit.saveBehavior === "not-audited") warnings.push("save/checkpoint behavior");
  if (audit.streaming === "not-audited") warnings.push("streaming behavior");
  if (audit.runtimeVerification === "not-verified") warnings.push("runtime verification");
  if (audit.runtimeVerification === "constructor-probe") warnings.push("constructor-only runtime verification");
  return warnings;
}

function supportedModesForGame(gameId: string): readonly string[] {
  if (gameId === "Nanosaur2-Android") return ["adventure", "race", "battle", "capture"];
  if (gameId === "CroMagRally-Android") {
    return ["local", "practice", "network", "tag1", "tag2", "survival", "capture"];
  }
  if (gameId === "BillyFrontier-Android" || gameId === "MightyMike-Android") {
    return ["local"];
  }
  return ["single-player"];
}

function buildAudit(): readonly NativeItemAudit[] {
  return AUTHORITATIVE_API_SCHEMA.games.flatMap((game) =>
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
        runtimeVerification: audit.runtimeVerification,
        auditBasis: audit.auditBasis,
        supportedModes: supportedModesForGame(game.gameId),
      };
    }),
  );
}

export const NATIVE_ITEM_AUDIT = buildAudit();

export function validateNativeItemAuditCatalog(): Result<true, string> {
  for (const audit of NATIVE_ITEM_AUDIT) {
    if (audit.requiredAssets.length === 0) {
      return err(`Native audit has no required assets: ${audit.gameId}/${audit.nativeId}`);
    }
    if (audit.auditBasis.trim().length === 0) {
      return err(`Native audit has no audit basis: ${audit.gameId}/${audit.nativeId}`);
    }
    if (audit.nativeId.includes(".")) {
      if (audit.modeAudit === "not-audited") {
        return err(`Registered native family has no mode audit: ${audit.gameId}/${audit.nativeId}`);
      }
      if (audit.childObjects === "not-audited") {
        return err(`Registered native family has no child-object audit: ${audit.gameId}/${audit.nativeId}`);
      }
      if (audit.saveBehavior === "not-audited") {
        return err(`Registered native family has no save audit: ${audit.gameId}/${audit.nativeId}`);
      }
    }
    if (audit.classification === "native-only") {
      if (audit.replacementSurface !== "none" || audit.fallback !== "skip-replacement") {
        return err(`Native-only audit has a replacement path: ${audit.gameId}/${audit.nativeId}`);
      }
      continue;
    }
    if (audit.replacementSurface === "none" || audit.fallback !== "native-initializer") {
      return err(`Replaceable audit has no native fallback path: ${audit.gameId}/${audit.nativeId}`);
    }
    if (!audit.requiredCapabilities.includes("nativeSpawn")) {
      return err(`Replaceable audit omits nativeSpawn capability: ${audit.gameId}/${audit.nativeId}`);
    }
    if (audit.modeAudit === "all-declared-modes" && audit.supportedModes.length === 0) {
      return err(`All-mode audit has no declared modes: ${audit.gameId}/${audit.nativeId}`);
    }
  }
  return ok(true);
}

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
      auditWarnings: [],
    };
  }
  const auditWarnings = getAuditWarnings(audit);
  const auditSuffix = auditWarnings.length === 0
    ? ""
    : ` Audit still required for: ${auditWarnings.join(", ")}.`;
  if (audit.classification === "native-only") {
    return {
      allowed: true,
      label: "Native fallback",
      message: `${audit.label} remains native when the scripted replacement cannot take ownership. The replacement is exported as non-strict.${auditSuffix}`,
      tone: "warning",
      auditWarnings,
    };
  }
  return {
    allowed: true,
    label: auditWarnings.length === 0 ? "Script replacement" : "Script replacement (audit pending)",
    message: `${audit.label} has a registered scripted replacement path with native fallback available on failure.${auditSuffix}`,
    tone: auditWarnings.length === 0 ? "good" : "warning",
    auditWarnings,
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
