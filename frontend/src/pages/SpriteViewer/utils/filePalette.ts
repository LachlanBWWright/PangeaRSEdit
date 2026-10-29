import { err, ok, ResultAsync } from "neverthrow";
import { extractTGAPaletteRaw } from "@/utils/tgaParser";

export async function readFilePalette(file: File | undefined) {
  if (!file) return ok(null);
  const bytes = await ResultAsync.fromPromise(file.arrayBuffer(), () => "Cannot read the companion palette");
  if (bytes.isErr()) return err(bytes.error);
  if (bytes.value.byteLength < 18) return err("Invalid companion palette image");
  const palette = extractTGAPaletteRaw(bytes.value);
  return palette ? ok(Uint8Array.from(palette.colors)) : err("Invalid companion palette image");
}
