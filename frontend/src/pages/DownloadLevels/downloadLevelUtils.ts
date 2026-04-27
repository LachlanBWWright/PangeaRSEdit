import { ResultAsync } from "neverthrow";
import { zip } from "fflate";
import { mapErr } from "@/utils/mapErr";
import type { Level } from "@/data/levels";

interface DownloadTarget {
  name: string;
  url: string;
}

/** Rejects a fetch response when the HTTP status is not successful. */
function ensureOkResponse(url: string, resp: Response): Promise<Response> {
  if (resp.ok) return Promise.resolve(resp);
  return Promise.reject(new Error(`HTTP ${resp.status}: ${url}`));
}

/** Fetches a remote file as bytes and normalizes fetch failures into ResultAsync. */
function fetchBytes(url: string): ResultAsync<Uint8Array<ArrayBuffer>, string> {
  return ResultAsync.fromPromise(
    fetch(url)
      .then((resp) => ensureOkResponse(url, resp))
      .then((resp) => resp.arrayBuffer().then((buf) => new Uint8Array(buf))),
    mapErr,
  );
}

/** Resolves or rejects the zip callback output in the shape expected by fflate. */
function onZipDone(
  error: Error | null,
  data: Uint8Array<ArrayBufferLike>,
  resolve: (value: Uint8Array<ArrayBuffer>) => void,
  reject: (reason: unknown) => void,
): void {
  if (error) {
    reject(error);
    return;
  }
  resolve(new Uint8Array(data));
}

/** Zips a file map using fflate and returns the resulting archive bytes. */
function zipAsync(
  files: Record<string, Uint8Array<ArrayBuffer>>,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip(files, (error, data) => onZipDone(error, data, resolve, reject));
  });
}

/** Wraps zipAsync in ResultAsync for consistent error handling. */
function zipFiles(
  files: Record<string, Uint8Array<ArrayBuffer>>,
): ResultAsync<Uint8Array<ArrayBuffer>, string> {
  return ResultAsync.fromPromise(zipAsync(files), mapErr);
}

/** Returns a compact timestamp string suitable for download filenames. */
function fileTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Builds the archive filename used for a level download. */
function createZipName(level: Level): string {
  const levelNumber = level.category?.replace(/\D/g, "") ?? level.id;
  return `${level.gameDisplayName} Level ${levelNumber} (${fileTimestamp()}).zip`.replace(
    /[/\\:*?"<>|]/g,
    "_",
  );
}

/** Collects every remote file that should be bundled into a level archive. */
function collectDownloadTargets(level: Level): DownloadTarget[] {
  const targets: DownloadTarget[] = [];

  if (level.terFile) {
    targets.push({
      name: level.terFile.split("/").pop() ?? `${level.id}.ter`,
      url: level.terFile,
    });
  }

  if (level.rsrcFile) {
    targets.push({
      name: level.rsrcFile.split("/").pop() ?? `${level.id}.ter.rsrc`,
      url: level.rsrcFile,
    });
  }

  return targets;
}

/** Fetches one file and preserves its output name for later zipping. */
function fetchNamedBytes(
  name: string,
  url: string,
): ResultAsync<{ name: string; data: Uint8Array<ArrayBuffer> }, string> {
  return fetchBytes(url).map((data) => ({ name, data }));
}

/** Converts fetched name/data pairs into the object shape expected by the zip library. */
function buildZipMap(
  pairs: { name: string; data: Uint8Array<ArrayBuffer> }[],
): Record<string, Uint8Array<ArrayBuffer>> {
  const files: Record<string, Uint8Array<ArrayBuffer>> = {};
  for (const { name, data } of pairs) {
    files[name] = data;
  }
  return files;
}

/** Downloads the remote level payloads and packages them into a zip archive. */
export function downloadLevelArchive(
  level: Level,
): ResultAsync<{ data: Uint8Array<ArrayBuffer>; zipName: string }, string> {
  const targets = collectDownloadTargets(level);
  if (targets.length === 0) {
    return ResultAsync.fromSafePromise(
      Promise.reject("No downloadable files found for this level"),
    );
  }

  const zipName = createZipName(level);
  const fetches = targets.map(({ name, url }) => fetchNamedBytes(name, url));

  return ResultAsync.combine(fetches)
    .andThen((pairs) => zipFiles(buildZipMap(pairs)))
    .map((data) => ({ data, zipName }));
}

/** Returns a null byte result for optional download inputs. */
function nullBytes(): ResultAsync<Uint8Array<ArrayBuffer> | null, string> {
  return ResultAsync.fromSafePromise<Uint8Array<ArrayBuffer> | null>(
    Promise.resolve(null),
  );
}

/** Fetches terrain and resource bytes for browser playback, allowing either side to be missing. */
export function fetchPlayBytes(
  terFile: string | undefined,
  rsrcFile: string | undefined,
): ResultAsync<
  [Uint8Array<ArrayBuffer> | null, Uint8Array<ArrayBuffer> | null],
  string
> {
  const terrainFetch = terFile ? fetchBytes(terFile) : nullBytes();
  const rsrcFetch = rsrcFile ? fetchBytes(rsrcFile) : nullBytes();
  return ResultAsync.combine([terrainFetch, rsrcFetch]);
}

/** Triggers a browser download for the given archive bytes and filename. */
export function triggerBrowserDownload(
  data: Uint8Array<ArrayBuffer>,
  zipName: string,
): void {
  const blob = new Blob([data], { type: "application/zip" });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
