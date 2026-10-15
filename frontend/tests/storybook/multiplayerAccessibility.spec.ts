import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ResultAsync } from "neverthrow";
import { z } from "zod";

const indexSchema = z.object({
  entries: z.record(z.string(), z.object({ id: z.string(), title: z.string(), type: z.string() })),
});

test("multiplayer stories have no serious or critical accessibility violations", async ({ page, request }) => {
  test.setTimeout(240_000);
  const response = await request.get("/index.json");
  const payload: unknown = await response.json();
  const parsed = indexSchema.safeParse(payload);
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  const stories = Object.values(parsed.data.entries).filter((entry) => entry.type === "story" && entry.title.startsWith("Multiplayer/"));
  expect(stories.length).toBeGreaterThanOrEqual(50);
  const failures: { storyId: string; rule: string; targets: string[][] }[] = [];
  for (const story of stories) {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&embed=true`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('#storybook-root > *, [role="dialog"]').first(), story.id).toBeAttached();
    const debugTab = page.getByRole("tab", { name: "Debug", exact: true });
    if (await debugTab.count()) await debugTab.click();
    await page.waitForFunction(() => document.getAnimations().every((animation) =>
      animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity));
    const analysis = await ResultAsync.fromPromise(
      new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze(),
      () => `Accessibility analysis failed for ${story.id}`,
    );
    expect(analysis.isOk(), story.id).toBe(true);
    if (analysis.isErr()) continue;
    for (const violation of analysis.value.violations) {
      if (violation.impact === "serious" || violation.impact === "critical") {
        failures.push({ storyId: story.id, rule: violation.id, targets: violation.nodes.map((node) => node.target.map(String)) });
      }
    }
  }
  expect(failures).toEqual([]);
});

test("multiplayer overview and every screen have indexed documentation pages", async ({ page, request }) => {
  const response = await request.get("/index.json");
  const payload: unknown = await response.json();
  const parsed = indexSchema.safeParse(payload);
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  const docs = Object.values(parsed.data.entries).filter((entry) => entry.type === "docs").map((entry) => entry.title);
  expect(docs).toEqual(expect.arrayContaining([
    "Multiplayer/Overview", "Multiplayer/Lobby Browser", "Multiplayer/Lobby Setup",
    "Multiplayer/Join by Code", "Multiplayer/Session", "Multiplayer/Session Sidebar",
  ]));
  await page.goto("/iframe.html?id=multiplayer-overview--documentation&viewMode=docs");
  await expect(page.getByRole("heading", { name: /Multiplayer UI$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Diagnostics and runtime boundaries$/ })).toBeAttached();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
