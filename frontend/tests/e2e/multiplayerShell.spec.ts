import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

interface MockLobbyPlayer {
  participantId: string;
  displayName: string;
  playerIndex: number;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

interface MockLobbyState {
  id: string;
  gameId: string;
  mode: string;
  trackOrLevel: string;
  tagDurationMinutes: number;
  maxPlayers: number;
  hostParticipantId: string;
  joinCode: string;
  state: string;
  createdAt: string;
  expiresAt: string;
  players: MockLobbyPlayer[];
  matchConfig?: {
    lobbyId: string;
    matchId: string;
    gameId: string;
    mode: string;
    trackOrLevel: string;
    seed: number;
    tagDurationMinutes: number;
    hostPlayerIndex: number;
    maxPlayers: number;
    requiredProtocolVersion: number;
    requiredRuntimeVersion: string;
    requiredContentHash: string;
    hostParticipantId: string;
    players: {
      participantId: string;
      playerIndex: number;
      displayName: string;
      connectionState: string;
    }[];
  };
}

interface MockBackendState {
  lobby: MockLobbyState | null;
}

const nowIso = "2026-05-16T00:00:00.000Z";
const laterIso = "2026-05-16T01:00:00.000Z";
const lobbyId = "00000000-0000-4000-8000-000000000111";
const hostParticipantId = "00000000-0000-4000-8000-000000000211";
const guestParticipantId = "00000000-0000-4000-8000-000000000311";
const runtimeContentHash =
  process.env.VITE_MULTIPLAYER_CONTENT_HASH ?? "development-unpinned";

function withParticipant(
  lobby: MockLobbyState,
  participantId: string,
): Record<string, unknown> {
  return {
    id: lobby.id,
    gameId: lobby.gameId,
    mode: lobby.mode,
    trackOrLevel: lobby.trackOrLevel,
    tagDurationMinutes: lobby.tagDurationMinutes,
    maxPlayers: lobby.maxPlayers,
    isPublic: true,
    hostParticipantId: lobby.hostParticipantId,
    joinCode: lobby.joinCode,
    state: lobby.state,
    createdAt: lobby.createdAt,
    expiresAt: lobby.expiresAt,
    players: lobby.players,
    participantId,
    matchConfig: lobby.matchConfig,
  };
}

function toLobbySummary(lobby: MockLobbyState): Record<string, unknown> {
  return {
    id: lobby.id,
    gameId: lobby.gameId,
    mode: lobby.mode,
    trackOrLevel: lobby.trackOrLevel,
    tagDurationMinutes: lobby.tagDurationMinutes,
    maxPlayers: lobby.maxPlayers,
    isPublic: true,
    joinCode: lobby.joinCode,
    state: lobby.state,
    playerCount: lobby.players.length,
    canJoin: lobby.state === "open" && lobby.players.length < lobby.maxPlayers,
    createdAt: lobby.createdAt,
    expiresAt: lobby.expiresAt,
  };
}

function createInitialLobby(displayName: string): MockLobbyState {
  return {
    id: lobbyId,
    gameId: "cromagrally",
    mode: "multiplayerRace",
    trackOrLevel: "ice-ramp",
    tagDurationMinutes: 3,
    maxPlayers: 2,
    hostParticipantId,
    joinCode: "ABCD12",
    state: "open",
    createdAt: nowIso,
    expiresAt: laterIso,
    players: [
      {
        participantId: hostParticipantId,
        displayName,
        playerIndex: 0,
        isHost: true,
        isReady: false,
        joinedAt: nowIso,
        lastSeenAt: nowIso,
      },
    ],
  };
}

async function installMockMultiplayerApi(
  page: Page,
  state: MockBackendState,
  participantId: string,
): Promise<void> {
  const requestBodySchema = z
    .object({
      displayName: z.string().optional(),
      isReady: z.boolean().optional(),
    })
    .passthrough();

  await page.route("**/api/multiplayer/lobbies**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;
    const bodyText = request.postData() ?? "{}";
    const parsedBody = requestBodySchema.safeParse(JSON.parse(bodyText));
    const body = parsedBody.success ? parsedBody.data : {};

    const json = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });

    if (method === "POST" && path.endsWith("/api/multiplayer/lobbies")) {
      const displayName =
        typeof body.displayName === "string" ? body.displayName : "Host";
      state.lobby = createInitialLobby(displayName);
      await json(withParticipant(state.lobby, participantId));
      return;
    }

    if (method === "GET" && path.endsWith("/api/multiplayer/lobbies")) {
      const lobby = state.lobby;
      await json({
        items: lobby ? [toLobbySummary(lobby)] : [],
      });
      return;
    }

