import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { getLevelRestriction as getOttoLevelRestriction } from "@/data/items/ottoItemType";

export interface ScriptSourceFinding {
  readonly line: number;
  readonly message: string;
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

export function preflightScriptSource(
  source: string,
  gameId: string,
  supportedHooks: readonly string[],
  levelNumber: number | null = null,
): readonly ScriptSourceFinding[] {
  const findings: ScriptSourceFinding[] = [];
  const supportedHookSet = new Set(supportedHooks);
  const game = AUTHORITATIVE_API_SCHEMA.games.find((candidate) => candidate.gameId === gameId);
  const nativeIds = new Set(game?.nativeSpawns.map((item) => item.id) ?? []);

  for (const match of source.matchAll(/\bfunction\s+(on[A-Z][A-Za-z0-9_]*)\s*\(/g)) {
    const hook = match[1];
    if (hook !== undefined && !supportedHookSet.has(hook)) {
      findings.push({ line: lineAt(source, match.index), message: `Hook '${hook}' is not supported by ${game?.gameName ?? gameId}.` });
    }
  }

  for (const match of source.matchAll(/pangea\.spawn\.(?:native|nativeResult)\s*\(\s*(?:"([^"]+)"|'([^']+)'|(\d+))[\s\S]*?\)/g)) {
    const id = match[1] ?? match[2] ?? match[3];
    if (id !== undefined && !nativeIds.has(id)) {
      findings.push({ line: lineAt(source, match.index), message: `Unknown native item ID '${id}' for ${game?.gameName ?? gameId}.` });
      continue;
    }
    const nativeItem = game?.nativeSpawns.find((item) => item.id === id);
    const numericId = Number(id);
    if (gameId === "OttoMatic-Android" && Number.isInteger(numericId)) {
      const requiredLevel = getOttoLevelRestriction(numericId);
      if (requiredLevel === -1) {
        findings.push({ line: lineAt(source, match.index), message: `${nativeItem?.label ?? id} has no implemented native initializer.` });
      } else if (requiredLevel > 0 && levelNumber !== null && requiredLevel !== levelNumber) {
        findings.push({ line: lineAt(source, match.index), message: `${nativeItem?.label ?? id} requires Otto Matic level ${requiredLevel}; the current level is ${levelNumber}.` });
      }
    }
    for (const paramMatch of match[0].matchAll(/\bparam([0-3])\s*=\s*(-?\d+)/g)) {
      const paramName = `param${paramMatch[1]}`;
      const value = Number(paramMatch[2]);
      const metadata = nativeItem?.params.find((param) => param.name === paramName);
      const allowedValues = metadata?.values?.map((option) => Number(option.split(" ", 1)[0]));
      if (value < 0 || value > 255) {
        findings.push({ line: lineAt(source, match.index + paramMatch.index), message: `${paramName} must fit the native terrain byte range 0-255.` });
      } else if (allowedValues !== undefined && !allowedValues.includes(value)) {
        findings.push({ line: lineAt(source, match.index + paramMatch.index), message: `${paramName} value ${value} is invalid for ${nativeItem?.label ?? id}. Expected ${allowedValues.join(", ")}.` });
      }
    }
  }

  for (const match of source.matchAll(/\bwhile\s+true\s+do\b/g)) {
    findings.push({ line: lineAt(source, match.index), message: "Unbounded 'while true' loop may exhaust the per-frame script budget." });
  }

  return findings;
}
