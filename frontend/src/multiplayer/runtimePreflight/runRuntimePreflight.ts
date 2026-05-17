import { err, ok, type Result } from "neverthrow";
import type { GamePortConfig } from "@/editor/utils/gamePortConfig";
import { buildPreviewAssetBaseUrls } from "@/editor/utils/gamePreviewRuntime";

const PRELOAD_DEPENDENCY_PATTERN =
  /["'`]([^"'`]+\.(?:wasm|data|mem|worker\.js))["'`]/g;
const SCRIPT_FETCH_TIMEOUT_MS = 15_000;
const DEPENDENCY_FETCH_TIMEOUT_MS = 60_000;

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

  let wasmFetched = false;
  let dataFetched = false;
  for (const url of preloadUrls) {
    const response = await fetchWithTimeout(url, DEPENDENCY_FETCH_TIMEOUT_MS);
    if (!response || !response.ok) {
      return err({
        code: "preflight.asset-missing",
        message: `Runtime asset missing: ${url}`,
      });
    }
    const path = toAssetPath(url);
    if (path.endsWith(".wasm")) {
      wasmFetched = true;
    }
    if (path.endsWith(".data")) {
      dataFetched = true;
    }
  }

  return ok({
    gameId: input.gameId,
    trackOrLevel: input.trackOrLevel,
    assetUrlsChecked: Array.from(preloadUrls),
    jsFetched: true,
    wasmFetched,
    dataFetched,
    runtimeInitialized: false,
    requiredExportsPresent: exportsResult.value,
    elapsedMilliseconds: Math.round(performance.now() - startedAt),
  });
}