    if (
      method === "GET" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/preview`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      await json({
        id: lobby.id,
        gameId: lobby.gameId,
        mode: lobby.mode,
        trackOrLevel: lobby.trackOrLevel,
        maxPlayers: lobby.maxPlayers,
        state: lobby.state,
        playerCount: lobby.players.length,
        canJoin: lobby.state === "open" && lobby.players.length < lobby.maxPlayers,
      });
      return;
    }

    if (
      method === "POST" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/join`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      const displayName =
        typeof body.displayName === "string" ? body.displayName : "Guest";
      const hasGuest = lobby.players.some(
        (player) => player.participantId === guestParticipantId,
      );
      if (!hasGuest) {
        lobby.players.push({
          participantId: guestParticipantId,
          displayName,
          playerIndex: 1,
          isHost: false,
          isReady: false,
          joinedAt: nowIso,
          lastSeenAt: nowIso,
        });
      }
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (
      method === "POST" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/ready`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      const isReady = body.isReady === true;
      lobby.players = lobby.players.map((player) =>
        player.participantId === participantId
          ? { ...player, isReady, lastSeenAt: nowIso }
          : player,
      );
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (
      method === "POST" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/start`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      lobby.state = "started";
      lobby.matchConfig = {
        lobbyId: lobby.id,
        matchId: "00000000-0000-4000-8000-000000000711",
        gameId: lobby.gameId,
        mode: lobby.mode,
        trackOrLevel: lobby.trackOrLevel,
        seed: 12345,
        tagDurationMinutes: lobby.tagDurationMinutes,
        hostPlayerIndex: 0,
        maxPlayers: lobby.maxPlayers,
        requiredProtocolVersion: 1,
        requiredRuntimeVersion: "host-authoritative-v2",
        requiredContentHash: runtimeContentHash,
        hostParticipantId: lobby.hostParticipantId,
        players: lobby.players.map((player) => ({
          participantId: player.participantId,
          playerIndex: player.playerIndex,
          displayName: player.displayName,
          connectionState: "connected",
        })),
      };
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (
      method === "POST" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/leave`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      lobby.players = lobby.players.filter(
        (player) => player.participantId !== participantId,
      );
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (
      method === "POST" &&
      path.endsWith(`/api/multiplayer/lobbies/${lobbyId}/heartbeat`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (method === "POST" && path.includes("/api/multiplayer/lobbies/")) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      await json(withParticipant(lobby, participantId));
      return;
    }

    await route.fallback();
  });
}

async function gotoMultiplayer(page: Page): Promise<void> {
  await page.goto("/PangeaRSEdit/?multiplayerMockHub=1");
  await page.getByRole("link", { name: "Multiplayer" }).click();
  await expect(
    page.getByRole("heading", { name: "Find a Lobby" }),
  ).toBeVisible();
}

test.describe("Multiplayer shell", () => {
  test.describe.configure({ timeout: 120_000 });

  test("host and guest complete create/join/ready/start flow", async ({
    browser,
  }) => {
    const mockState: MockBackendState = { lobby: null };

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await installMockMultiplayerApi(hostPage, mockState, hostParticipantId);
    await installMockMultiplayerApi(guestPage, mockState, guestParticipantId);

    await gotoMultiplayer(hostPage);
    await gotoMultiplayer(guestPage);
    await hostPage.getByRole("button", { name: "Create Lobby" }).first().click();
    await hostPage.locator("#multiplayer-create-display-name").fill("Host");
    await hostPage
      .locator('[role="dialog"]')
      .getByRole("button", { name: "Create Lobby" })
      .click();
    await expect(hostPage.getByText(lobbyId).first()).toBeVisible();
    await expect(hostPage.getByText(/Connection:\s*connected/i).first()).toBeVisible();

    await guestPage.locator("#multiplayer-display-name").fill("Guest");
    await guestPage.locator("#multiplayer-join-lobby-id").fill(lobbyId);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage.getByText(lobbyId).first()).toBeVisible();

    await hostPage.getByRole("button", { name: "Set Ready" }).click();
    await guestPage.getByRole("button", { name: "Set Ready" }).click();
    await hostPage.getByRole("button", { name: "Start Anyway", exact: true }).click();

    await expect(hostPage.getByText(/State:\s*started/i).first()).toBeVisible();
    await hostContext.close();
    await guestContext.close();
  });

  test("leaving lobby clears local lobby state", async ({ page }) => {
    const mockState: MockBackendState = { lobby: null };
    await installMockMultiplayerApi(page, mockState, hostParticipantId);

    await gotoMultiplayer(page);
    await page.evaluate(() => {
      window.history.replaceState({}, "", `${window.location.pathname}?multiplayerMockHub=1`);
    });
    await page.getByRole("button", { name: "Create Lobby" }).first().click();
    await page
      .locator('[role="dialog"]')
      .getByRole("button", { name: "Create Lobby" })
      .click();
    await expect(page.getByText(lobbyId).first()).toBeVisible();

    await page.getByRole("button", { name: "Leave Lobby" }).click();
    await expect(
      page.getByRole("heading", { name: "Find a Lobby" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave Lobby" })).toHaveCount(0);
    await expect(page.getByText(/Status:\s*Disconnected/i).first()).toBeVisible();
  });
});
