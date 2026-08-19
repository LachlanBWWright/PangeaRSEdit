import { err, ok, type Result } from "neverthrow";
import type { GamePortConfig } from "@/editor/utils/gamePortConfig";
import { buildPreviewAssetBaseUrls } from "@/editor/utils/gamePreviewRuntime";

const PRELOAD_DEPENDENCY_PATTERN =
  /["'`]([^"'`]+\.(?:wasm|data|mem|worker\.js))["'`]/g;
const SCRIPT_FETCH_TIMEOUT_MS = 15_000;
const DEPENDENCY_FETCH_TIMEOUT_MS = 120_000;

const REQUIRED_EXPORTS = [
  "PangeaGame_SetNetworkMatchConfig",
  "PangeaGame_StartNetworkMatch",
  "PangeaGame_DebugGetLocalPlayerIndex",
  "PangeaGame_DebugGetPlayerCount",
  "PangeaGame_DebugIsNetworkMatchRunning",
] as const;

export interface RuntimePreflightReport {
  readonly gameId: string;
  readonly trackOrLevel: string;
  readonly assetUrlsChecked: readonly string[];
  readonly jsFetched: boolean;
  readonly wasmFetched: boolean;
  readonly dataFetched: boolean;
  readonly runtimeInitialized: boolean;
  readonly requiredExportsPresent: readonly string[];
  readonly elapsedMilliseconds: number;
}

export interface RuntimePreflightError {
  readonly code:
    | "preflight.unsupported"
    | "preflight.asset-missing"
    | "preflight.export-missing";
  readonly message: string;
}

export interface RuntimePreflightProgress {
  readonly title: string;
  readonly description?: string;
  readonly current: number;
  readonly completed: number;
}

function toAssetPath(url: string): string {
  const parsed = new URL(url, window.location.origin);
  return parsed.pathname.toLowerCase();
}

function hasRequiredExports(
  source: string,
): Result<readonly string[], RuntimePreflightError> {
  const missing = REQUIRED_EXPORTS.filter(
    (exportName) => !source.includes(exportName),
  );
  if (missing.length > 0) {
    return err({
      code: "preflight.export-missing",
      message: `Missing required runtime exports: ${missing.join(", ")}`,
    });
  }

  return ok(REQUIRED_EXPORTS);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response | null> {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "force-cache",
    signal: abortController.signal,
  }).catch(() => null);

  window.clearTimeout(timeoutId);
  return response;
}

export async function runRuntimePreflight(input: {
  readonly config: GamePortConfig;
  readonly gameId: string;
  readonly trackOrLevel: string;
  readonly onProgress?: (progress: RuntimePreflightProgress) => void;
}): Promise<Result<RuntimePreflightReport, RuntimePreflightError>> {
  const startedAt = performance.now();
  const baseUrl = buildPreviewAssetBaseUrls(input.config)[0];
  if (!baseUrl) {
    return err({
      code: "preflight.unsupported",
      message: "No runtime asset base URL configured for selected game.",
    });
  }

  const scriptUrl = new URL(input.config.mainJs, baseUrl).href;
  input.onProgress?.({
    title: "Preloading game runtime...",
    description: input.config.mainJs,
    current: 0,
    completed: 3,
  });
  const scriptResponse = await fetchWithTimeout(
    scriptUrl,
    SCRIPT_FETCH_TIMEOUT_MS,
  );
  if (!scriptResponse || !scriptResponse.ok) {
    return err({
      code: "preflight.asset-missing",
      message: `Runtime script missing: ${scriptUrl}`,
    });
  }

  const scriptText = await scriptResponse.text().catch(() => "");
  input.onProgress?.({
    title: "Validating game runtime...",
    description: input.config.mainJs,
    current: 1,
    completed: 3,
  });
  const exportsResult = hasRequiredExports(scriptText);
  if (exportsResult.isErr()) {
    return err(exportsResult.error);
  }

  const preloadUrls = new Set<string>([scriptUrl]);
  const matches = scriptText.matchAll(PRELOAD_DEPENDENCY_PATTERN);
  for (const match of matches) {
    const dependencyPath = match[1];
    if (!dependencyPath) {
      continue;
    }
    preloadUrls.add(new URL(dependencyPath, baseUrl).href);
  }

  const assetUrls = Array.from(preloadUrls);
  const completedProgress = assetUrls.length + 2;
  input.onProgress?.({
    title: "Checking runtime assets...",
    description: `${String(assetUrls.length)} assets`,
    current: 2,
    completed: completedProgress,
  });

  let wasmFetched = false;
  let dataFetched = false;
  for (const [index, url] of assetUrls.entries()) {
    input.onProgress?.({
      title: "Checking runtime assets...",
      description: toAssetPath(url),
      current: 2 + index,
      completed: completedProgress,
    });
    const response = await fetchWithTimeout(
      url,
      DEPENDENCY_FETCH_TIMEOUT_MS,
    );
    if (!response || !response.ok) {
      return err({
        code: "preflight.asset-missing",
        message: `Runtime asset missing: ${url}`,
      });
    }
    const payload = await response.arrayBuffer().catch(() => null);
    if (!payload) {
      return err({
        code: "preflight.asset-missing",
        message: `Runtime asset failed to load: ${url}`,
      });
    }
    const path = toAssetPath(url);
    if (path.endsWith(".wasm")) {
      wasmFetched = true;
    }
    if (path.endsWith(".data")) {
      dataFetched = true;
    }
    input.onProgress?.({
      title: "Checking runtime assets...",
      description: toAssetPath(url),
      current: 3 + index,
      completed: completedProgress,
    });
  }

  return ok({
    gameId: input.gameId,
    trackOrLevel: input.trackOrLevel,
    assetUrlsChecked: assetUrls,
    jsFetched: true,
    wasmFetched,
    dataFetched,
    runtimeInitialized: false,
    requiredExportsPresent: exportsResult.value,
    elapsedMilliseconds: Math.round(performance.now() - startedAt),
  });
}
