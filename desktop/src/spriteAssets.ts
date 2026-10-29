import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import { spriteAssetSchema, type HostError, type ProjectFile, type ProjectSnapshot, type SpriteAsset, type SpriteFrame, type SpriteRead } from "@pangea/desktop-contracts";
import { failure, io, parseJson, projectPath, statOrMissing } from "./files.ts";
import { jsonFile } from "./assetRegistry.ts";
import { collectSpriteSources, readSpriteSource, spriteFingerprint, spriteSourcePath } from "./spriteSources.ts";
import type { ProjectStore } from "./projectStore.ts";

export const SPRITE_REGISTRY = ".pangea/sprites.json";

export class SpriteAssets {
  private active = false;
  constructor(private readonly project: ProjectStore) {}

  public async list(): Promise<Result<SpriteAsset[], HostError>> {
    const root = this.project.folder();
    if (!root) return err(failure("Open a project first", "no-project"));
    const target = await projectPath(root, SPRITE_REGISTRY);
    if (target.isErr()) return err(target.error);
    const info = await statOrMissing(target.value);
    if (info.isErr()) return err(info.error);
    if (!info.value) return root === this.project.folder() ? ok([]) : err(failure("Project changed while listing sprite sources", "conflict"));
    const read = await io(() => fs.readFile(target.value, "utf8"), "Cannot read sprite source registry");
    if (read.isErr()) return err(read.error);
    const json = parseJson(read.value);
    if (json.isErr()) return err(json.error);
    const parsed = z.array(spriteAssetSchema).max(512).safeParse(json.value);
    if (!parsed.success || new Set(parsed.data.map((asset) => asset.id)).size !== parsed.data.length
      || new Set(parsed.data.map((asset) => `${asset.nativePath}:${asset.shapeIndex}`)).size !== parsed.data.length)
      return err(failure("Invalid sprite source registry", "invalid"));
    for (const asset of parsed.data) {
      for (const targetPath of [asset.source.imagePath, asset.source.metadataPath, asset.source.authoringPath]) {
        if (!targetPath) continue;
        if (asset.source.mode === "managed" && !targetPath.startsWith(`AuthoringSources/${asset.id}/`))
          return err(failure("Managed sprite source is outside its source directory", "invalid"));
        if (asset.source.mode === "external" && !path.isAbsolute(targetPath))
          return err(failure("External sprite source must be absolute", "invalid"));
      }
    }
    return root === this.project.folder() ? ok(parsed.data) : err(failure("Project changed while listing sprite sources", "conflict"));
  }

  public async source(id: string): Promise<Result<string, HostError>> {
    const root = this.project.folder();
    const records = await this.list();
    if (records.isErr()) return err(records.error);
    const asset = records.value.find((entry) => entry.id === id);
    if (root !== this.project.folder()) return err(failure("Project changed while locating sprite source", "conflict"));
    return asset && root ? spriteSourcePath(root, { ...asset.source, imagePath: asset.source.authoringPath ?? asset.source.imagePath })
      : err(failure("Unknown sprite source", "missing"));
  }

  public async read(id: string): Promise<Result<SpriteRead, HostError>> {
    const root = this.project.folder();
    const records = await this.list();
    if (records.isErr()) return err(records.error);
    const asset = records.value.find((entry) => entry.id === id);
    if (root !== this.project.folder()) return err(failure("Project changed while reading sprite source", "conflict"));
    if (!asset || !root) return err(failure("Unknown sprite source", "missing"));
    const imagePath = await spriteSourcePath(root, asset.source);
    if (imagePath.isErr()) return err(imagePath.error);
    const image = await readSpriteSource(imagePath.value);
    if (image.isErr()) return err(image.error);
    const metadata = asset.source.metadataPath ? await this.readMetadata(root, asset) : ok(null);
    if (metadata.isErr()) return err(metadata.error);
    if (root !== this.project.folder()) return err(failure("Project changed while reading sprite source", "conflict"));
    return ok({ asset, imageBytes: Uint8Array.from(image.value), metadataBytes: metadata.value ? Uint8Array.from(metadata.value) : null,
      fingerprint: spriteFingerprint(image.value, metadata.value) });
  }

  private async readMetadata(root: string, asset: SpriteAsset): Promise<Result<Uint8Array, HostError>> {
    const target = await spriteSourcePath(root, asset.source, true);
    return target.isErr() ? err(target.error) : readSpriteSource(target.value);
  }

  public async link(name: string, nativePath: string, shapeIndex: number, imagePath: string, metadataPath: string | null,
    mode: "managed" | "external", authoringPath: string | null = null): Promise<Result<SpriteAsset, HostError>> {
    if (this.active || this.project.busy()) return err(failure("Wait for the current sprite import or save", "busy"));
    this.active = true;
    const result = await this.performLink(name, nativePath, shapeIndex, imagePath, metadataPath, mode, authoringPath);
    this.active = false;
    return result;
  }

