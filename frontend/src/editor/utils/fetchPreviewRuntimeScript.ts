import { errAsync, ResultAsync } from "neverthrow";
import { mapErr } from "../../utils/mapErr";

export async function fetchPreviewRuntimeScript(scriptUrl: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  const result = await ResultAsync.fromPromise(
    fetch(scriptUrl, {
      credentials: "same-origin",
      signal: controller.signal,
    }),
    mapErr,
  ).andThen((response) =>
    response.ok
      ? ResultAsync.fromPromise(response.text(), mapErr)
      : errAsync(`HTTP ${String(response.status)}`),
  );
  window.clearTimeout(timeout);
  return result.mapErr((message) =>
    controller.signal.aborted
      ? `Timed out downloading runtime script: ${scriptUrl}`
      : `Failed to load ${scriptUrl}: ${message}`,
  );
}
