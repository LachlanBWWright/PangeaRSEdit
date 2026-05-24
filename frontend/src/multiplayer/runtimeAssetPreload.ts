import { ResultAsync, okAsync } from "neverthrow";
import { buildPreviewAssetBaseUrls } from "@/editor/utils/gamePreviewRuntime";
import type { GamePortConfig } from "@/editor/utils/gamePortConfig";

const PRELOAD_DEPENDENCY_PATTERN =
  /["'`]([^"'`]+\.(?:wasm|data|mem|worker\.js))["'`]/g;

export async function preloadGameRuntimeAssets(
  config: GamePortConfig,
): Promise<void> {
  const baseUrl = buildPreviewAssetBaseUrls(config)[0];
  if (!baseUrl) {
    return;
  }

  const scriptUrl = new URL(config.mainJs, baseUrl).href;
  const preloadUrls = new Set<string>([scriptUrl]);

  const scriptResponseResult = await ResultAsync.fromPromise(
    fetch(scriptUrl, {
      credentials: "same-origin",
      cache: "force-cache",
    }),
    () => null,
  );
  if (scriptResponseResult.isOk() && scriptResponseResult.value.ok) {
    const scriptTextResult = await ResultAsync.fromPromise(
      scriptResponseResult.value.text(),
      () => null,
    );
    if (scriptTextResult.isOk()) {
      const matches = scriptTextResult.value.matchAll(
        PRELOAD_DEPENDENCY_PATTERN,
      );
      for (const match of matches) {
        const dependencyPath = match[1];
        if (!dependencyPath) {
          continue;
        }
        preloadUrls.add(new URL(dependencyPath, baseUrl).href);
      }
    }
  }

  await Promise.all(
    Array.from(preloadUrls).map((url) =>
      ResultAsync.fromPromise(
        fetch(url, {
          credentials: "same-origin",
          cache: "force-cache",
        }),
        () => null,
      )
        .map(() => undefined)
        .orElse(() => okAsync(undefined)),
    ),
  );
}
