import { expect, test } from "@playwright/test";

test("short session keeps match actions reachable while lobby content scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/iframe.html?id=multiplayer-session-sidebar--short-session-layout&viewMode=story");
  const start = page.getByRole("button", { name: "Start match" });
  const leave = page.getByRole("button", { name: "Leave Lobby" });
  await expect(start).toBeDisabled();
  await expect(start).toBeInViewport();
  await expect(leave).toBeInViewport();
  const chat = page.getByRole("textbox", { name: "Chat message" });
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toBeInViewport();
  await expect(start).toBeInViewport();
  await expect(leave).toBeInViewport();
  await page.getByRole("button", { name: "Copy code" }).scrollIntoViewIfNeeded();
  await expect(start).toBeInViewport();
});

test("create dialog fits a small screen and keeps its submit action reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/iframe.html?id=multiplayer-lobby-browser--default&viewMode=story");
  await page.getByRole("button", { name: "Create Lobby" }).click();
  const dialog = page.getByRole("dialog", { name: "Create Lobby" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Create Lobby" })).toBeInViewport();
  await dialog.getByRole("combobox", { name: "Lobby Visibility" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("combobox", { name: "Lobby Visibility" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Create Lobby" })).toBeInViewport();
  const fitsViewport = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight
      && document.documentElement.scrollWidth <= window.innerWidth;
  });
  expect(fitsViewport).toBe(true);
});

test("preparing a quick join explains why lobby actions are disabled", async ({ page }) => {
  await page.goto("/iframe.html?id=multiplayer-lobby-browser--preparing-game&viewMode=story");
  await expect(page.getByRole("status")).toHaveText("Preparing game files…");
  await expect(page.getByRole("button", { name: "Create Lobby" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Join Lobby" }).first()).toBeDisabled();
});

test("creating a lobby shows preparation progress and freezes the submitted setup", async ({ page }) => {
  await page.goto("/iframe.html?id=multiplayer-lobby-browser--creating-lobby&viewMode=story");
  const dialog = page.getByRole("dialog", { name: "Create Lobby" });
  await expect(dialog.getByRole("status")).toHaveText("Preparing game files…");
  await expect(dialog.getByRole("textbox", { name: "Display Name" })).toBeDisabled();
  await expect(dialog.getByRole("combobox", { name: "Game", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Create Lobby" })).toBeDisabled();
});

test("phone session stacks the production stage and keeps lobby actions accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/iframe.html?id=multiplayer-session--phone-layout&viewMode=story");
  const leave = page.getByRole("button", { name: "Leave Lobby" });
  await leave.scrollIntoViewIfNeeded();
  await expect(leave).toBeInViewport();
  const chat = page.getByRole("textbox", { name: "Chat message" });
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toBeInViewport();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("six-player roster and long chat remain scrollable above the action footer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/iframe.html?id=multiplayer-session--full-roster&viewMode=story");
  await page.getByText("5. Casey", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Start match" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Leave Lobby" })).toBeInViewport();
  await page.goto("/iframe.html?id=multiplayer-session--long-chat&viewMode=story");
  const lastMessage = page.getByText("Message 12: Let’s try the next arena after this race.");
  await lastMessage.scrollIntoViewIfNeeded();
  await expect(lastMessage).toBeInViewport();
  await expect(page.getByRole("button", { name: "Start match" })).toBeInViewport();
});
