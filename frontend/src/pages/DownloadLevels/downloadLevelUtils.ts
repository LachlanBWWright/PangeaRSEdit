import { ResultAsync } from "neverthrow";
import { zip } from "fflate";
import { mapErr } from "@/utils/mapErr";
import type { Level } from "@/data/levels";

interface DownloadTarget {
  name: string;
  url: string;
}

function fetchBytes(url: string): ResultAsync<Uint8Array<ArrayBuffer>, Error> {
  return ResultAsync.fromPromise(
    fetch(url).then((resp) => {
      if (!resp.ok) {
        return Promise.reject(new Error(`HTTP ${resp.status}: ${url}`));
      }
      return resp.arrayBuffer().then((buf) => new Uint8Array(buf));
    }),
    mapErr,
  );
}

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

function zipAsync(
  files: Record<string, Uint8Array<ArrayBuffer>>,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip(files, (error, data) => onZipDone(error, data, resolve, reject));
  });
}

function zipFiles(
  files: Record<string, Uint8Array<ArrayBuffer>>,
): ResultAsync<Uint8Array<ArrayBuffer>, Error> {
  return ResultAsync.fromPromise(zipAsync(files), mapErr);
}

function fileTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function createZipName(level: Level): string {
  const levelNumber = level.category?.replace(/\D/g, "") ?? level.id;
  return `${level.gameDisplayName} Level ${levelNumber} (${fileTimestamp()}).zip`.replace(
    /[/\\:*?"<>|]/g,
    "_",
  );
}

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

function fetchNamedBytes(
  name: string,
  url: string,
): ResultAsync<{ name: string; data: Uint8Array<ArrayBuffer> }, Error> {
  return fetchBytes(url).map((data) => ({ name, data }));
}

function buildZipMap(
  pairs: { name: string; data: Uint8Array<ArrayBuffer> }[],
): Record<string, Uint8Array<ArrayBuffer>> {
  const files: Record<string, Uint8Array<ArrayBuffer>> = {};
  for (const { name, data } of pairs) {
    files[name] = data;
  }
  return files;
}

export function downloadLevelArchive(
  level: Level,
): ResultAsync<{ data: Uint8Array<ArrayBuffer>; zipName: string }, Error> {
  const targets = collectDownloadTargets(level);
  if (targets.length === 0) {
    return ResultAsync.fromSafePromise(
      Promise.reject(new Error("No downloadable files found for this level")),
    );
  }

  const zipName = createZipName(level);
  const fetches = targets.map(({ name, url }) => fetchNamedBytes(name, url));

  return ResultAsync.combine(fetches)
    .andThen((pairs) => zipFiles(buildZipMap(pairs)))
    .map((data) => ({ data, zipName }));
}

function nullBytes(): ResultAsync<Uint8Array<ArrayBuffer> | null, Error> {
  return ResultAsync.fromSafePromise<Uint8Array<ArrayBuffer> | null>(
    Promise.resolve(null),
  );
}

export function fetchPlayBytes(
  terFile: string | undefined,
  rsrcFile: string | undefined,
): ResultAsync<
  [Uint8Array<ArrayBuffer> | null, Uint8Array<ArrayBuffer> | null],
  Error
> {
  const terrainFetch = terFile ? fetchBytes(terFile) : nullBytes();
  const rsrcFetch = rsrcFile ? fetchBytes(rsrcFile) : nullBytes();
  return ResultAsync.combine([terrainFetch, rsrcFetch]);
}

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
