import { readFile } from "node:fs/promises";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import initTerrainCodecWasm, {
  wasm_parse_nanosaur1_level,
} from "../../../terrain-codec-rust/pkg/terrain_codec_rust.js";

const boundaryErrorSchema = z.object({ message: z.string() });
const observedItemSchema = z.object({
  type: z.number().int(),
  parm: z.tuple([
    z.number().int(),
    z.number().int(),
    z.number().int(),
    z.number().int(),
  ]),
});
const parsedLevelSchema = z.object({
  objectList: z.array(observedItemSchema),
});

export interface NanosaurObservedItem {
  readonly type: number;
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
}

let initialization: ResultAsync<void, string> | null = null;

function boundaryErrorMessage(error: unknown): string {
  const parsed = boundaryErrorSchema.safeParse(error);
  return parsed.success ? parsed.data.message : String(error);
}

function initializeTerrainCodec(): ResultAsync<void, string> {
  if (initialization !== null) {
    return initialization;
  }

  const wasmUrl = new URL(
    "../../../terrain-codec-rust/pkg/terrain_codec_rust_bg.wasm",
    import.meta.url,
  );
  const pendingInitialization = ResultAsync.fromPromise(
    readFile(wasmUrl),
    boundaryErrorMessage,
  )
    .andThen((wasmBytes) =>
      ResultAsync.fromPromise(
        initTerrainCodecWasm({ module_or_path: wasmBytes }),
        boundaryErrorMessage,
      ),
    )
    .map(() => undefined);
  initialization = pendingInitialization;
  return pendingInitialization;
}

export async function parseNanosaurObservedItems(
  levelBytes: ArrayBuffer,
): Promise<Result<readonly NanosaurObservedItem[], string>> {
  const initialized = await initializeTerrainCodec();
  if (initialized.isErr()) {
    return err(`Nanosaur Rust codec unavailable: ${initialized.error}`);
  }

  const parseResult = Result.fromThrowable(
    (): unknown => wasm_parse_nanosaur1_level(new Uint8Array(levelBytes)),
    boundaryErrorMessage,
  )();
  if (parseResult.isErr()) {
    return err(`Failed to parse Nanosaur 1 level: ${parseResult.error}`);
  }

  const parsed = parsedLevelSchema.safeParse(parseResult.value);
  if (!parsed.success) {
    return err(`Nanosaur parser returned invalid data: ${parsed.error.message}`);
  }

  return ok(
    parsed.data.objectList.map((item) => ({
      type: item.type,
      p0: item.parm[0],
      p1: item.parm[1],
      p2: item.parm[2],
      p3: item.parm[3],
    })),
  );
}
