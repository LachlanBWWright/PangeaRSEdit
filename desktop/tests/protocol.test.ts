import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { EditorAssets } from "../src/editorAssets.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const electron = vi.hoisted(() => ({
  handle: vi.fn<(scheme: string, handler: (request: Request) => Promise<Response>) => void>(),
  fetch: vi.fn<(url: string) => Promise<Response>>(),
}));
vi.mock("electron", () => ({ protocol: { handle: electron.handle }, net: { fetch: electron.fetch } }));
import { registerRendererProtocol } from "../src/protocol.ts";

const root = useTemporaryDirectory();

function setup() {
  electron.handle.mockClear();
  electron.fetch.mockReset().mockResolvedValue(new Response("asset bytes"));
  const project = new ProjectStore(path.join(root(), "recovery"));
  const assets = new EditorAssets(path.join(root(), "games"));
  registerRendererProtocol(root(), project, assets);
  const handler = electron.handle.mock.calls[0]?.[1];
  expect(handler).toBeDefined();
  return { handler, project, assets };
}

describe("private asset protocol", () => {
  it("prefers selected native data over bundled copies and reports missing native assets explicitly", async () => {
    const { handler, assets } = setup();
    if (!handler) return;
    const dataRoot = path.join(root(), "original");
    await writeFixture(dataRoot, "models/level.bg3d", "native");
    await writeFixture(root(), "games/ottomatic/models/level.bg3d", "bundled");
    await writeFixture(root(), "games/ottomatic/models/missing.bg3d", "bundled only");
    await assets.register("OttoMatic", "original", dataRoot, {
      source: "upstream", dataRoot, releaseUrl: "https://example.com/data.zip",
    });
    const response = await handler(new Request("pangea://editor/games/ottomatic/models/level.bg3d"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Pangea-Asset-Source")).toBe("native:OttoMatic");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(electron.fetch).toHaveBeenCalledWith(pathToFileURL(path.join(dataRoot, "models/level.bg3d")).href);
    const missing = await handler(new Request("pangea://editor/games/ottomatic/models/missing.bg3d"));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ code: "missing" });
    expect(electron.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["/", "/index.html", "/PangeaRSEdit/index.html"])("serves renderer entry point %s with security headers", async (route) => {
    await writeFixture(root(), "index.html", "renderer");
    const { handler } = setup();
    if (!handler) return;
    const response = await handler(new Request(`pangea://editor${route}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset bytes");
    expect(electron.fetch).toHaveBeenCalledWith(pathToFileURL(path.join(root(), "index.html")).href);
    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(response.headers.get("Cross-Origin-Embedder-Policy")).toBe("require-corp");
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(response.headers.get("Content-Security-Policy")).toContain("connect-src 'self' blob: https: wss:");
  });

  it.each([
    { url: "pangea://elsewhere/index.html", method: "GET", status: 403 },
    { url: "pangea://editor/index.html", method: "POST", status: 403 },
    { url: "pangea://editor/.git/config", method: "GET", status: 403 },
    { url: "pangea://editor/%2e%2e%2fsecret", method: "GET", status: 403 },
    { url: "pangea://editor/%ZZ", method: "GET", status: 400 },
    { url: "pangea://editor/missing", method: "GET", status: 404 },
    { url: "pangea://editor/project/file", method: "GET", status: 404 },
  ])("rejects $method $url", async ({ url, method, status }) => {
    const { handler } = setup();
    if (!handler) return;
    expect((await handler(new Request(url, { method }))).status).toBe(status);
    expect(electron.fetch).not.toHaveBeenCalled();
  });

  it("returns WASM headers and no body for HEAD", async () => {
    await writeFixture(root(), "codec.wasm", "wasm");
    const { handler } = setup();
    if (!handler) return;
    const response = await handler(new Request("pangea://editor/codec.wasm", { method: "HEAD" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/wasm");
    expect(await response.text()).toBe("");
  });

  it("serves project files as binary and does not fall back to installed assets", async () => {
    const { handler, project, assets } = setup();
    if (!handler) return;
    expect((await project.create(root(), "Protocol", "Bugdom")).isOk()).toBe(true);
    await writeFixture(root(), "Data/Scripts/user.lua", "user module");
    const resolve = vi.spyOn(assets, "resolve");
    const response = await handler(new Request("pangea://editor/project/Data/Scripts/user.lua"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    expect((await handler(new Request("pangea://editor/project/absent"))).status).toBe(404);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("resolves optional installed assets only when the renderer asset is absent", async () => {
    const { handler, assets } = setup();
    if (!handler) return;
    const installed = path.join(root(), "stock");
    await writeFixture(installed, "assets/ottoMatic/terrain/level.ter", "stock level");
    expect((await assets.register("OttoMatic", "v1", installed)).isOk()).toBe(true);
    expect((await handler(new Request("pangea://editor/assets/ottoMatic/terrain/level.ter"))).status).toBe(200);
    expect(electron.fetch).toHaveBeenCalledWith(pathToFileURL(path.join(installed, "assets/ottoMatic/terrain/level.ter")).href);
  });
});
