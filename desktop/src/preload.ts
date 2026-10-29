import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "@pangea/desktop-contracts";

function subscribe(channel: string, listener: (value: unknown) => void) {
  const handler = (_event: Electron.IpcRendererEvent, value: unknown) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}
const bridge: DesktopBridge = {
  platform: process.platform,
  security: { sandboxed: process.sandboxed ?? false, contextIsolated: process.contextIsolated ?? false },
  request: (request) => ipcRenderer.invoke("pangea:request", request),
  onProjectChange: (listener) => subscribe("pangea:project-change", listener),
  onTransfer: (listener) => subscribe("pangea:transfer", listener),
  onCommand: (listener) => subscribe("pangea:command", listener),
  onGameRun: (listener) => subscribe("pangea:game-runs", listener),
  onAssetProgress: (listener) => subscribe("pangea:asset-progress", listener),
};
contextBridge.exposeInMainWorld("pangeaDesktop", bridge);
