import { BG3DParseResult } from "./parseBG3D";
import { Document } from "@gltf-transform/core";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { ok, type Result } from "neverthrow";

/**
 * Convert a glTF document to the parsed native model representation used by
 * the 3DMF serializer. 3DMF and BG3D share this normalized intermediate form;
 * the format-specific serializer remains responsible for writing the bytes.
 * @param doc Document
 * @returns Result<BG3DParseResult, string>
 */
export function gltfToParsed3dmf(doc: Document): Result<BG3DParseResult, string> {
  return ok(gltfToBG3D(doc));
}

/**
 * Convert the normalized native model representation to glTF before the 3DMF
 * serializer writes the format-specific metadata and resource fork.
 * @param parsed BG3DParseResult
 * @returns Result<Document, string>
 */
export function parsed3dmfToGLTF(parsed: BG3DParseResult): Result<Document, string> {
  return ok(bg3dParsedToGLTF(parsed));
}
