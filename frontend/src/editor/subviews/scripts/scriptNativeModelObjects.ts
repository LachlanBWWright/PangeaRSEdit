import { err, ok, type Result } from "neverthrow";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";

export function nativeModelObjectCount(parsed: BG3DParseResult): number {
  return parsed.groups[0]?.children.length ?? 0;
}

export function selectNativeModelObject(parsed: BG3DParseResult, index: number): Result<BG3DParseResult, string> {
  const object = Number.isInteger(index) && index >= 0 ? parsed.groups[0]?.children[index] : undefined;
  return object ? ok({ ...parsed, groups: [{ children: [object] }] }) : err(`Model object ${index} is unavailable.`);
}
