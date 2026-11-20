import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { useTemporaryDirectory } from "./fixtures.ts";
import { readWindowState } from "../src/windowState.ts";

vi.mock("electron", () => ({ screen: { getAllDisplays: () => [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }] } }));
const root = useTemporaryDirectory();

it("restores validated window bounds and maximized state", async () => {
  const state = { x: 100, y: 50, width: 1200, height: 800, maximized: true };
  await fs.writeFile(path.join(root(), "window-state.json"), JSON.stringify(state));
  expect(await readWindowState(root())).toEqual(state);
});

it.each([
  "invalid json", JSON.stringify({ x: 0, y: 0, width: -1, height: 700, maximized: false }),
  JSON.stringify({ x: 4000, y: 0, width: 1200, height: 800, maximized: false }),
])("falls back safely for corrupt or offscreen state: %s", async (text) => {
  await fs.writeFile(path.join(root(), "window-state.json"), text);
  expect(await readWindowState(root())).toBeNull();
});
