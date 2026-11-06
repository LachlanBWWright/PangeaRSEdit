import { test, expect } from "./desktopFixture.ts";

for (const { action, dirty } of [
  { action: "close", dirty: false }, { action: "close", dirty: true },
  { action: "quit", dirty: false }, { action: "quit", dirty: true },
]) {
  test(`${action} confirms renderer edits (project dirty: ${dirty}) and allows cancelling then discarding`, async ({ desktop }) => {
    const { application, page } = desktop;
    page.on("dialog", () => {});
    await page.evaluate(() => {
      window.addEventListener("beforeunload", (event) => event.preventDefault());
    });
    await page.getByRole("button", { name: "Project menu", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.evaluate((value) => window.pangeaDesktop?.request({ operation: "host.dirty", dirty: value }), dirty);
    await application.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => {
        console.log("native-close-confirmation");
        return { response: 0, checkboxChecked: false };
      };
      dialog.showMessageBoxSync = () => {
        console.log("native-close-confirmation");
        return 0;
      };
    });
    const shown = application.waitForEvent("console", {
      predicate: (message) => message.text() === "native-close-confirmation", timeout: 5000,
    });
    await application.evaluate(({ BrowserWindow, app }, operation) => {
      if (operation === "quit") app.quit();
      else BrowserWindow.getAllWindows()[0]?.close();
    }, action);
    await shown;
    await expect(page.getByRole("button", { name: "Project menu", exact: true })).toBeVisible();
    await application.evaluate(({ dialog }) => {
      dialog.showMessageBoxSync = () => 1;
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    });
    const closed = page.waitForEvent("close");
    await application.evaluate(({ BrowserWindow, app }, operation) => {
      if (operation === "quit") app.quit();
      else BrowserWindow.getAllWindows()[0]?.close();
    }, action);
    await closed;
  });
}