  private async performLink(name: string, nativePath: string, shapeIndex: number, imagePath: string, metadataPath: string | null,
    mode: "managed" | "external", authoringPath: string | null): Promise<Result<SpriteAsset, HostError>> {
    const snapshot = await this.project.inspect();
    if (snapshot.isErr()) return err(snapshot.error);
    const records = await this.list();
    if (records.isErr()) return err(records.error);
    if (snapshot.value.folder !== this.project.folder()) return err(failure("Project changed while linking sprite source", "conflict"));
    if (!snapshot.value.files.some((file) => file.path === nativePath)) return err(failure("Save the native Shapes asset to this project before linking a source", "missing"));
    const previous = records.value.find((asset) => asset.nativePath === nativePath && asset.shapeIndex === shapeIndex);
    if (!previous && records.value.length >= 512) return err(failure("Project exceeds 512 linked sprite sources", "limit"));
    const id = previous?.id ?? randomUUID();
    const source = await collectSpriteSources(snapshot.value.folder, id, imagePath, metadataPath, mode, authoringPath);
    if (source.isErr()) return err(source.error);
    const parsed = spriteAssetSchema.safeParse({ version: 1, id, name, nativePath, shapeIndex, source: source.value,
      frames: previous?.frames ?? [], importedAt: previous?.importedAt ?? new Date().toISOString() });
    if (!parsed.success) { await this.removeCopiedSource(snapshot.value.folder, source.value); return err(failure("Invalid sprite source details", "invalid")); }
    if (snapshot.value.folder !== this.project.folder()) {
      await this.removeCopiedSource(snapshot.value.folder, source.value);
      return err(failure("Project changed while linking sprite source", "conflict"));
    }
    const saved = await this.project.save(snapshot.value.revision, snapshot.value.manifest,
      [jsonFile(SPRITE_REGISTRY, [...records.value.filter((asset) => asset.id !== id), parsed.data])], []);
    if (saved.isErr()) { await this.removeCopiedSource(snapshot.value.folder, source.value); return err(saved.error); }
    return ok(parsed.data);
  }

  private async removeCopiedSource(root: string, source: SpriteAsset["source"]): Promise<void> {
    if (source.mode !== "managed") return;
    const target = await projectPath(root, path.posix.dirname(source.imagePath));
    if (target.isOk()) await io(() => fs.rm(target.value, { recursive: true, force: true }), "Cannot clean sprite source import");
  }

  public async commit(id: string, fingerprint: string, revision: string, files: ProjectFile[], frames: SpriteFrame[]): Promise<Result<ProjectSnapshot, HostError>> {
    if (this.active || this.project.busy()) return err(failure("Wait for the current sprite import or save", "busy"));
    this.active = true;
    const result = await this.performCommit(id, fingerprint, revision, files, frames);
    this.active = false;
    return result;
  }

  private async performCommit(id: string, fingerprint: string, revision: string, files: ProjectFile[], frames: SpriteFrame[]): Promise<Result<ProjectSnapshot, HostError>> {
    const snapshot = await this.project.inspect();
    if (snapshot.isErr()) return err(snapshot.error);
    if (snapshot.value.revision !== revision) return err(failure("Project changed while converting sprite source. Reload before applying", "conflict"));
    const read = await this.read(id);
    if (read.isErr()) return err(read.error);
    if (read.value.fingerprint !== fingerprint) return err(failure("Sprite source changed. Review the latest export before applying", "conflict"));
    const asset = read.value.asset;
    const stem = asset.nativePath.replace(/\.shapes$/i, "");
    const allowed = new Set([asset.nativePath, `${stem}.sprite.json`, `${stem}.palette.tga`]);
    if (!files.some((file) => file.path === asset.nativePath) || files.some((file) => !allowed.has(file.path))
      || new Set(files.map((file) => file.path)).size !== files.length)
      return err(failure("Sprite import can only update its native Shapes file and matching editor companions", "invalid"));
    const records = await this.list();
    if (records.isErr()) return err(records.error);
    const parsed = spriteAssetSchema.safeParse({ ...asset, source: { ...asset.source, fingerprint }, frames, importedAt: new Date().toISOString() });
    if (!parsed.success) return err(failure("Invalid imported sprite metadata", "invalid"));
    if (snapshot.value.folder !== this.project.folder()) return err(failure("Project changed while importing sprite source", "conflict"));
    const saved = await this.project.save(snapshot.value.revision, snapshot.value.manifest,
      [...files, jsonFile(SPRITE_REGISTRY, records.value.map((entry) => entry.id === id ? parsed.data : entry))], []);
    return saved;
  }
}
