import { err, ResultAsync } from "neverthrow";
import { z } from "zod";
import { AssetCache } from "./assetCache";
import { versionedAssetUrl, type AssetFailure } from "./assetState";

const bytes = new AssetCache<ArrayBuffer>((buffer) => buffer.byteLength);
const hostError = z.object({ code: z.string(), message: z.string() });

function failedResponse(response: Response, url: string): ResultAsync<never, AssetFailure> {
  return ResultAsync.fromPromise<unknown, AssetFailure>(response.json(), () => ({ code: "fetch", url, message: `Could not load ${url} (HTTP ${response.status})` }))
    .andThen((value) => {
      const parsed = hostError.safeParse(value);
      return err<never, AssetFailure>({ code: parsed.success ? parsed.data.code : "fetch", url,
        message: parsed.success ? parsed.data.message : `Could not load ${url} (HTTP ${response.status})` });
    });
}

export function fetchAsset(url: string): ResultAsync<ArrayBuffer, AssetFailure> {
  return bytes.get(url, () => ResultAsync.fromPromise(fetch(versionedAssetUrl(url), { cache: "no-store" }),
    (): AssetFailure => ({ code: "fetch", url, message: `Could not load ${url}. Check that the game data is still available.` }))
    .andThen((response) => {
      if (!response.ok) return failedResponse(response, url);
      if (response.headers.get("Content-Type")?.includes("text/html"))
        return err({ code: "invalid", url, message: `Expected game data but received a web page for ${url}` });
      return ResultAsync.fromPromise(response.arrayBuffer(), (): AssetFailure => ({ code: "read", url, message: `Could not read ${url}` }));
    }));
}
