import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { test as base, _electron, expect } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { ResultAsync } from "neverthrow";
import { packagedExecutable } from "./packagedExecutable.ts";

interface DesktopFixture {
  application: ElectronApplication; page: Page; folder: string;
  restart: () => Promise<{ application: ElectronApplication; page: Page } | null>;
}

async function stopApplication(application: ElectronApplication) {
  if (application.process().exitCode !== null) return;
  const closed = application.waitForEvent("close");
  await ResultAsync.fromPromise(application.evaluate(({ app }) => app.exit(0)), () => "Electron already closed");
  await closed;
}

function startApplication(executablePath: string | undefined, args: string[], env: Record<string, string>) {
  return ResultAsync.fromPromise(_electron.launch({ executablePath, args, env }), () => "Cannot launch Electron");
}

export const test = base.extend<{ desktop: DesktopFixture }>({
  desktop: async ({}, use, testInfo) => {
    const diagnostics: string[] = [];
    const observe = (page: Page) => {
      page.on("pageerror", (error) => diagnostics.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && diagnostics.length < 200) diagnostics.push(message.text());
      });
    };
    const created = await ResultAsync.fromPromise(fs.mkdtemp(path.join(os.tmpdir(), "pangea-boundary-e2e-")), () => "Cannot create fixture");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const resolved = await ResultAsync.fromPromise(fs.realpath(created.value), () => "Cannot resolve fixture directory");
    expect(resolved.isOk()).toBe(true);
    if (resolved.isErr()) return;
    const fixtureRoot = resolved.value;
    const folder = path.join(fixtureRoot, "project");
    const made = await ResultAsync.fromPromise(fs.mkdir(folder), () => "Cannot create project folder");
    expect(made.isOk()).toBe(true);
    const env = Object.fromEntries(Object.entries(process.env).flatMap(([key, value]) =>
      key === "ELECTRON_RUN_AS_NODE" || value === undefined ? [] : [[key, value]]));
    let executablePath = process.env.PANGEA_ELECTRON_EXECUTABLE;
    const packaged = process.env.PANGEA_ELECTRON_PACKAGED === "1";
    if (packaged && !executablePath) {
      const resolved = await packagedExecutable("release");
      expect(resolved.isErr() ? resolved.error : null).toBeNull();
      if (resolved.isErr()) return;
      executablePath = resolved.value;
    }
    const args = executablePath ? [] : [path.resolve(".")];
    args.push(`--user-data-dir=${path.join(fixtureRoot, "profile")}`);
    if (process.env.PANGEA_ELECTRON_HEADLESS === "1") args.push("--ozone-platform=headless", "--use-angle=swiftshader", "--enable-unsafe-swiftshader");
    const started = await startApplication(executablePath, args, env);
    expect(started.isOk()).toBe(true);
    if (started.isErr()) return;
    const application = started.value;
    let active: ElectronApplication | null = application;
    if (packaged) expect(await application.evaluate(({ app }) => app.isPackaged)).toBe(true);
    const page = await application.firstWindow();
    observe(page);
    await expect(page.getByRole("button", { name: "Project menu", exact: true })).toBeVisible();
    const restart = async () => {
      if (!active) return null;
      await stopApplication(active);
      active = null;
      const resumed = await startApplication(executablePath, args, env);
      expect(resumed.isOk()).toBe(true);
      if (resumed.isErr()) return null;
      active = resumed.value;
      const nextPage = await active.firstWindow();
      observe(nextPage);
      await expect(nextPage.getByRole("button", { name: "Project menu", exact: true })).toBeVisible();
      return { application: active, page: nextPage };
    };
    await use({ application, page, folder, restart });
    if (testInfo.status !== testInfo.expectedStatus) await testInfo.attach("renderer-errors", {
      body: diagnostics.join("\n"), contentType: "text/plain",
    });
    if (active) await stopApplication(active);
    const cleaned = await ResultAsync.fromPromise(fs.rm(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }), () => "Cannot clean fixture");
    expect(cleaned.isOk()).toBe(true);
  },
});
export { expect } from "@playwright/test";
