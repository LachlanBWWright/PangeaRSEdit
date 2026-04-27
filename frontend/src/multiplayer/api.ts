import { err, ok, type Result } from "neverthrow";
import {
  MultiplayerLobbyDetailsSchema,
  MultiplayerLobbyListSchema,
} from "./schemas";
import type {
  CreateLobbyInput,
  JoinLobbyInput,
  ListLobbiesInput,
  MultiplayerApiError,
  MultiplayerLobbyDetails,
  MultiplayerLobbySummary,
  SetReadyInput,
  StartLobbyInput,
} from "./types";

const BASE_PATH = "/api/multiplayer/lobbies";

function parseError(status: number, payload: unknown): MultiplayerApiError {
  if (typeof payload === "object" && payload !== null) {
    const maybeCode = "code" in payload ? payload.code : null;
    const maybeMessage = "message" in payload ? payload.message : null;
    if (typeof maybeCode === "string" && typeof maybeMessage === "string") {
      return {
        code: maybeCode,
        message: maybeMessage,
        status,
      };
    }
  }

  return {
    code: "network.error",
    message: "Multiplayer backend unavailable or returned invalid response.",
    status,
  };
}

async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<
  Result<
    { readonly status: number; readonly data: unknown },
    MultiplayerApiError
  >
> {
  return fetch(input, init)
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        return err(parseError(response.status, data));
      }

      return ok({ status: response.status, data });
    })
    .catch(() => {
      return err({
        code: "network.unreachable",
        message: "Could not reach multiplayer backend.",
        status: 0,
      });
    });
}

export async function createLobby(
  input: CreateLobbyInput,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(BASE_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyDetailsSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function listLobbies(
  input: ListLobbiesInput,
): Promise<Result<readonly MultiplayerLobbySummary[], MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}?gameId=${encodeURIComponent(input.gameId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyListSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby list response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data.items);
}

export async function getLobby(
  lobbyId: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(lobbyId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyDetailsSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function joinLobby(
  input: JoinLobbyInput,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(input.lobbyId)}/join`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: input.displayName }),
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyDetailsSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function setLobbyReady(
  input: SetReadyInput,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(input.lobbyId)}/ready`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isReady: input.isReady }),
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyDetailsSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function startLobby(
  input: StartLobbyInput,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(input.lobbyId)}/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  const parsed = MultiplayerLobbyDetailsSchema.safeParse(response.value.data);
  if (!parsed.success) {
    return err({
      code: "schema.invalid",
      message: "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function leaveLobby(
  lobbyId: string,
): Promise<Result<boolean, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(lobbyId)}/leave`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.isErr()) {
    return err(response.error);
  }

  return ok(true);
}
