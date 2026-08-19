import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ResultAsync } from "neverthrow";
import { z } from "zod";

const storyIndexSchema = z.object({
  entries: z.record(
    z.string(),
    z.object({ id: z.string(), type: z.string() }),
  ),
});

test("every Storybook story has no serious accessibility violations", async ({
  page,
  request,
}) => {
  const response = await request.get("/index.json");
  const payload: unknown = await response.json();
  const parsedIndex = storyIndexSchema.safeParse(payload);
  expect(parsedIndex.success).toBe(true);
  if (!parsedIndex.success) return;

  const storyIds = Object.values(parsedIndex.data.entries)
    .filter((entry) => entry.type === "story")
    .map((entry) => entry.id);

  for (const storyId of storyIds) {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    await expect(page.locator("#storybook-root > *").first(), storyId).toBeAttached();
    const analysis = await ResultAsync.fromPromise(
      new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze(),
      () => `Accessibility analysis failed for ${storyId}`,
    );
    expect(analysis.isOk(), analysis.isErr() ? analysis.error : storyId).toBe(true);
    if (analysis.isErr()) continue;

    const seriousViolations = analysis.value.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(seriousViolations, storyId).toEqual([]);
  }
});
