import initTerrainCodecWasm, {
  wasm_compile_nanosaur1_level,
  wasm_parse_nanosaur1_level,
} from "../../../../terrain-codec-rust/pkg/terrain_codec_rust.js";
import terrainCodecWasmUrl from "../../../../terrain-codec-rust/pkg/terrain_codec_rust_bg.wasm?url";
import { ResultAsync, err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import { isRecord } from "@/editor/loadLogic/typeGuards";

const terrainCodecBoundaryErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const nanosaurHeaderSchema = z.object({
  textureLayerOffset: z.number().int(),
  heightmapLayerOffset: z.number().int(),
  pathLayerOffset: z.number().int(),
  objectListOffset: z.number().int(),
  unknown1: z.number().int(),
  heightmapTilesOffset: z.number().int(),
  unknown2: z.number().int(),
  width: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  textureAttribOffset: z.number().int(),
  tileAnimDataOffset: z.number().int(),
});

const nanosaurObjectSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  type: z.number().int().nonnegative(),
  parm: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
  ]),
  flags: z.number().int().nonnegative(),
  prevItemIdx: z.number().int(),
  nextItemIdx: z.number().int(),
});

const nanosaurAttribSchema = z.object({
  bits: z.number().int().nonnegative(),
  parm0: z.number().int(),
  parm1: z.number().int().nonnegative(),
  parm2: z.number().int().nonnegative(),
  undefined: z.number().int(),
});

const rustByteValueSchema = z.number().int().min(0).max(255);

const rustByteArraySchema = z
  .instanceof(Uint8Array)
  .or(
    z.array(rustByteValueSchema).transform((values) => Uint8Array.from(values)),
  );

const nanosaurParsedSchema = z.object({
  header: nanosaurHeaderSchema,
  textureLayer: z.array(z.number().int().nonnegative()),
  heightmapLayer: z.array(z.number().int().nonnegative()).nullable(),
  pathLayer: z.array(z.number().int().nonnegative()).nullable(),
  objectList: z.array(nanosaurObjectSchema),
  textureAttributes: z.array(nanosaurAttribSchema),
  heightmapTiles: z.array(rustByteArraySchema).nullish(),
  heightmapPadding: rustByteArraySchema.nullish(),
  tileAnimData: rustByteArraySchema.nullish(),
});

const encodedBytesSchema = z.object({
  bytes: rustByteArraySchema,
});

let initPromise: Promise<void> | null = null;

function cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer));
  return copy;
}

function cloneUint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function ensureInitialized(): Promise<Result<void, string>> {
  if (!initPromise) {
    initPromise = initTerrainCodecWasm({
      module_or_path: terrainCodecWasmUrl,
    }).then(() => undefined);
  }
  const initialized = await ResultAsync.fromPromise(initPromise, (error) => {
    const parsed = terrainCodecBoundaryErrorSchema.safeParse(error);
    return parsed.success ? parsed.data.message : String(error);
  });
  if (initialized.isErr()) {
    return err(`Nanosaur Rust codec unavailable: ${initialized.error}`);
  }
  return ok(undefined);
}

function mapRustCallError(error: unknown): string {
  const parsed = terrainCodecBoundaryErrorSchema.safeParse(error);
  if (parsed.success) {
    return parsed.data.message;
  }
  return String(error);
}

export async function parseNanosaur1LevelWithRust(
  levelBytes: ArrayBuffer,
): Promise<Result<Nanosaur1LevelData, string>> {
  const initialized = await ensureInitialized();
  if (initialized.isErr()) {
    return err(initialized.error);
  }

  const parseResult = ResultAsync.fromPromise(
    Promise.resolve(wasm_parse_nanosaur1_level(new Uint8Array(levelBytes))),
    mapRustCallError,
  );
  const resolved = await parseResult;
  if (resolved.isErr()) {
    return err(`Failed to parse Nanosaur 1 level in Rust: ${resolved.error}`);
  }

  const parsed = nanosaurParsedSchema.safeParse(resolved.value);
  if (!parsed.success) {
    return err(`Rust parser returned invalid payload: ${parsed.error.message}`);
  }

  return ok({
    header: parsed.data.header,
    textureLayer: parsed.data.textureLayer,
    heightmapLayer: parsed.data.heightmapLayer,
    pathLayer: parsed.data.pathLayer,
    objectList: parsed.data.objectList,
    textureAttributes: parsed.data.textureAttributes,
    heightmapTiles: parsed.data.heightmapTiles,
    heightmapPadding: parsed.data.heightmapPadding,
    tileAnimData: parsed.data.tileAnimData,
  });
}

