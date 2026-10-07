/**
 * 3DMF (Apple QuickDraw 3D MetaFile) Parser and Writer Module
 *
 * This module provides functionality to parse and write 3DMF files,
 * which are used by older Pangea games like Bugdom 1 and Nanosaur 1.
 *
 * The module includes:
 * - parse3DMFToMetaFile: Parse a 3DMF file into a TQ3MetaFile structure
 * - write3DMFFromMetaFile: Write a TQ3MetaFile structure back to 3DMF format
 * - metaFileToBG3DParseResult: Convert TQ3MetaFile to BG3DParseResult
 * - bg3dParseResultToMetaFile: Convert BG3DParseResult to TQ3MetaFile
 */

// Type exports
export * from "./types";

// Binary utilities
export { BigEndianReader, BigEndianWriter } from "./binaryUtils";

// Parser
export { parse3DMFToMetaFile } from "./parse3DMF";

// Writer
export { write3DMFFromMetaFile } from "./write3DMF";

// Conversion utilities
export {
  metaFileToBG3DParseResult,
  bg3dParseResultToMetaFile,
} from "./convert";
