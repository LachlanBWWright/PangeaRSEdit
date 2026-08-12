import { ResultAsync, err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { buildApiUrl } from "@/api/apiBase";

const BackendHealthSchema = z.object({
  status: z.literal("ok"),
});

export interface BackendAvailabilityError {
  readonly code: "network.unreachable" | "http.error" | "schema.invalid";
  readonly message: string;
  readonly status: number;
}

function networkUnavailableError(): BackendAvailabilityError {
  return {
    code: "network.unreachable",
    message: "Could not reach backend API server.",
    status: 0,
  };
}

function invalidJsonError(status: number): BackendAvailabilityError {
  return {
    code: "schema.invalid",
    message: "Backend health response was not valid JSON.",
    status,
  };
}

function httpError(status: number): BackendAvailabilityError {
  return {
    code: "http.error",
    message: "Backend API server returned an unsuccessful health check.",
    status,
  };
}

function parseHealthResponse(
  status: number,
  payload: unknown,
): Result<boolean, BackendAvailabilityError> {
  const parsed = BackendHealthSchema.safeParse(payload);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Backend health response was not recognized.",
      status,
    });
  }

  return ok(true);
}

export function checkBackendApiAvailable(): ResultAsync<
  boolean,
  BackendAvailabilityError
> {
  return ResultAsync.fromPromise(
    fetch(buildApiUrl("/healthz"), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }),
    networkUnavailableError,
  ).andThen((response) => {
    if (!response.ok) {
      return err(httpError(response.status));
    }

    return ResultAsync.fromPromise(response.json(), () =>
      invalidJsonError(response.status),
    ).andThen((payload) => parseHealthResponse(response.status, payload));
  });
}