function levelDataToRustCompilePayload(levelData: LevelData): {
  readonly textureLayer?: number[];
  readonly objectList?: {
    readonly x: number;
    readonly y: number;
    readonly type: number;
    readonly parm: [number, number, number, number];
    readonly flags: number;
    readonly prevItemIdx: number;
    readonly nextItemIdx: number;
  }[];
  readonly textureAttributes?: {
    readonly bits: number;
    readonly parm0: number;
    readonly parm1: number;
    readonly parm2: number;
    readonly undefined: number;
  }[];
} {
  const editorLayer = levelData.Layr?.[1000]?.obj;
  const textureLayer = Array.isArray(editorLayer)
    ? editorLayer
        .map((value) => (typeof value === "number" ? value : null))
        .filter((value): value is number => value !== null)
    : undefined;

  const editorItems = levelData.Itms?.[1000]?.obj;
  const objectList = Array.isArray(editorItems)
    ? editorItems
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }
          const x = typeof item.x === "number" ? item.x : null;
          const y = typeof item.z === "number" ? item.z : null;
          const type = typeof item.type === "number" ? item.type : null;
          const p0 = typeof item.p0 === "number" ? item.p0 : 0;
          const p1 = typeof item.p1 === "number" ? item.p1 : 0;
          const p2 = typeof item.p2 === "number" ? item.p2 : 0;
          const p3 = typeof item.p3 === "number" ? item.p3 : 0;
          const flags = typeof item.flags === "number" ? item.flags : 0;
          const prevItemIdx =
            typeof item.prevItemIdx === "number" ? item.prevItemIdx : 0;
          const nextItemIdx =
            typeof item.nextItemIdx === "number" ? item.nextItemIdx : 0;
          if (x === null || y === null || type === null) {
            return null;
          }
          const parm: [number, number, number, number] = [p0, p1, p2, p3];
          return {
            x,
            y,
            type,
            parm,
            flags,
            prevItemIdx,
            nextItemIdx,
          };
        })
        .filter(
          (
            value,
          ): value is {
            x: number;
            y: number;
            type: number;
            parm: [number, number, number, number];
            flags: number;
            prevItemIdx: number;
            nextItemIdx: number;
          } => value !== null,
        )
    : undefined;

  const editorAttribs = levelData.Atrb?.[1000]?.obj;
  const textureAttributes = Array.isArray(editorAttribs)
    ? editorAttribs
        .map((attrib) => {
          if (!isRecord(attrib)) {
            return null;
          }
          const bits = typeof attrib.bits === "number" ? attrib.bits : null;
          const parm0 = typeof attrib.parm0 === "number" ? attrib.parm0 : null;
          const parm1 = typeof attrib.parm1 === "number" ? attrib.parm1 : null;
          const parm2 = typeof attrib.parm2 === "number" ? attrib.parm2 : null;
          const undefinedValue =
            typeof attrib.undefined === "number" ? attrib.undefined : null;
          if (
            bits === null ||
            parm0 === null ||
            parm1 === null ||
            parm2 === null ||
            undefinedValue === null
          ) {
            return null;
          }
          return {
            bits,
            parm0,
            parm1,
            parm2,
            undefined: undefinedValue,
          };
        })
        .filter(
          (
            value,
          ): value is {
            bits: number;
            parm0: number;
            parm1: number;
            parm2: number;
            undefined: number;
          } => value !== null,
        )
    : undefined;

  return {
    textureLayer,
    objectList,
    textureAttributes,
  };
}

export async function compileNanosaur1LevelWithRust(
  levelData: LevelData,
  rawLevelBytes: ArrayBuffer,
): Promise<Result<ArrayBuffer, string>> {
  const initialized = await ensureInitialized();
  if (initialized.isErr()) {
    return err(initialized.error);
  }

  const edits = levelDataToRustCompilePayload(levelData);
  const compileResult = await ResultAsync.fromPromise(
    Promise.resolve(
      wasm_compile_nanosaur1_level(new Uint8Array(rawLevelBytes), edits),
    ),
    mapRustCallError,
  );
  if (compileResult.isErr()) {
    return err(
      `Failed to compile Nanosaur 1 level in Rust: ${compileResult.error}`,
    );
  }

  const parsed = encodedBytesSchema.safeParse(compileResult.value);
  if (!parsed.success) {
    return err(
      `Rust compiler returned invalid payload: ${parsed.error.message}`,
    );
  }

  return ok(cloneUint8ArrayToArrayBuffer(parsed.data.bytes));
}

export function cloneRawNanosaurBytes(rawBytes: ArrayBuffer): ArrayBuffer {
  return cloneArrayBuffer(rawBytes);
}
