/**
 * Placeholder for converting a glTF Document to a parsed 3DMF (BG3DParseResult).
 * @param doc Document
 * @returns BG3DParseResult
 */
export function gltfToParsed3dmf(doc: Document): BG3DParseResult {
  // TODO: Implement real conversion logic
  console.log(doc);
  throw new Error("gltfToParsed3dmf is not yet implemented");
}
import { BG3DParseResult } from "./parseBG3D";
import { Document } from "@gltf-transform/core";

/**
 * Placeholder for converting a parsed 3DMF (BG3DParseResult) to a glTF Document.
 * @param parsed BG3DParseResult
 * @returns Document
 */
export function parsed3dmfToGLTF(parsed: BG3DParseResult): Document {
  // TODO: Implement real conversion logic
  console.log(parsed);
  throw new Error("parsed3dmfToGLTF is not yet implemented");
}
