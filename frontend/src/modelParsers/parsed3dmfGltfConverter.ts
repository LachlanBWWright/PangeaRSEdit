import { BG3DParseResult } from "./parseBG3D";
import { Document } from "@gltf-transform/core";
import { err, type Result } from "neverthrow";

/**
 * Placeholder for converting a glTF Document to a parsed 3DMF (BG3DParseResult).
 * @param doc Document
 * @returns Result<BG3DParseResult, string>
 */
export function gltfToParsed3dmf(doc: Document): Result<BG3DParseResult, string> {
  // TODO: Implement real conversion logic
  console.log(doc);
  return err("gltfToParsed3dmf is not yet implemented");
}

/**
 * Placeholder for converting a parsed 3DMF (BG3DParseResult) to a glTF Document.
 * @param parsed BG3DParseResult
 * @returns Result<Document, string>
 */
export function parsed3dmfToGLTF(parsed: BG3DParseResult): Result<Document, string> {
  // TODO: Implement real conversion logic
  console.log(parsed);
  return err("parsed3dmfToGLTF is not yet implemented");
}
