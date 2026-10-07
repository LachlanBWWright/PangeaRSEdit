import { Result } from "neverthrow";

export function scriptUriPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

export function scriptDecodedPath(encodedPath: string): string | null {
  const decoded = Result.fromThrowable(decodeURIComponent, () => "Invalid URI escape")(encodedPath);
  if (decoded.isErr()) return null;
  const path = decoded.value;
  if (path.length === 0 || path.startsWith("/") || path.includes("\\")) return null;
  return path.split("/").some((part) => part === ".." || part === "." || part.length === 0) ? null : path;
}

export function scriptEditorUri(gameId: string, filePath: string): string {
  return `file:///workspace/${encodeURIComponent(gameId)}/${scriptUriPath(filePath)}`;
}

export function scriptEditorPath(uri: string, gameId: string): string | null {
  const prefix = scriptEditorUri(gameId, "");
  if (!uri.startsWith(prefix)) return null;
  return scriptDecodedPath(uri.slice(prefix.length));
}
