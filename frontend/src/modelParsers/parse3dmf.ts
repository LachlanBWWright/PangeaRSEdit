import { BG3DParseResult } from "./parseBG3D";
import { Result } from "neverthrow";
// Use neverthrow instance methods (.andThen) instead of named import
import {
  parse3DMFToMetaFile,
  write3DMFFromMetaFile,
  metaFileToBG3DParseResult,
  bg3dParseResultToMetaFile,
  TQ3MetaFile,
} from "./threeDMF";

/**
 * Parse a 3DMF file into BG3DParseResult format.
 * This allows 3DMF files to be used with the same infrastructure as BG3D files.
 * @param buffer ArrayBuffer containing the 3DMF file
 * @returns Result<BG3DParseResult, Error>
 */
export function parse3DMF(buffer: ArrayBuffer): Result<BG3DParseResult, string> {
  // Parse 3DMF to native format, then convert to BG3D format
  return parse3DMFToMetaFile(buffer).andThen(
    (metaFile): Result<BG3DParseResult, string> => metaFileToBG3DParseResult(metaFile),
  );
}

/**
 * Serialize a BG3DParseResult back to a 3DMF ArrayBuffer.
 * @param parsed BG3DParseResult
 * @returns Result<ArrayBuffer, Error>
 */
export function bg3dParsedTo3DMF(
  parsed: BG3DParseResult,
): Result<ArrayBuffer, string> {
  // Convert BG3D format to native 3DMF format, then write
  return bg3dParseResultToMetaFile(parsed).andThen(
    (metaFile): Result<ArrayBuffer, string> => write3DMFFromMetaFile(metaFile),
  );
}

/**
 * Parse a 3DMF file into native TQ3MetaFile format.
 * Use this if you need direct access to 3DMF-specific data structures.
 * @param buffer ArrayBuffer containing the 3DMF file
 * @returns Result<TQ3MetaFile, Error>
 */
export function parse3DMFNative(buffer: ArrayBuffer): Result<TQ3MetaFile, string> {
  return parse3DMFToMetaFile(buffer);
}

/**
 * Write a TQ3MetaFile to 3DMF format.
 * @param metaFile TQ3MetaFile structure
 * @returns Result<ArrayBuffer, Error>
 */
export function write3DMFNative(metaFile: TQ3MetaFile): Result<ArrayBuffer, string> {
  return write3DMFFromMetaFile(metaFile);
}

// Re-export types for convenience
export type { TQ3MetaFile };
