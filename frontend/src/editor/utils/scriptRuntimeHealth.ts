import type { PangeaScriptStatusJS } from "./scriptRuntimeStatus";

interface RuntimeHealth {
  kind: "waiting" | "inactive" | "disabled" | "failed" | "unverified" | "recovered" | "passed";
  title: string;
  detail: string;
}

export function scriptingRuntimeHealth(status: PangeaScriptStatusJS | null, previewError: string | null): RuntimeHealth {
  if (previewError?.trim() || status?.lastError.trim()) return {
    kind: "failed", title: "Runtime check failed",
    detail: status?.bundleLoaded ? "A bundle remains loaded, but the latest operation failed. Fix the reported error and reload before checking again." : "Fix the reported error and reload the game.",
  };
  if (!status) return { kind: "waiting", title: "Waiting for runtime status", detail: "Launch the game and wait for the scripting host to initialize." };
  if (status.scriptsDisabled) return { kind: "disabled", title: "Scripts disabled", detail: "The host stopped script execution. Fix the errors and reload the game." };
  if (!status.enabled) return { kind: "inactive", title: "Scripting host inactive", detail: "Script execution has not been verified in this runtime." };
  if (!status.statusComplete) return { kind: "unverified", title: "Runtime status incomplete", detail: "This runtime did not provide all required status fields. A smoke check cannot be confirmed." };
  if (!status.configLoaded || !status.bundleLoaded) return { kind: "unverified", title: "Script loading incomplete", detail: "The runtime must load both the script config and bundle before checking execution." };
  if (status.hooksCalledCount <= 0) return { kind: "waiting", title: "Waiting for hook dispatch", detail: "The bundle is loaded. The host must dispatch a hook before its smoke check can pass." };
  if (status.errorCount > 0 || status.budgetExceededCount > 0) return {
    kind: "recovered", title: "Running after earlier errors",
    detail: "The host is active and has dispatched hooks without a current error. Session counters retain earlier counted runtime errors; reload the game for a clean smoke check.",
  };
  return { kind: "passed", title: "Runtime smoke check passed", detail: "The host is active, the config and bundle loaded, and hooks were dispatched without reported errors or budget overruns. This does not confirm that an object behavior ran. Verify gameplay behavior in the game." };
}
