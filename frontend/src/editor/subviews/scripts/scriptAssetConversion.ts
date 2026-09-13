import { err, ok, Result, ResultAsync } from "neverthrow";
import { gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { normalizeGltfAsset } from "@/modelParsers/gltfCompatibility";
import { errorSchema } from "@/schemas/common";

export interface ConvertedGltfAsset {
  readonly nativeBytes: Uint8Array;
  readonly normalizedSourceBytes: Uint8Array;
  readonly warnings: readonly string[];
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isModernGltfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".gltf") || path.toLowerCase().endsWith(".glb");
}

export async function convertGltfAsset(
  fileName: string,
  bytes: Uint8Array,
): Promise<Result<ConvertedGltfAsset, string>> {
  if (!isModernGltfPath(fileName)) {
    return err(`Unsupported modern model format: ${fileName}`);
  }

  const normalizedResult = await ResultAsync.fromPromise(
    normalizeGltfAsset(fileName, toArrayBuffer(bytes)),
    () => `Could not read glTF asset: ${fileName}`,
  );
  if (normalizedResult.isErr()) return err(normalizedResult.error);
  const normalized = normalizedResult.value;
  if (normalized.isErr()) {
    return err(normalized.error.message);
  }

  const conversionResult = Result.fromThrowable(
    () => new Uint8Array(bg3dParsedToBG3D(gltfToBG3D(normalized.value.document))),
    (error: unknown) => {
      const parsedError = errorSchema.safeParse(error);
      const message = parsedError.success ? parsedError.data : "unknown conversion failure";
      return `Could not convert glTF asset to BG3D: ${fileName} (${message})`;
    },
  )();
  if (conversionResult.isErr()) return err(conversionResult.error);
  if (conversionResult.value.byteLength === 0) {
    return err(`glTF conversion produced an empty BG3D asset: ${fileName}`);
  }

  return ok({
    nativeBytes: conversionResult.value,
    normalizedSourceBytes: new Uint8Array(normalized.value.normalizedGlb),
    warnings: normalized.value.warnings.map((warning) => warning.message),
  });
}
