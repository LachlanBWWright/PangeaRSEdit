import * as fs from "node:fs/promises";
import path from "node:path";
import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";
import { io, projectPath } from "./files.ts";
import { Result } from "neverthrow";
import type { ProjectStore } from "./projectStore.ts";
import type { EditorAssets } from "./editorAssets.ts";

export const APP_ORIGIN = "pangea://editor";

export function registerRendererProtocol(rendererRoot: string, project: ProjectStore, assets: EditorAssets) {
  protocol.handle("pangea", async (request) => {
    const parsedUrl = Result.fromThrowable(() => new URL(request.url), () => "Invalid URL")();
    if (parsedUrl.isErr()) return new Response(null, { status: 400 });
    const url = parsedUrl.value;
    if (url.host !== "editor" || !["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 403 });
    const projectAsset = url.pathname.startsWith("/project/");
    const root = projectAsset ? project.folder() : rendererRoot;
    if (!root) return new Response(null, { status: 404 });
    const decoded = url.pathname.replace(/^\/PangeaRSEdit\//, "/");
    const parsedPath = Result.fromThrowable(() => decodeURIComponent(decoded.slice(projectAsset ? 9 : 1)), () => "Invalid URL path")();
    if (parsedPath.isErr()) return new Response(null, { status: 400 });
    const relative = decoded === "/" ? "index.html" : parsedPath.value;
    const target = await projectPath(root, relative);
    if (target.isErr()) return new Response(null, { status: 403 });
    const info = await io(() => fs.stat(target.value), "Missing asset");
    const installedAsset = !projectAsset && (info.isErr() || !info.value.isFile()) ? await assets.resolve(relative) : null;
    if (!installedAsset && (info.isErr() || !info.value.isFile())) return new Response(null, { status: 404 });
    const fetched = await io(() => net.fetch(pathToFileURL(installedAsset ?? target.value).href), "Cannot load asset");
    if (fetched.isErr()) return new Response(null, { status: 500 });
    const response = fetched.value;
    const headers = new Headers(response.headers);
    if (projectAsset) headers.set("Content-Type", "application/octet-stream");
    if (path.extname(target.value) === ".wasm") headers.set("Content-Type", "application/wasm");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    // Bundled ndarray/cwise image codecs compile kernels with Function at startup.
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; media-src 'self' blob: data:; connect-src 'self' https: wss:; font-src 'self' data:");
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  });
}
