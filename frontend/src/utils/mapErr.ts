import { errorSchema } from "../schemas/common";

export const mapErr = (e: unknown): Error =>
  errorSchema.safeParse(e).data ?? new Error(String(e));
