import { err, ok, type Result } from "neverthrow";
import { buildApiUrl } from "@/api/apiBase";
import { z } from "zod";
import {
  MultiplayerLobbyDetailsSchema,
  MultiplayerLobbyListSchema,
  MultiplayerLobbyPreviewSchema,
} from "./schemas";
import type {
  CreateLobbyInput,
  JoinLobbyInput,
  ListLobbiesInput,
  MultiplayerApiError,
  MultiplayerLobbyDetails,
  MultiplayerLobbyPreview,
  MultiplayerLobbySummary,
  SetReadyInput,
  StartLobbyInput,
} from "./types";

const BASE_PATH = buildApiUrl("/api/multiplayer/lobbies");
const PARTICIPANT_HEADER_NAME = "X-Participant-Id";

let currentParticipantId: string | null = null;

function withParticipantHeader(headers: RequestInit["headers"]): Headers {
  const resolvedHeaders = new Headers(headers);
  if (currentParticipantId !== null) {
    resolvedHeaders.set(PARTICIPANT_HEADER_NAME, currentParticipantId);
  }
  return resolvedHeaders;
}

function updateParticipantIdFromResponse(response: Response): void {
  const parsedParticipantId = z
    .string()
    .min(1)
    .safeParse(response.headers.get(PARTICIPANT_HEADER_NAME));
  if (parsedParticipantId.success) {
    currentParticipantId = parsedParticipantId.data;
  }
}

function updateParticipantIdFromPayload(payload: unknown): void {
  const parsedPayload = z
    .object({ participantId: z.string().min(1) })
    .safeParse(payload);
  if (parsedPayload.success) {
    currentParticipantId = parsedPayload.data.participantId;
  }
}

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
  return fetch(input, {
    ...init,
    headers: withParticipantHeader(init.headers),
  })
    .then(async (response) => {
      updateParticipantIdFromResponse(response);
      const data = (await response.json().catch(() => null)) as unknown;
      updateParticipantIdFromPayload(data);
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function listLobbies(
  input: ListLobbiesInput,
): Promise<Result<readonly MultiplayerLobbySummary[], MultiplayerApiError>> {
  const query = input.gameId
    ? `?gameId=${encodeURIComponent(input.gameId)}`
    : "";
  const response = await fetchJson(
    `${BASE_PATH}${query}`,
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby list response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby list response format.",
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby response format.",
      status: response.value.status,
    });
  }

  return ok(parsed.data);
}

export async function getLobbyPreview(
  lobbyId: string,
): Promise<Result<MultiplayerLobbyPreview, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(lobbyId)}/preview`,
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

  const parsed = MultiplayerLobbyPreviewSchema.safeParse(response.value.data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby preview response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby preview response format.",
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby response format.",
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby response format.",
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
    const issue = parsed.error.issues[0];
    return err({
      code: "schema.invalid",
      message: issue
        ? `Invalid lobby response format: ${issue.path.join(".") || "root"} ${issue.message}`
        : "Invalid lobby response format.",
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

async function postLobbyReport(
  lobbyId: string,
  reportPath: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(lobbyId)}/report/${reportPath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ detail: detail ?? "" }),
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

export async function heartbeatLobby(
  lobbyId: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  const response = await fetchJson(
    `${BASE_PATH}/${encodeURIComponent(lobbyId)}/heartbeat`,
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

export function reportMatchEnded(
  lobbyId: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  return postLobbyReport(lobbyId, "match-ended", detail);
}

export function reportParticipantDisconnected(
  lobbyId: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  return postLobbyReport(lobbyId, "participant-disconnected", detail);
}

export function reportHostDisconnected(
  lobbyId: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  return postLobbyReport(lobbyId, "host-disconnected", detail);
}

export function reportDesync(
  lobbyId: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  return postLobbyReport(lobbyId, "desync", detail);
}

export function reportTimeout(
  lobbyId: string,
  detail?: string,
): Promise<Result<MultiplayerLobbyDetails, MultiplayerApiError>> {
  return postLobbyReport(lobbyId, "timeout", detail);
}
