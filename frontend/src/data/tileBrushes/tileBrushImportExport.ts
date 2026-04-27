import { err, ok, type Result } from "neverthrow";
import { Result as NeverthrowResult } from "neverthrow";
import { tileBrushDocumentSchema } from "./tileBrushSchemas";
import type { TileBrush } from "./tileBrushTypes";

export function parseTileBrushesFromJson(content: string): Result<TileBrush[], string> {
  const parseJsonResult = NeverthrowResult.fromThrowable(
    () => JSON.parse(content) as unknown,
    () => "Invalid JSON",
  )();
  if (parseJsonResult.isErr()) {
    return err(parseJsonResult.error);
  }

  const parsedJson = parseJsonResult.value;
  const parsed = tileBrushDocumentSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return err(parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  return ok(parsed.data.brushes);
}

export function exportTileBrushesToJson(brushes: TileBrush[]): string {
  return JSON.stringify(
    {
      version: 1,
      brushes,
    },
    null,
    2,
  );
}
