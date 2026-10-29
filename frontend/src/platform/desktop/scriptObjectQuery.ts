import { ResultAsync } from "neverthrow";
import { scriptInspectorPageSchema } from "@pangea/desktop-contracts";
import type { ScriptObjectQuery } from "@/editor/utils/scriptInspector";
import { desktopRequest } from "./client";
import { useCallback } from "react";
import { scriptStatePageSchema, type ScriptStateQuery } from "@pangea/desktop-contracts";

export function useDesktopScriptStateQuery(runId: string | undefined) {
  return useCallback((query: ScriptStateQuery) => new ResultAsync(desktopRequest({ operation: "games.script-state", id: runId ?? "", ...query }, scriptStatePageSchema).then((result) => result.mapErr((error) => error.message))), [runId]);
}

export function useDesktopScriptObjectQuery(runId: string | undefined) {
  return useCallback((query: ScriptObjectQuery) => desktopScriptObjectQuery(runId ?? "", query), [runId]);
}

export function desktopScriptObjectQuery(runId: string, query: ScriptObjectQuery) {
  return new ResultAsync(desktopRequest({ operation: "games.script-objects", id: runId, ...query }, scriptInspectorPageSchema)
    .then((result) => result.mapErr((error) => error.message)));
}
