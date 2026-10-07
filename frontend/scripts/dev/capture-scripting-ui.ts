import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { errAsync, Result, ResultAsync } from "neverthrow";
import { z } from "zod";

const output = process.env["SCRIPT_UI_CAPTURE_DIR"] ?? "/tmp/pangearsedit-scripting-ui-20261004";
const baseUrl = process.env["SCRIPT_UI_STORYBOOK_URL"] ?? "http://127.0.0.1:6006";

function external<T>(operation: () => Promise<T>): ResultAsync<T, string> {
  const message = (error: unknown) => {
    const parsed = z.object({ message: z.string() }).safeParse(error);
    return parsed.success ? parsed.data.message : "Storybook capture failed";
  };
  return Result.fromThrowable(operation, message)().asyncAndThen((promise) => ResultAsync.fromPromise(promise, message));
}

function openStory(page: Page, story: string, readyText: string): ResultAsync<void, string> {
  return external(() => page.goto(`${baseUrl}/iframe.html?id=${story}&viewMode=story`))
    .andThen(() => external(() => page.getByText(readyText, { exact: true }).waitFor()))
    .map(() => undefined);
}

function click(page: Page, role: "button" | "tab", name: string): ResultAsync<void, string> {
  return external(() => page.getByRole(role, { name, exact: true }).click());
}

function capture(page: Page, name: string): ResultAsync<void, string> {
  return external(() => page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return { viewport: innerWidth, content: document.documentElement.scrollWidth };
  })).andThen((width) => width.content > width.viewport + 1
    ? errAsync(`Horizontal overflow in ${name}: ${width.content} > ${width.viewport}`)
    : external(() => page.screenshot({ path: `${output}/${name}.png`, animations: "disabled" })).map(() => undefined));
}

function waitForCode(page: Page): ResultAsync<void, string> {
  return external(() => page.locator(".monaco-editor .view-lines").filter({ hasText: "hoverBeacon" }).waitFor()).map(() => undefined);
}

function captureDesktop(page: Page): ResultAsync<void, string> {
  return openStory(page, "pages-custom-objects--library-layout", "Shared item library")
    .andThen(() => capture(page, "library-desktop"))
    .andThen(() => click(page, "button", "Edit item script"))
    .andThen(() => waitForCode(page))
    .andThen(() => capture(page, "library-code-desktop"))
    .andThen(() => openStory(page, "scripts-level-workspace--populated", "Create and test behaviors"))
    .andThen(() => click(page, "tab", "Assignments"))
    .andThen(() => capture(page, "level-items-desktop"))
    .andThen(() => click(page, "tab", "Level events"))
    .andThen(() => capture(page, "level-events-desktop"))
    .andThen(() => click(page, "tab", "Code"))
    .andThen(() => waitForCode(page))
    .andThen(() => capture(page, "level-code-desktop"));
}

function captureNarrow(page: Page): ResultAsync<void, string> {
  return external(() => page.setViewportSize({ width: 390, height: 844 }))
    .andThen(() => openStory(page, "pages-custom-objects--library-layout", "Shared item library"))
    .andThen(() => capture(page, "library-narrow"))
    .andThen(() => click(page, "button", "Edit item script"))
    .andThen(() => waitForCode(page))
    .andThen(() => capture(page, "library-code-narrow"));
}

const launched = await external(() => mkdir(output, { recursive: true }))
  .andThen(() => external(() => chromium.launch({ headless: true })));
if (launched.isErr()) {
  process.stderr.write(`${launched.error}\n`);
  process.exitCode = 1;
} else {
  const browser = launched.value;
  const result = await external(() => browser.newPage({ viewport: { width: 1440, height: 900 } }))
    .andThen((page) => captureDesktop(page).andThen(() => captureNarrow(page)));
  const closed = await external(() => browser.close());
  if (result.isErr() || closed.isErr()) {
    process.stderr.write(`${result.isErr() ? result.error : closed.isErr() ? closed.error : "Capture failed"}\n`);
    process.exitCode = 1;
  } else process.stdout.write(`Saved seven production UI captures to ${output}\n`);
}
