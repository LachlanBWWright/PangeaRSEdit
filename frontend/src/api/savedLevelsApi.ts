import { Result, err, ok, type Result as ResultType } from "neverthrow";
import { buildApiPath } from "./apiBase";
import { mapErr } from "@/utils/mapErr";
import {
  SavedLevelDetailSchema,
  SavedLevelListSchema,
  type SavedLevelDetail,
  type SavedLevelSummary,
} from "./apiSchemas";

export interface SavedLevelsApiError {
  code: string;
  message: string;
  status: number;
}

export interface CreateSavedLevelInput {
  gameName: string;
  levelId: string;
  displayName: string;
  payload: unknown;
  sourceFileMetadata?: {
    fileName?: string;
    fileSize?: number;
    sha256?: string;
  };
}

export interface UpdateSavedLevelInput {
  displayName?: string;
  payload?: unknown;
}

const BASE = buildApiPath("/api/saved-levels");

/** Performs a JSON fetch against the saved-levels API and normalizes network failures. */
async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<
  Result<
    { readonly status: number; readonly data: unknown },
    SavedLevelsApiError
  >
> {
  return fetch(input, init)
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as Record<string, unknown>)["message"])
            : "Saved levels request failed.";
        return err<
          { readonly status: number; readonly data: unknown },
          SavedLevelsApiError
        >({
          code: "api.error",
          message,
          status: response.status,
        });
      }
      return ok({ status: response.status, data });
    })
    .catch(() =>
      err<
        { readonly status: number; readonly data: unknown },
        SavedLevelsApiError
      >({
        code: "network.unreachable",
        message: "Could not reach backend.",
        status: 0,
      }),
    );
}

/** Lists all saved levels available to the current user. */
export async function listSavedLevels(): Promise<
  ResultType<SavedLevelSummary[], SavedLevelsApiError>
> {
  const response = await fetchJson(BASE, {
    method: "GET",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);

  const parsed = SavedLevelListSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid saved levels list format.",
      status: response.value.status,
    });
  }
  return ok(parsed.data);
}

/** Creates a new saved level record. */
export async function createSavedLevel(
  input: CreateSavedLevelInput,
): Promise<ResultType<SavedLevelDetail, SavedLevelsApiError>> {
  const bodyResult = Result.fromThrowable(
    () => JSON.stringify(input),
    mapErr,
  )();
  if (bodyResult.isErr()) {
    return err({
      code: "request.invalid",
      message: `Could not serialize saved level payload: ${bodyResult.error}`,
      status: 0,
    });
  }

  const response = await fetchJson(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: bodyResult.value,
  });
  if (response.isErr()) return err(response.error);

  const parsed = SavedLevelDetailSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid saved level format.",
      status: response.value.status,
    });
  }
  return ok(parsed.data);
}

/** Loads one saved level by id. */
export async function loadSavedLevel(
  id: string,
): Promise<ResultType<SavedLevelDetail, SavedLevelsApiError>> {
  const response = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);

  const parsed = SavedLevelDetailSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid saved level format.",
      status: response.value.status,
    });
  }
  return ok(parsed.data);
}

/** Updates an existing saved level record. */
export async function updateSavedLevel(
  id: string,
  input: UpdateSavedLevelInput,
): Promise<ResultType<SavedLevelDetail, SavedLevelsApiError>> {
  const bodyResult = Result.fromThrowable(
    () => JSON.stringify(input),
    mapErr,
  )();
  if (bodyResult.isErr()) {
    return err({
      code: "request.invalid",
      message: `Could not serialize saved level payload: ${bodyResult.error}`,
      status: 0,
    });
  }

  const response = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: bodyResult.value,
  });
  if (response.isErr()) return err(response.error);

  const parsed = SavedLevelDetailSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid saved level format.",
      status: response.value.status,
    });
  }
  return ok(parsed.data);
}

/** Deletes a saved level record by id. */
export async function deleteSavedLevel(
  id: string,
): Promise<ResultType<void, SavedLevelsApiError>> {
  const response = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);
  return ok(undefined);
}
