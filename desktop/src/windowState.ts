import path from "node:path";
import * as fs from "node:fs/promises";
import { screen, type BrowserWindow } from "electron";
import { z } from "zod";
import { atomicWrite, io, parseJson } from "./files.ts";

const windowStateSchema = z.object({
  x: z.number().int(), y: z.number().int(),
  width: z.number().int().min(900).max(16384), height: z.number().int().min(640).max(16384),
  maximized: z.boolean(),
});
export type WindowState = z.infer<typeof windowStateSchema>;

export async function readWindowState(root: string): Promise<WindowState | null> {
  const text = await io(() => fs.readFile(path.join(root, "window-state.json"), "utf8"), "Cannot read window state");
  if (text.isErr()) return null;
  const json = parseJson(text.value);
  if (json.isErr()) return null;
  const state = windowStateSchema.safeParse(json.value);
  if (!state.success) return null;
  const visible = screen.getAllDisplays().some(({ workArea }) =>
    state.data.x + state.data.width > workArea.x + Math.min(80, workArea.width / 2)
    && state.data.x < workArea.x + workArea.width - Math.min(80, workArea.width / 2)
    && state.data.y >= workArea.y && state.data.y < workArea.y + workArea.height - Math.min(80, workArea.height / 2));
  return visible ? state.data : null;
}

export function rememberWindowState(window: BrowserWindow, root: string, remember: (state: WindowState) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function persist() {
    clearTimeout(timer);
    if (window.isDestroyed() || window.isMinimized()) return;
    const state: WindowState = { ...window.getNormalBounds(), maximized: window.isMaximized() };
    remember(state);
    void atomicWrite(path.join(root, "window-state.json"), new TextEncoder().encode(JSON.stringify(state)));
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(persist, 250); }
  window.on("resize", schedule);
  window.on("move", schedule);
  window.on("maximize", schedule);
  window.on("unmaximize", schedule);
  window.on("close", persist);
  window.on("closed", () => clearTimeout(timer));
}
