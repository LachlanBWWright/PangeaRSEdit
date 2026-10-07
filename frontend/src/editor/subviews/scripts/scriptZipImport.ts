import { unzipSync } from "fflate";
import { err, Result } from "neverthrow";

export function readBoundedScriptZip(bytes: Uint8Array): Result<Record<string, Uint8Array>, string> {
  if (bytes.byteLength > 64 * 1024 * 1024) return err("The compressed package exceeds 64 MiB.");
  let entries = 0;
  let expandedBytes = 0;
  let invalid = "";
  const paths = new Set<string>();
  const result = Result.fromThrowable(() => unzipSync(bytes, { filter: (file) => {
    entries++;
    expandedBytes += file.originalSize;
    if (entries > 512 || expandedBytes > 96 * 1024 * 1024 || file.originalSize > 64 * 1024 * 1024) invalid = "This package exceeds the expanded file-count or size limits.";
    if (file.name.startsWith("/") || file.name.includes("\\") || file.name.split("/").includes("..") || /^[a-zA-Z]:/.test(file.name)) invalid = `Unsafe package path: ${file.name}`;
    if (paths.has(file.name)) invalid = `Duplicate package path: ${file.name}`;
    paths.add(file.name);
    return invalid.length === 0;
  } }), () => "Could not read this ZIP package.")();
  return invalid ? err(invalid) : result;
}
