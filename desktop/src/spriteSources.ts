import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import type { HostError, SpriteAsset } from "@pangea/desktop-contracts";
import { failure, hash, io, projectPath, statOrMissing } from "./files.ts";
import { listAuthoringSources } from "./authoringStorage.ts";

export async function readSpriteSource(target: string): Promise<Result<Uint8Array, HostError>> {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    const info = await statOrMissing(current);
    if (info.isErr()) return err(info.error);
    if (!info.value || info.value.isSymbolicLink()) return err(failure("Sprite sources must exist without symbolic links", "invalid"));
  }
  const info = await statOrMissing(absolute);
  if (info.isErr()) return err(info.error);
  if (!info.value?.isFile()) return err(failure("Choose a sprite source file", "invalid"));
  if (info.value.size > 128 * 1024 * 1024) return err(failure("Sprite source exceeds 128 MiB", "limit"));
  return io(() => fs.readFile(absolute), "Cannot read sprite source").map((bytes) => Uint8Array.from(bytes));
}

export async function spriteSourcePath(root: string, source: SpriteAsset["source"], metadata = false): Promise<Result<string, HostError>> {
  const target = metadata ? source.metadataPath : source.imagePath;
  if (!target) return err(failure("No sprite metadata source", "missing"));
  if (source.mode === "external") return path.isAbsolute(target) ? ok(target) : err(failure("External sprite source must be absolute", "invalid"));
  if (!target.startsWith("AuthoringSources/")) return err(failure("Managed sprite source is outside AuthoringSources", "invalid"));
  return projectPath(root, target);
}

export const spriteFingerprint = (image: Uint8Array, metadata: Uint8Array | null): string => hash(`${hash(image)}:${metadata ? hash(metadata) : "none"}`);

export async function collectSpriteSources(root: string, id: string, imagePath: string, metadataPath: string | null,
  mode: "managed" | "external", authoringPath: string | null = null): Promise<Result<SpriteAsset["source"], HostError>> {
  if (!/\.png$/i.test(imagePath) || (metadataPath && !/\.json$/i.test(metadataPath)))
    return err(failure("Choose a PNG image and optional JSON metadata", "invalid"));
  if (authoringPath && !/\.(aseprite|ase)$/i.test(authoringPath)) return err(failure("Choose an Aseprite authoring document", "invalid"));
  const image = await readSpriteSource(imagePath);
  if (image.isErr()) return err(image.error);
  const metadata = metadataPath ? await readSpriteSource(metadataPath) : ok(null);
  if (metadata.isErr()) return err(metadata.error);
  const authoring = authoringPath ? await readSpriteSource(authoringPath) : ok(null);
  if (authoring.isErr()) return err(authoring.error);
  const fingerprint = spriteFingerprint(image.value, metadata.value);
  if (mode === "external") return ok({ mode, imagePath: path.resolve(imagePath), metadataPath: metadataPath ? path.resolve(metadataPath) : null,
    authoringPath: authoringPath ? path.resolve(authoringPath) : null, fingerprint });
  const sources = await listAuthoringSources(root);
  if (sources.isErr()) return err(sources.error);
  if (sources.value.length + 1 + (metadataPath ? 1 : 0) + (authoringPath ? 1 : 0) > 4096
    || sources.value.reduce((total, file) => total + file.size, image.value.length + (metadata.value?.length ?? 0) + (authoring.value?.length ?? 0)) > 4 * 1024 * 1024 * 1024)
    return err(failure("Project authoring sources exceed 4096 files or 4 GiB", "limit"));
  const directory = `AuthoringSources/${id}/${randomUUID()}`;
  const destination = await projectPath(root, directory);
  if (destination.isErr()) return err(destination.error);
  const created = await io(() => fs.mkdir(destination.value, { recursive: true }), "Cannot create sprite source directory");
  if (created.isErr()) return err(created.error);
  const writes = await io(async () => {
    await fs.writeFile(path.join(destination.value, "source.png"), image.value, { flag: "wx" });
    if (metadata.value) await fs.writeFile(path.join(destination.value, "source.json"), metadata.value, { flag: "wx" });
    if (authoring.value) await fs.writeFile(path.join(destination.value, "source.aseprite"), authoring.value, { flag: "wx" });
  }, "Cannot copy sprite authoring sources");
  if (writes.isErr()) {
    await io(() => fs.rm(destination.value, { recursive: true, force: true }), "Cannot remove incomplete sprite source");
    return err(writes.error);
  }
  return ok({ mode, imagePath: `${directory}/source.png`, metadataPath: metadata.value ? `${directory}/source.json` : null,
    authoringPath: authoring.value ? `${directory}/source.aseprite` : null, fingerprint });
}
