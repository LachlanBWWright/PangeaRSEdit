import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { test as base, _electron, expect } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { ResultAsync } from "neverthrow";

interface DesktopFixture { application: ElectronApplication; page: Page; folder: string }

export const test = base.extend<{ desktop: DesktopFixture }>({
  desktop: async ({}, use) => {
    const created = await ResultAsync.fromPromise(fs.mkdtemp(path.join(os.tmpdir(), "pangea-boundary-e2e-")), () => "Cannot create fixture");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const folder = path.join(created.value, "project");
    const made = await ResultAsync.fromPromise(fs.mkdir(folder), () => "Cannot create project folder");
    expect(made.isOk()).toBe(true);
    const env = Object.fromEntries(Object.entries(process.env).flatMap(([key, value]) =>
      key === "ELECTRON_RUN_AS_NODE" || value === undefined ? [] : [[key, value]]));
    const executablePath = process.env.PANGEA_ELECTRON_EXECUTABLE;
    const args = executablePath ? [] : [path.resolve(".")];
    args.push(`--user-data-dir=${path.join(created.value, "profile")}`);
    if (process.env.PANGEA_ELECTRON_HEADLESS === "1") args.push("--ozone-platform=headless");
    const started = await ResultAsync.fromPromise(_electron.launch({ executablePath, args, env }), () => "Cannot launch Electron");
    expect(started.isOk()).toBe(true);
    if (started.isErr()) return;
    const application = started.value;
    const page = await application.firstWindow();
    await expect(page.getByRole("button", { name: "Project menu", exact: true })).toBeVisible();
    await use({ application, page, folder });
    const closed = application.waitForEvent("close");
    await ResultAsync.fromPromise(application.evaluate(({ app }) => app.exit(0)), () => "Electron already closed");
    await closed;
    const cleaned = await ResultAsync.fromPromise(fs.rm(created.value, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }), () => "Cannot clean fixture");
    expect(cleaned.isOk()).toBe(true);
  },
});
export { expect } from "@playwright/test";
