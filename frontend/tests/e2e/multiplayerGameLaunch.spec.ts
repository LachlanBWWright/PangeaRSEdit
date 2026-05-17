/**
 * End-to-end screenshot tests that verify the multiplayer canvas appears and
 * the game is running after a real host/guest start flow. The mock API bypasses
 * the real backend, but both pages still join the same lobby and transition to
 * the started state before the screenshots are taken.
 *
 * Requires the Vite dev server to be running so the game WASM files are
 * served at /PangeaRSEdit/generated/pangea-ports/wasm/…
 */
import * as path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

const screenshotsDir = path.resolve(import.meta.dirname, "../../screenshots");

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
  participantId: string;
  matchConfig?: {
    matchId: string;
    gameId: string;
    mode: string;
    trackOrLevel: string;
    seed: number;
    hostParticipantId: string;
    players: {
      participantId: string;
      playerIndex: number;
      displayName: string;
    }[];
  };
}

interface MockBackendState {
  lobby: MockLobbyState | null;
}

const nowIso = "2026-05-16T00:00:00.000Z";
const laterIso = "2026-05-16T01:00:00.000Z";
const lobbyId = "00000000-0000-4000-8000-000000000aaa";
const hostParticipantId = "00000000-0000-4000-8000-000000000bbb";
const guestParticipantId = "00000000-0000-4000-8000-000000000ccc";

