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
    hostPlayerIndex: number;
    maxPlayers: number;
    requiredProtocolVersion: number;
    requiredRuntimeVersion: string;
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

function withParticipant(
  lobby: MockLobbyState,
  participantId: string,
): Record<string, unknown> {
  return {
    id: lobby.id,
    gameId: lobby.gameId,
    mode: lobby.mode,
    trackOrLevel: lobby.trackOrLevel,
    maxPlayers: lobby.maxPlayers,
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

function createInitialLobby(displayName: string): MockLobbyState {
  return {
    id: lobbyId,
    gameId: "cromagrally",
    mode: "multiplayerRace",
    trackOrLevel: "ice-ramp",
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

function installMockMultiplayerApi(
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

  return page.route("**/api/multiplayer/lobbies**", async (route) => {
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
        hostPlayerIndex: 0,
        maxPlayers: lobby.maxPlayers,
        requiredProtocolVersion: 1,
        requiredRuntimeVersion: "host-authoritative-v2",
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
  await page.goto("/");
  await page.getByRole("link", { name: "Multiplayer" }).click();
  await expect(
    page.getByRole("heading", { name: "Multiplayer", exact: true }),
  ).toBeVisible();
}

test.describe("Multiplayer shell", () => {
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
    await hostPage.evaluate(() => {
      window.history.replaceState({}, "", `${window.location.pathname}?multiplayerMockHub=1`);
    });
    await guestPage.evaluate(() => {
      window.history.replaceState({}, "", `${window.location.pathname}?multiplayerMockHub=1`);
    });

    await hostPage.locator("label:has-text('Display Name') input").fill("Host");
    await hostPage.getByRole("button", { name: "Create Lobby" }).click();
    await expect(hostPage.getByText(lobbyId).first()).toBeVisible();
    await expect(hostPage.getByText(/Connection:\s*connected/i).first()).toBeVisible();

    await guestPage.locator("label:has-text('Display Name') input").fill("Guest");
    await guestPage.getByPlaceholder("Lobby ID").fill(lobbyId);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage.getByText(lobbyId).first()).toBeVisible();

    await hostPage.getByRole("button", { name: "Set Ready" }).click();
    await guestPage.getByRole("button", { name: "Set Ready" }).click();
    await hostPage.getByRole("button", { name: "Host Start" }).click();

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
    await page.getByRole("button", { name: "Create Lobby" }).click();
    await expect(page.getByText(lobbyId).first()).toBeVisible();

    await page.getByRole("button", { name: "Leave Lobby" }).click();
    await expect(page.getByText(lobbyId)).toHaveCount(0);
    await expect(page.getByText(/Status:\s*Disconnected/i).first()).toBeVisible();
  });
});
