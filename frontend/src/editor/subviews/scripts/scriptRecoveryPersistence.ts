import { err, errAsync, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { scriptBehaviorDefinitionSchema, scriptCustomObjectDefinitionSchema, scriptDiagnosticSchema, scriptHookIdSchema, scriptLevelStateSchema, scriptParameterDefinitionSchema, scriptTagDefinitionSchema, type ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export type ScriptRecoveryWorkspaceStore = Readonly<Record<string, ScriptWorkspaceState>>;
const sourceSchema = z.object({ path: z.string(), content: z.string(), savedContent: z.string(), language: z.literal("lua"), readOnly: z.boolean(), role: z.enum(["generated-entry", "generated-assignment", "user"]), ownerId: z.string().optional() });
const assetBytesSchema = z.preprocess(
  (value) => ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : value,
  z.instanceof(Uint8Array),
);
const stateSchema = z.object({
  projectVersion: z.literal(1),
  context: z.object({ gameId: z.string(), gameLabel: z.string(), levelNumber: z.number().nullable(), levelKey: z.string(), supportedHooks: z.array(scriptHookIdSchema), allowedTags: z.array(scriptTagDefinitionSchema) }),
  activeFilePath: z.string(), behaviorCatalog: z.array(scriptBehaviorDefinitionSchema), moduleOrder: z.array(z.string()), sourceFiles: z.record(z.string(), sourceSchema),
  compiledFiles: z.record(z.string(), z.object({ path: z.string(), content: z.string(), sourcePath: z.string() })),
  customObjects: z.array(scriptCustomObjectDefinitionSchema), params: z.array(scriptParameterDefinitionSchema),
  assets: z.record(z.string(), z.object({ path: z.string(), bytes: assetBytesSchema, sourceName: z.string() })),
  diagnostics: z.array(scriptDiagnosticSchema), statusLog: z.array(z.string()), sampleId: z.string().nullable(), levels: z.record(z.string(), scriptLevelStateSchema),
});
export const scriptRecoverySnapshotSchema = z.object({ version: z.literal(1), savedAt: z.number().finite(), workspaces: z.record(z.string(), stateSchema) });

function storageError(reason: unknown, fallback: string): string {
  const parsed = z.string().min(1).safeParse(reason);
  return parsed.success ? parsed.data : fallback;
}

function openRecoveryDatabase(): ResultAsync<IDBDatabase, string> {
  if (!globalThis.indexedDB) return errAsync("Browser recovery storage is unavailable.");
  const opened = Result.fromThrowable(() => new Promise<IDBDatabase>((resolve, reject) => {
    let failed = false;
    const request = indexedDB.open("pangearsedit-script-workspaces", 1);
    const fail = (message: string) => { failed = true; reject(message); };
    request.onupgradeneeded = () => {
      const upgrade = Result.fromThrowable(() => request.result.createObjectStore("snapshots"), () => "Could not prepare local script storage.")();
      if (upgrade.isErr()) fail(upgrade.error);
    };
    request.onsuccess = () => {
      if (failed) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => fail("Could not open local script storage.");
    request.onblocked = () => fail("Local script storage is blocked by another tab.");
  }), () => "Could not open local script storage.")();
  return opened.asyncAndThen((promise) => ResultAsync.fromPromise(promise, (reason) => storageError(reason, "Could not open local script storage.")));
}

function readSnapshot(database: IDBDatabase): ResultAsync<unknown, string> {
  const requested = Result.fromThrowable(() => new Promise<unknown>((resolve, reject) => {
    let value: unknown;
    const transaction = database.transaction("snapshots", "readonly");
    const read = transaction.objectStore("snapshots").get("current");
    read.onsuccess = () => { value = read.result; };
    transaction.oncomplete = () => { database.close(); resolve(value); };
    transaction.onabort = () => { database.close(); reject("Could not read recovered scripts."); };
    transaction.onerror = transaction.onabort;
  }), () => "Could not read recovered scripts.")();
  if (requested.isErr()) { database.close(); return errAsync(requested.error); }
  return ResultAsync.fromPromise(requested.value, () => { database.close(); return "Could not read recovered scripts."; });
}

export function readRecoveredScripts(): ResultAsync<ScriptRecoveryWorkspaceStore, string> {
  return openRecoveryDatabase().andThen(readSnapshot).andThen((value) => {
    if (value === undefined) return ok({});
    const parsed = scriptRecoverySnapshotSchema.safeParse(value);
    return parsed.success ? ok(parsed.data.workspaces) : err("Saved scripts could not be validated. Existing recovery data has been preserved.");
  });
}

function writeSnapshot(database: IDBDatabase, snapshot: z.infer<typeof scriptRecoverySnapshotSchema>): ResultAsync<void, string> {
  const message = "Could not save script recovery data. Download a script package backup.";
  const written = Result.fromThrowable(() => new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("snapshots", "readwrite", { durability: "strict" });
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(message); };
    transaction.onabort = transaction.onerror;
    transaction.objectStore("snapshots").put(snapshot, "current");
  }), () => message)();
  if (written.isErr()) { database.close(); return errAsync(written.error); }
  return ResultAsync.fromPromise(written.value, () => { database.close(); return message; });
}

export function saveRecoveredScripts(workspaces: ScriptRecoveryWorkspaceStore): ResultAsync<void, string> {
  const parsed = scriptRecoverySnapshotSchema.safeParse({ version: 1, savedAt: Date.now(), workspaces });
  if (!parsed.success) return errAsync("Scripts could not be validated for recovery. Existing recovery data has been preserved.");
  return openRecoveryDatabase().andThen((database) => writeSnapshot(database, parsed.data));
}