function withParticipant(
  lobby: MockLobbyState,
  participantId: string,
): Record<string, unknown> {
  return {
    id: lobbyId,
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

function createInitialLobby(
  gameId: string,
  trackOrLevel: string,
  displayName: string,
): MockLobbyState {
  const hostPlayer: MockLobbyPlayer = {
    participantId: hostParticipantId,
    displayName,
    playerIndex: 0,
    isHost: true,
    isReady: false,
    joinedAt: nowIso,
    lastSeenAt: nowIso,
  };
  return {
    id: lobbyId,
    gameId,
    mode: "multiplayerRace",
    trackOrLevel,
    maxPlayers: 2,
    hostParticipantId,
    joinCode: "PLAY01",
    state: "open",
    createdAt: nowIso,
    expiresAt: laterIso,
    players: [hostPlayer],
    participantId: hostParticipantId,
  };
}

const bodySchema = z
  .object({
    displayName: z.string().optional(),
    gameId: z.string().optional(),
    isReady: z.boolean().optional(),
    trackOrLevel: z.string().optional(),
  })
  .passthrough();

async function installMockApi(
  page: Page,
  state: MockBackendState,
  participantId: string,
): Promise<void> {
  await page.route("**/api/multiplayer/lobbies**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const rawBody = request.postData() ?? "{}";
    const body = bodySchema.safeParse(JSON.parse(rawBody)).data ?? {};

    const json = async (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });

    if (method === "POST" && pathname.endsWith("/api/multiplayer/lobbies")) {
      const gameId = body.gameId ?? "cromagrally";
      const trackOrLevel = body.trackOrLevel ?? "1";
      const displayName = body.displayName ?? "Host";
      state.lobby = createInitialLobby(gameId, trackOrLevel, displayName);
      await json(withParticipant(state.lobby, participantId));
      return;
    }

    if (
      method === "POST" &&
      pathname.endsWith(`/api/multiplayer/lobbies/${lobbyId}/join`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      const displayName = body.displayName ?? "Guest";
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
      pathname.endsWith(`/api/multiplayer/lobbies/${lobbyId}/ready`)
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
      pathname.endsWith(`/api/multiplayer/lobbies/${lobbyId}/start`)
    ) {
      const lobby = state.lobby;
      if (!lobby) {
        await route.fulfill({ status: 404, body: "{}" });
        return;
      }
      lobby.state = "started";
      lobby.matchConfig = {
        matchId: "00000000-0000-4000-8000-000000000ccc",
        gameId: lobby.gameId,
        mode: lobby.mode,
        trackOrLevel: lobby.trackOrLevel,
        seed: 99999,
        hostParticipantId,
        players: lobby.players.map((p) => ({
          participantId: p.participantId,
          playerIndex: p.playerIndex,
          displayName: p.displayName,
        })),
      };
      await json(withParticipant(lobby, participantId));
      return;
    }

    if (method === "POST") {
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

async function waitForGameAndScreenshot(
  page: Page,
  screenshotName: string,
): Promise<void> {
  // Wait for the game canvas to mount (rendered when activeMatchConfig is set).
  const canvas = page.locator('canvas[aria-label="Multiplayer Game"]');
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  // Give the runtime a short window to present a live frame instead of only
  // the loading state.
  await page.waitForTimeout(3_000);

  // Full-page screenshot capturing the canvas in context
  await page.screenshot({
    path: path.join(screenshotsDir, screenshotName),
    fullPage: false,
  });
}

test.describe("Multiplayer game launch", () => {
  test("Cro-Mag Rally launches after host and guest start", async ({
    browser,
  }) => {
    const state: MockBackendState = { lobby: null };
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await installMockApi(hostPage, state, hostParticipantId);
    await installMockApi(guestPage, state, guestParticipantId);

    await hostPage.goto("/");
    await guestPage.goto("/");
    await hostPage.getByRole("link", { name: "Multiplayer" }).click();
    await guestPage.getByRole("link", { name: "Multiplayer" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "Multiplayer", exact: true }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole("heading", { name: "Multiplayer", exact: true }),
    ).toBeVisible();

    await hostPage.getByRole("combobox").first().click();
    await hostPage.getByRole("option", { name: "Cro-Mag Rally" }).click();
    await hostPage.getByLabel("Display Name").fill("Host");
    await hostPage.getByRole("button", { name: "Create Lobby" }).click();
    await expect(hostPage.getByText(lobbyId).first()).toBeVisible();

    await guestPage.getByRole("tab", { name: "Join Existing" }).click();
    await guestPage.getByLabel("Display Name").fill("Guest");
    await guestPage.getByPlaceholder("Lobby ID").fill(lobbyId);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage.getByText(lobbyId).first()).toBeVisible();

    await hostPage.getByRole("button", { name: "Set Ready" }).click();
    await guestPage.getByRole("button", { name: "Set Ready" }).click();
    await hostPage.getByRole("button", { name: "Host Start" }).click();

    await expect(hostPage.getByText(/State:\s*started/i).first()).toBeVisible();
    await waitForGameAndScreenshot(
      hostPage,
      "multiplayer-cromag-in-progress.png",
    );

    await hostContext.close();
    await guestContext.close();
  });

  test("Nanosaur 2 launches after host and guest start", async ({
    browser,
  }) => {
    const state: MockBackendState = { lobby: null };
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await installMockApi(hostPage, state, hostParticipantId);
    await installMockApi(guestPage, state, guestParticipantId);

    await hostPage.goto("/");
    await guestPage.goto("/");
    await hostPage.getByRole("link", { name: "Multiplayer" }).click();
    await guestPage.getByRole("link", { name: "Multiplayer" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "Multiplayer", exact: true }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole("heading", { name: "Multiplayer", exact: true }),
    ).toBeVisible();

    await hostPage.getByRole("combobox").first().click();
    await hostPage.getByRole("option", { name: "Nanosaur 2" }).click();
    await hostPage.getByLabel("Display Name").fill("Host");
    await hostPage.getByRole("button", { name: "Create Lobby" }).click();
    await expect(hostPage.getByText(lobbyId).first()).toBeVisible();

    await guestPage.getByRole("tab", { name: "Join Existing" }).click();
    await guestPage.getByLabel("Display Name").fill("Guest");
    await guestPage.getByPlaceholder("Lobby ID").fill(lobbyId);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage.getByText(lobbyId).first()).toBeVisible();

    await hostPage.getByRole("button", { name: "Set Ready" }).click();
    await guestPage.getByRole("button", { name: "Set Ready" }).click();
    await hostPage.getByRole("button", { name: "Host Start" }).click();

    await expect(hostPage.getByText(/State:\s*started/i).first()).toBeVisible();
    await waitForGameAndScreenshot(
      hostPage,
      "multiplayer-nanosaur2-in-progress.png",
    );

    await hostContext.close();
    await guestContext.close();
  });
});
