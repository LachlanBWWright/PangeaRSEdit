import * as fs from "node:fs/promises";
import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import type { HostError } from "@pangea/desktop-contracts";
import { atomicWrite, io, parseJson, statOrMissing } from "./files.ts";

const historySchema = z.array(z.object({ folder: z.string(), name: z.string(), levelId: z.string().nullable().optional() })).max(12);

export class ProjectHistory {
  constructor(private readonly location: string) {}

  async list(): Promise<Result<z.infer<typeof historySchema>, HostError>> {
    const info = await statOrMissing(this.location);
    if (info.isErr()) return err(info.error);
    if (!info.value) return ok([]);
    const text = await io(() => fs.readFile(this.location, "utf8"), "Cannot read recent projects");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return ok([]);
    const parsed = historySchema.safeParse(json.value);
    return ok(parsed.success ? parsed.data : []);
  }

  async remember(folder: string, name: string, levelId?: string | null) {
    const previous = await this.list();
    if (previous.isErr()) return err(previous.error);
    const saved = previous.value.find((entry) => entry.folder === folder);
    const next = [{ folder, name, levelId: levelId === undefined ? saved?.levelId : levelId }, ...previous.value.filter((entry) => entry.folder !== folder)].slice(0, 12);
    return atomicWrite(this.location, new TextEncoder().encode(JSON.stringify(next)));
  }
}
