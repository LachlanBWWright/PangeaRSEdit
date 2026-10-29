import { test, expect } from "./desktopFixture.ts";

test("cancelled folder selection leaves the editor usable without binding a project", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
  });
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Open Project/ }).click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  const result = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "project.inspect" }));
  expect(result).toMatchObject({ ok: false, error: { code: "no-project" } });
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: /New Project/ })).toBeEnabled();
});

test("real IPC rejects malformed operations, paths, and binary payloads", async ({ desktop }) => {
  const { application } = desktop;
  const replies = await application.evaluate(async ({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0]?.webContents;
    if (!contents) return [];
    const requests = [
      { operation: "shell.exec", command: "echo unsafe" },
      { operation: "project.read", paths: ["../escape"] },
      { operation: "project.backup", manifest: {}, files: [{ path: "user.lua", bytes: [1, 2] }] },
    ];
    const responses: unknown[] = [];
    for (const request of requests) {
      const response: unknown = await contents.executeJavaScript(`window.pangeaDesktop.request(${JSON.stringify(request)})`);
      responses.push(response);
    }
    return responses;
  });
  expect(replies).toHaveLength(3);
  for (const reply of replies) expect(reply).toMatchObject({ ok: false, error: { code: "invalid" } });
});

test("dirty projects cannot be replaced through IPC and closing defaults to keeping edits", async ({ desktop }) => {
  const { application, page, folder } = desktop;
  await application.evaluate(({ dialog }, selectedFolder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selectedFolder] });
    dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
  }, folder);
  const created = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "project.create", name: "Guarded", game: "OttoMatic" }));
  expect(created).toMatchObject({ ok: true });
  await page.evaluate(() => window.pangeaDesktop?.request({ operation: "host.dirty", dirty: true }));
  const blocked = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "project.open" }));
  expect(blocked).toMatchObject({ ok: false, error: { code: "dirty" } });
  const dialogShown = application.waitForEvent("console", { predicate: (message) => message.text() === "close-guard-shown" });
  await application.evaluate(({ BrowserWindow, dialog }) => {
    dialog.showMessageBox = async () => {
      console.log("close-guard-shown");
      return { response: 0, checkboxChecked: false };
    };
    BrowserWindow.getAllWindows()[0]?.close();
  });
  await dialogShown;
  expect(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  const inspected = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "project.inspect" }));
  expect(inspected).toMatchObject({ ok: true, value: { manifest: { name: "Guarded" } } });
});
