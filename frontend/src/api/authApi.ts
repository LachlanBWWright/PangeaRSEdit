import { err, ok, type Result } from "neverthrow";
import { UserProfileSchema, type UserProfile } from "./apiSchemas";

export interface AuthApiError {
  code: string;
  message: string;
  status: number;
}

async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<
  Result<{ readonly status: number; readonly data: unknown }, AuthApiError>
> {
  return fetch(input, init)
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        return err<
          { readonly status: number; readonly data: unknown },
          AuthApiError
        >({
          code: "auth.error",
          message:
            typeof data === "object" && data !== null && "message" in data
              ? String((data as Record<string, unknown>)["message"])
              : "Auth request failed.",
          status: response.status,
        });
      }
      return ok({ status: response.status, data });
    })
    .catch(() =>
      err<{ readonly status: number; readonly data: unknown }, AuthApiError>({
        code: "network.unreachable",
        message: "Could not reach backend.",
        status: 0,
      }),
    );
}

/**
 * Get the currently signed-in user profile.
 * Returns err if not signed in (401) or on network failure.
 */
export async function getMe(): Promise<Result<UserProfile, AuthApiError>> {
  const response = await fetchJson("/api/me", {
    method: "GET",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);

  const parsed = UserProfileSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid user profile format.",
      status: response.value.status,
    });
  }
  return ok(parsed.data);
}

/**
 * Sign out the current user. Clears the session cookie server-side.
 */
export async function signOut(): Promise<Result<void, AuthApiError>> {
  const response = await fetchJson("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
  });
  if (response.isErr()) return err(response.error);
  return ok(undefined);
}

/**
 * Returns the URL to navigate to for Google OAuth sign-in.
 */
export function getGoogleSignInUrl(returnUrl?: string): string {
  const base = "/api/auth/google/sign-in";
  if (returnUrl) {
    return `${base}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return base;
}
