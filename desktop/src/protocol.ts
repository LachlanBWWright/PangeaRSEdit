import * as fs from "node:fs/promises";
import path from "node:path";
import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";
import { io, projectPath } from "./files.ts";
import { Result } from "neverthrow";
import type { ProjectStore } from "./projectStore.ts";
import type { EditorAssets } from "./editorAssets.ts";
import { gameAssetRoute } from "./gameAssetRoutes.ts";

export const APP_ORIGIN = "pangea://editor";

export function registerRendererProtocol(rendererRoot: string, project: ProjectStore, assets: EditorAssets) {
  protocol.handle("pangea", async (request) => {
    const parsedUrl = Result.fromThrowable(() => new URL(request.url), () => "Invalid URL")();
    if (parsedUrl.isErr()) return new Response(null, { status: 400 });
    const url = parsedUrl.value;
    if (url.host !== "editor" || !["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 403 });
    const parsedPath = Result.fromThrowable(() => decodeURIComponent(url.pathname.replace(/^\/PangeaRSEdit\//, "/")), () => "Invalid URL path")();
    if (parsedPath.isErr()) return new Response(null, { status: 400 });
    const decoded = parsedPath.value;
    const projectAsset = decoded.startsWith("/project/");
    const root = projectAsset ? project.folder() : rendererRoot;
    if (!root) return new Response(null, { status: 404 });
    const relative = decoded === "/" ? "index.html" : decoded.slice(projectAsset ? 9 : 1);
    const target = await projectPath(root, relative);
    if (target.isErr()) return new Response(null, { status: 403 });
    const gameAsset = !projectAsset && gameAssetRoute(relative) !== null;
    const resolved = gameAsset ? await assets.resolveAsset(relative) : null;
    if (resolved?.isErr()) {
      const status = ["missing", "not-installed"].includes(resolved.error.code) ? 404
        : resolved.error.code === "ambiguous" ? 409 : resolved.error.code === "invalid" ? 403 : 500;
      return Response.json(resolved.error, { status, headers: { "Cache-Control": "no-store" } });
    }
    const info = await io(() => fs.stat(target.value), "Missing asset");
    const installedAsset = resolved?.isOk() ? resolved.value?.path ?? null
      : !projectAsset && (info.isErr() || !info.value.isFile()) ? await assets.resolve(relative) : null;
    if (!installedAsset && (info.isErr() || !info.value.isFile())) return new Response(null, { status: 404 });
    const fetched = await io(() => net.fetch(pathToFileURL(installedAsset ?? target.value).href), "Cannot load asset");
    if (fetched.isErr()) return new Response(null, { status: 500 });
    const response = fetched.value;
    const headers = new Headers(response.headers);
    if (gameAsset || projectAsset) headers.set("Cache-Control", "no-store");
    if (resolved?.isOk() && resolved.value) headers.set("X-Pangea-Asset-Source", `${resolved.value.source}:${resolved.value.game}`);
    if (projectAsset) headers.set("Content-Type", "application/octet-stream");
    if (path.extname(target.value) === ".wasm") headers.set("Content-Type", "application/wasm");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    // Bundled ndarray/cwise image codecs compile kernels with Function at startup.
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; media-src 'self' blob: data:; connect-src 'self' blob: https: wss:; font-src 'self' data:");
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  });
}
