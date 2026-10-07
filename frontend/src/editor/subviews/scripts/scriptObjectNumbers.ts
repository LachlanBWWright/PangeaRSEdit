import { z } from "zod";
import { err, ok, type Result } from "neverthrow";

export function parseObjectNumberDraft(draft: string, min: number, max: number, integer: boolean): Result<number, string> {
  const number = z.number().finite().min(min).max(max);
  const schema = z.string().trim().min(1).transform(Number).pipe(integer ? number.int() : number);
  const result = schema.safeParse(draft);
  return result.success ? ok(result.data) : err(`Enter ${integer ? "a whole number" : "a number"} from ${String(min)} to ${String(max)}.`);
}
