import { basename, dirname, extname, resolve, relative, isAbsolute } from "node:path";
import { Document, Format, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { unpartition } from "@gltf-transform/functions";
import { err, ok, ResultAsync } from "neverthrow";
import { normalizeGltfAsset, formatGltfCompatibilityWarnings } from "../modelParsers/gltfCompatibility";
import { copyArrayBuffer, external } from "./boundaries";
import { validateNativeTextures } from "./textures";

export interface OutputFile { readonly path: string; readonly bytes: Uint8Array; }

function createIO(): NodeIO { return new NodeIO().registerExtensions(ALL_EXTENSIONS); }

export function readGltf(path: string): ResultAsync<Document, string> { return external(() => createIO().read(path)); }

function writeGlb(document: Document): ResultAsync<Uint8Array, string> {
  return external(() => document.transform(unpartition())).andThen(() => external(() => createIO().writeBinary(document)));
}

export function prepareNativeDocument(document: Document, allowLossy: boolean): ResultAsync<{ document: Document; warnings: readonly string[] }, string> {
  return validateNativeTextures(document).asyncAndThen(() => writeGlb(document))
    .andThen((bytes) => ResultAsync.fromSafePromise(normalizeGltfAsset("input.glb", copyArrayBuffer(bytes))).andThen((result) => result).mapErr((error) => error.message))
    .andThen((normalized) => {
      const warnings = formatGltfCompatibilityWarnings(normalized.warnings);
      if (warnings.length > 0 && !allowLossy) return err(`Native conversion requires these changes:\n${warnings.join("\n")}\nUse --allow-lossy to accept them.`);
      return ok({ document: normalized.document, warnings });
    });
}

export function prepareGltfFiles(document: Document, path: string): ResultAsync<readonly OutputFile[], string> {
  const io = createIO();
  if (extname(path).toLowerCase() === ".glb") return writeGlb(document).map((bytes) => [{ path, bytes }]);
  const stem = basename(path, extname(path));
  const folder = `${stem}.resources`;
  for (const [index, buffer] of document.getRoot().listBuffers().entries()) buffer.setURI(`${folder}/buffer-${index}.bin`);
  const extensions: Readonly<Record<string, string>> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/ktx2": "ktx2" };
  for (const [index, texture] of document.getRoot().listTextures().entries()) texture.setURI(`${folder}/texture-${index}.${extensions[texture.getMimeType()] ?? "bin"}`);
  return external(() => io.writeJSON(document, { format: Format.GLTF, basename: stem })).andThen((asset) => {
    const files: OutputFile[] = [{ path, bytes: new TextEncoder().encode(JSON.stringify(asset.json, null, 2)) }];
    for (const [uri, bytes] of Object.entries(asset.resources)) {
      const target = resolve(dirname(path), uri);
      const relation = relative(resolve(dirname(path)), target);
      if (isAbsolute(relation) || relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) return err(`Unsafe glTF resource path: ${uri}`);
      files.push({ path: target, bytes });
    }
    return ok(files);
  });
}
