import { err, ok, type Result } from "neverthrow";
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

const BASE = "/api/saved-levels";

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

export async function listSavedLevels(): Promise<
  Result<SavedLevelSummary[], SavedLevelsApiError>
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

export async function createSavedLevel(
  input: CreateSavedLevelInput,
): Promise<Result<SavedLevelDetail, SavedLevelsApiError>> {
  const response = await fetchJson(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
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

export async function loadSavedLevel(
  id: string,
): Promise<Result<SavedLevelDetail, SavedLevelsApiError>> {
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

export async function updateSavedLevel(
  id: string,
  input: UpdateSavedLevelInput,
): Promise<Result<SavedLevelDetail, SavedLevelsApiError>> {
  const response = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
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

export async function deleteSavedLevel(
  id: string,
): Promise<Result<void, SavedLevelsApiError>> {
  const response = await fetchJson(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);
  return ok(undefined);
}
