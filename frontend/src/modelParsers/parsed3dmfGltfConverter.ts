import { BG3DParseResult } from "./parseBG3D";
import { Document } from "@gltf-transform/core";
import { Result, err } from "@/types/result";

/**
 * Placeholder for converting a glTF Document to a parsed 3DMF (BG3DParseResult).
 * @param doc Document
 * @returns Result<BG3DParseResult, Error>
 */
export function gltfToParsed3dmf(doc: Document): Result<BG3DParseResult, Error> {
  // TODO: Implement real conversion logic
  console.log(doc);
  return err(new Error("gltfToParsed3dmf is not yet implemented"));
}

/**
 * Placeholder for converting a parsed 3DMF (BG3DParseResult) to a glTF Document.
 * @param parsed BG3DParseResult
 * @returns Result<Document, Error>
 */
export function parsed3dmfToGLTF(parsed: BG3DParseResult): Result<Document, Error> {
  // TODO: Implement real conversion logic
  console.log(parsed);
  return err(new Error("parsed3dmfToGLTF is not yet implemented"));
}
