import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import { listLobbies } from "@/multiplayer/api";
import type { MultiplayerLobbySummary } from "@/multiplayer/types";
import { MultiplayerNavigationLink } from "./MultiplayerNavigationLink";

vi.mock("@/multiplayer/api", () => ({ listLobbies: vi.fn() }));

const lobby: MultiplayerLobbySummary = {
  id: "f76cdd0f-a824-4c80-8f92-42b2be9ce411", gameId: "cromagrally", mode: "multiplayerRace",
  trackOrLevel: "1", tagDurationMinutes: 3, maxPlayers: 4, isPublic: true, joinCode: "RALLY1",
  state: "open", playerCount: 1, createdAt: "2026-10-30T00:00:00Z", expiresAt: "2026-10-30T01:00:00Z", canJoin: true,
};

let root: Root | null = null;
let container: HTMLDivElement;

async function mount() {
  root = createRoot(container);
  await act(async () => root?.render(<MemoryRouter><MultiplayerNavigationLink active={false} /></MemoryRouter>));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.mocked(listLobbies).mockReset().mockResolvedValue(ok([]));
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Multiplayer navigation availability", () => {
  it("shows a small badge inside the real multiplayer link for a joinable public lobby", async () => {
    vi.mocked(listLobbies).mockResolvedValue(ok([lobby]));
    await mount();
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/multiplayer");
    expect(container.querySelector("a")?.textContent).toBe("MultiplayerOpen lobby");
  });

  it.each([
    { name: "empty", lobbies: [] },
    { name: "full", lobbies: [{ ...lobby, playerCount: 4, canJoin: false }] },
    { name: "started", lobbies: [{ ...lobby, state: "started", canJoin: false }] },
    { name: "private", lobbies: [{ ...lobby, isPublic: false }] },
  ])("hides the badge for $name listings", async ({ lobbies }) => {
    vi.mocked(listLobbies).mockResolvedValue(ok(lobbies));
    await mount();
    expect(container.textContent).toBe("Multiplayer");
  });

  it("refreshes on the interval and removes stale availability after an API failure", async () => {
    vi.mocked(listLobbies).mockResolvedValueOnce(ok([lobby]));
    await mount();
    expect(container.textContent).toContain("Open lobby");
    vi.mocked(listLobbies).mockResolvedValue(err({ code: "network", message: "Unavailable", status: 503 }));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(container.textContent).toBe("Multiplayer");
  });

  it("skips hidden tabs, refreshes when visible and releases polling on unmount", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await mount();
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(listLobbies).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    vi.mocked(listLobbies).mockResolvedValue(ok([lobby]));
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(container.textContent).toContain("Open lobby");
    await act(async () => root?.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(listLobbies).toHaveBeenCalledTimes(1);
  });

  it("hides the badge offline and refreshes after reconnecting", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await mount();
    expect(listLobbies).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    vi.mocked(listLobbies).mockResolvedValue(ok([lobby]));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(container.textContent).toContain("Open lobby");
    online.mockReturnValue(false);
    await act(async () => { window.dispatchEvent(new Event("offline")); });
    expect(container.textContent).toBe("Multiplayer");
  });
});
