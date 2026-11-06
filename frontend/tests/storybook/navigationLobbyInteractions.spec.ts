import path from "node:path";
import { expect, test } from "@playwright/test";
import type { MultiplayerLobbySummary } from "../../src/multiplayer/types";

const lobby: MultiplayerLobbySummary = {
  id: "f76cdd0f-a824-4c80-8f92-42b2be9ce411", gameId: "cromagrally", mode: "multiplayerRace",
  trackOrLevel: "1", tagDurationMinutes: 3, maxPlayers: 4, isPublic: true, joinCode: "RALLY1",
  state: "open", playerCount: 1, createdAt: "2026-10-30T00:00:00Z", expiresAt: "2026-10-30T01:00:00Z", canJoin: true,
};

test.use({ viewport: { width: 1000, height: 200 } });

test("navigation announces an open lobby and removes the badge when none remain", async ({ page }) => {
  let available = true;
  await page.addInitScript(() => window.localStorage.setItem("pangea-feature-flags", JSON.stringify({ multiplayer: true, scripting: false })));
  await page.route("**/api/multiplayer/lobbies", (route) => route.fulfill({
    json: { items: available ? [lobby] : [] },
  }));
  await page.goto("/iframe.html?id=pages-navigation--default&viewMode=story");
  const link = page.getByRole("link", { name: "Multiplayer Open lobby", exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/multiplayer");
  await page.screenshot({ path: path.resolve("screenshots/storybook/navigation-open-lobby.png"), animations: "disabled" });
  available = false;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Open lobby", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Multiplayer", exact: true })).toBeVisible();
});

test("disabled multiplayer makes no lobby availability requests", async ({ page }) => {
  const requests: string[] = [];
  await page.addInitScript(() => window.localStorage.setItem("pangea-feature-flags", JSON.stringify({ multiplayer: false })));
  await page.route("**/api/multiplayer/lobbies", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: { items: [lobby] } });
  });
  await page.goto("/iframe.html?id=pages-navigation--default&viewMode=story");
  await expect(page.getByRole("link", { name: "Level Editor", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Multiplayer/ })).toHaveCount(0);
  expect(requests).toEqual([]);
});
