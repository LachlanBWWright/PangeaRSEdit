import { BG3DParseResult } from "./parseBG3D";
import { Result, err } from "../types/result";

/**
 * Placeholder for serializing a BG3DParseResult back to a 3DMF ArrayBuffer.
 * @param parsed BG3DParseResult
 * @returns Result<ArrayBuffer, Error>
 */
export function bg3dParsedTo3DMF(
  parsed: BG3DParseResult,
): Result<ArrayBuffer, Error> {
  // TODO: Implement real 3DMF serialization logic
  console.log(parsed);
  return err(new Error("bg3dParsedTo3DMF is not yet implemented"));
}

/**
 * Placeholder for a 3DMF parser. Returns a BG3DParseResult-like structure for now.
 * @param buffer ArrayBuffer containing the 3DMF file
 * @returns Result<BG3DParseResult, Error>
 */
export function parse3DMF(_buf: ArrayBuffer): Result<BG3DParseResult, Error> {
  // Mark `_buf` as used so the linter is satisfied in a placeholder function
  void _buf;
  // TODO: Implement real 3DMF parsing logic
  return err(new Error("parse3DMF is not yet implemented"));
}
