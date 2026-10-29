import * as fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import type { HostError, ProjectFile } from "@pangea/desktop-contracts";
import { PROJECT_MANIFEST, relativePathSchema } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, parseJson, projectPath, statOrMissing } from "./files.ts";

interface PreviousFile { target: string; bytes: Uint8Array | null }
const JOURNAL = ".pangea/transaction.json";
const MAX_DESTINATIONS = 4096 * 2 + 1;
const journalSchema = z.array(z.object({ path: relativePathSchema, bytes: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/).nullable() })).max(MAX_DESTINATIONS);

export async function saveTransaction(root: string, files: ProjectFile[], removed: string[]): Promise<Result<void, HostError>> {
  const names = [...files.map((file) => file.path), ...removed];
  if (names.length > MAX_DESTINATIONS) return err(failure("Transaction exceeds the supported file and removal limit", "limit"));
  if (new Set(names).size !== names.length || removed.includes(PROJECT_MANIFEST) || names.includes(JOURNAL))
    return err(failure("Duplicate or invalid save destinations", "invalid"));
  if (files.reduce((size, file) => size + file.bytes.length, 0) > 512 * 1024 * 1024)
    return err(failure("Save exceeds 512 MiB", "limit"));
  const previous: PreviousFile[] = [];
  for (const name of names) {
    const location = await projectPath(root, name);
    if (location.isErr()) return err(location.error);
    const info = await statOrMissing(location.value);
    if (info.isErr()) return err(info.error);
    if (info.value && !info.value.isFile()) return err(failure("Save destination must be a regular file", "invalid"));
    if (!info.value) { previous.push({ target: location.value, bytes: null }); continue; }
    const bytes = await io(() => fs.readFile(location.value), `Cannot back up ${name}`);
    if (bytes.isErr()) return err(bytes.error);
    previous.push({ target: location.value, bytes: bytes.value });
  }
  const journalPath = await projectPath(root, JOURNAL);
  if (journalPath.isErr()) return err(journalPath.error);
  const journal = previous.map((file, index) => ({ path: names[index], bytes: file.bytes ? Buffer.from(file.bytes).toString("base64") : null }));
  const recorded = await atomicWrite(journalPath.value, new TextEncoder().encode(JSON.stringify(journal)));
  if (recorded.isErr()) return recorded;
  for (const [index, name] of names.entries()) {
    const before = previous[index];
    if (!before) return err(failure("Missing save destination", "invalid"));
    const file = files.find((entry) => entry.path === name);
    const written = file ? await atomicWrite(before.target, file.bytes)
      : await io(() => fs.rm(before.target, { force: true }), `Cannot remove ${name}`);
    if (written.isOk()) continue;
    const restored = await restoreFiles(previous.slice(0, index + 1));
    if (restored.isOk()) await io(() => fs.rm(journalPath.value, { force: true }), "Cannot clear save journal");
    return err(restored.isErr()
      ? failure("Save and rollback failed. Keep recovery data and inspect project files.", "rollback")
      : written.error);
  }
  return io(() => fs.rm(journalPath.value, { force: true }), "Cannot clear save journal");
}

export async function recoverInterruptedSave(root: string): Promise<Result<void, HostError>> {
  const location = await projectPath(root, JOURNAL);
  if (location.isErr()) return err(location.error);
  const info = await statOrMissing(location.value);
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok(undefined);
  const text = await io(() => fs.readFile(location.value, "utf8"), "Cannot read interrupted save journal");
  if (text.isErr()) return err(text.error);
  const json = parseJson(text.value);
  if (json.isErr()) return err(json.error);
  const parsed = journalSchema.safeParse(json.value);
  if (!parsed.success || parsed.data.some((file) => file.path === JOURNAL)) return err(failure("Invalid save journal; preserve project for recovery", "invalid"));
  const previous: PreviousFile[] = [];
  for (const file of parsed.data) {
    const target = await projectPath(root, file.path);
    if (target.isErr()) return err(target.error);
    previous.push({ target: target.value, bytes: file.bytes === null ? null : Buffer.from(file.bytes, "base64") });
  }
  const restored = await restoreFiles(previous);
  return restored.isErr() ? restored : io(() => fs.rm(path.join(root, JOURNAL), { force: true }), "Cannot clear recovered journal");
}

async function restoreFiles(previous: PreviousFile[]): Promise<Result<void, HostError>> {
  for (const file of previous.reverse()) {
    const restored = file.bytes ? await atomicWrite(file.target, file.bytes)
      : await io(() => fs.rm(file.target, { force: true }), "Cannot roll back new file");
    if (restored.isErr()) return restored;
  }
  return ok(undefined);
}
