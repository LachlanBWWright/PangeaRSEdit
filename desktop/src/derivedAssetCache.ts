import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { HostError } from "@pangea/desktop-contracts";
import { atomicWrite, failure, hash, io, parseJson, statOrMissing } from "./files.ts";

export interface AssetDependency { name: string; path: string }
export interface AssetRecipe {
  id: string;
  version: number;
  extension: string;
  dependencies: readonly AssetDependency[];
  build: (directory: string) => Promise<Result<string, HostError>>;
}
const manifestSchema = z.object({ hash: z.string(), size: z.number().int().nonnegative() });

export class DerivedAssetCache {
  private readonly pending = new Map<string, Promise<Result<string, HostError>>>();
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  constructor(private readonly directory: string) {}

  public async get(recipe: AssetRecipe): Promise<Result<string, HostError>> {
    if (!/^[a-z0-9]+$/.test(recipe.extension)) return err(failure("Invalid conversion output extension", "invalid"));
    const snapshots: { name: string; bytes: Uint8Array }[] = [];
    const stamps: { path: string; stamp: string }[] = [];
    for (const dependency of recipe.dependencies) {
      if (!dependency.name || dependency.name === "." || dependency.name === ".." || path.basename(dependency.name) !== dependency.name) return err(failure("Invalid conversion dependency", "invalid"));
      const info = await io(() => fs.stat(dependency.path), "Cannot inspect conversion input");
      if (info.isErr()) return err(info.error);
      if (info.value.size > 128 * 1024 * 1024) return err(failure("Conversion input exceeds 128 MiB", "limit"));
      const bytes = await io(() => fs.readFile(dependency.path), "Cannot read conversion input");
      if (bytes.isErr()) return err(bytes.error);
      if (bytes.value.length > 128 * 1024 * 1024) return err(failure("Conversion input exceeds 128 MiB", "limit"));
      if (snapshots.some((source) => source.name === dependency.name)) return err(failure("Duplicate conversion dependency", "invalid"));
      stamps.push({ path: dependency.path, stamp: `${info.value.size}:${info.value.mtimeMs}:${info.value.ctimeMs}` });
      snapshots.push({ name: dependency.name, bytes: bytes.value });
    }
    for (const source of stamps) {
      const info = await io(() => fs.stat(source.path), "Cannot verify conversion input");
      if (info.isErr()) return err(info.error);
      if (`${info.value.size}:${info.value.mtimeMs}:${info.value.ctimeMs}` !== source.stamp)
        return err(failure("Game data changed while preparing the conversion. Retry asset loading.", "source-changed"));
    }
    const key = hash(JSON.stringify([recipe.id, recipe.version, recipe.extension,
      snapshots.map((source) => [source.name, hash(source.bytes)])]));
    const existing = this.pending.get(key);
    if (existing) return existing;
    const pending = this.materialize(recipe, snapshots, key);
    this.pending.set(key, pending);
    const result = await pending;
    this.pending.delete(key);
    return result;
  }

  private async cached(output: string): Promise<boolean> {
    const info = await statOrMissing(output);
    if (info.isErr() || !info.value?.isFile() || info.value.size > 128 * 1024 * 1024) return false;
    const raw = await io(() => fs.readFile(`${output}.json`, "utf8"), "Cannot read conversion cache manifest");
    if (raw.isErr()) return false;
    const json = parseJson(raw.value);
    if (json.isErr()) return false;
    const manifest = manifestSchema.safeParse(json.value);
    if (!manifest.success || manifest.data.size !== info.value.size) return false;
    const bytes = await io(() => fs.readFile(output), "Cannot verify conversion cache");
    return bytes.isOk() && hash(bytes.value) === manifest.data.hash;
  }

  private async materialize(recipe: AssetRecipe, snapshots: readonly { name: string; bytes: Uint8Array }[], key: string): Promise<Result<string, HostError>> {
    const output = path.join(this.directory, `${key}.${recipe.extension}`);
    if (await this.cached(output)) return ok(output);
    if (this.active >= 2) await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active++;
    const staging = path.join(this.directory, `.staging-${randomUUID()}`);
    const result = await this.build(recipe, snapshots, staging, output);
    await io(() => fs.rm(staging, { recursive: true, force: true }), "Cannot remove conversion staging files");
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
    return result;
  }

  private async build(recipe: AssetRecipe, snapshots: readonly { name: string; bytes: Uint8Array }[], staging: string, output: string): Promise<Result<string, HostError>> {
    for (const source of snapshots) {
      const written = await atomicWrite(path.join(staging, source.name), source.bytes);
      if (written.isErr()) return err(written.error);
    }
    const built = await recipe.build(staging);
    if (built.isErr()) return err(built.error);
    const size = await io(() => fs.stat(built.value), "Cannot inspect converted asset");
    if (size.isErr()) return err(size.error);
    if (size.value.size > 128 * 1024 * 1024) return err(failure("Converted asset exceeds 128 MiB", "limit"));
    const bytes = await io(() => fs.readFile(built.value), "Cannot read converted asset");
    if (bytes.isErr()) return err(bytes.error);
    if (!bytes.value.length) return err(failure("Conversion produced an empty asset", "conversion"));
    const written = await atomicWrite(output, bytes.value);
    if (written.isErr()) return err(written.error);
    const manifest = await atomicWrite(`${output}.json`, new TextEncoder().encode(JSON.stringify({
      size: bytes.value.length, hash: hash(bytes.value),
    })));
    return manifest.isErr() ? err(manifest.error) : ok(output);
  }
}
