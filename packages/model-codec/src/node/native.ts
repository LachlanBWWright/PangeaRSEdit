import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { err, errAsync, ok, okAsync, type Result, type ResultAsync } from "neverthrow";
import { parseBG3D, type BG3DParseResult } from "../modelParsers/parseBG3D";
import { parse3DMF } from "../modelParsers/parse3dmf";
import { parseBG3DWithSkeletonResource } from "../modelParsers/bg3dWithSkeleton";
import { parseSkeletonRsrcResult } from "../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { convertBG3DTextureToPngResult } from "../modelParsers/materialConversion";
import { copyArrayBuffer, external } from "./boundaries";

export type NativeFormat = "bg3d" | "3dmf";
export interface NativeAsset { readonly parsed: BG3DParseResult; readonly format: NativeFormat; readonly inputs: readonly string[]; }
export interface NativeInputOptions { readonly model?: string; readonly skeleton?: string; }

export function nativeFormat(path: string): NativeFormat | null {
  const extension = extname(path).toLowerCase();
  if (extension === ".bg3d") return "bg3d";
  return extension === ".3dmf" || extension === ".3df" ? "3dmf" : null;
}

export function isSkeletonPath(path: string): boolean { return /\.(?:skeleton(?:\.rsrc)?|rsrc)$/i.test(path); }

function findCompanion(path: string, names: readonly string[]): ResultAsync<string | null, string> {
  const expected = names.map((name) => name.toLowerCase());
  return external(() => readdir(dirname(path), { withFileTypes: true })).andThen((entries) => {
    const matches = entries.filter((entry) => entry.isFile() && expected.includes(entry.name.toLowerCase()));
    if (matches.length > 1) return err(`Ambiguous companions for ${path}: ${matches.map((entry) => entry.name).join(", ")}. Select --model or --skeleton explicitly.`);
    return ok(matches[0] ? join(dirname(path), matches[0].name) : null);
  });
}

function resolvePair(input: string, options: NativeInputOptions): ResultAsync<{ model: string; skeleton: string | null }, string> {
  if (isSkeletonPath(input)) {
    if (options.skeleton) return errAsync("Input is already a skeleton; use --model for its geometry companion.");
    if (options.model) return okAsync({ model: options.model, skeleton: input });
    const stem = basename(input).replace(/\.(?:skeleton(?:\.rsrc)?|rsrc)$/i, "");
    return findCompanion(input, [`${stem}.bg3d`, `${stem}.3dmf`, `${stem}.3df`]).andThen((model) => model ? ok({ model, skeleton: input }) : err("No geometry companion found. Supply --model <file>."));
  }
  if (options.model) return errAsync("--model applies only when the input is a skeleton resource.");
  if (options.skeleton) return okAsync({ model: input, skeleton: options.skeleton });
  const stem = basename(input, extname(input));
  return findCompanion(input, [`${stem}.skeleton.rsrc`, `${stem}.skeleton`]).map((skeleton) => ({ model: input, skeleton }));
}

function validateTextures(parsed: BG3DParseResult): Result<BG3DParseResult, string> {
  for (const material of parsed.materials) {
    for (const texture of material.textures) {
      const converted = convertBG3DTextureToPngResult(texture);
      if (converted.isErr()) return err(converted.error);
    }
  }
  return ok(parsed);
}

export function readNativeAsset(input: string, options: NativeInputOptions = {}): ResultAsync<NativeAsset, string> {
  return resolvePair(input, options).andThen((pair) => {
    const format = nativeFormat(pair.model);
    if (!format) return errAsync("Geometry companion must be .bg3d, .3dmf or .3df.");
    return external(() => readFile(pair.model)).andThen((bytes) => {
      const buffer = copyArrayBuffer(bytes);
      const parsed: ResultAsync<BG3DParseResult, string> = pair.skeleton
        ? external(() => readFile(pair.skeleton ?? "")).andThen((skeletonBytes) => parseSkeletonRsrcResult(copyArrayBuffer(skeletonBytes))).andThen((resource) => parseBG3DWithSkeletonResource(buffer, resource))
        : okAsync(buffer).andThen((data) => format === "bg3d" ? parseBG3D(data) : parse3DMF(data));
      return parsed.andThen(validateTextures).map((model) => ({ parsed: model, format, inputs: pair.skeleton ? [pair.model, pair.skeleton] : [pair.model] }));
    });
  });
}
