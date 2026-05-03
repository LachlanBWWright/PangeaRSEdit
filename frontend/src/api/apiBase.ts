function normalizeBasePath(baseUrl: string): string {
  if (baseUrl === "/") {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

/** Builds a BASE_URL-aware API path that works when the app is hosted under a subpath. */
export function buildApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBasePath(import.meta.env.BASE_URL)}${normalizedPath}`;
}

/** Resolves a BASE_URL-aware API path into an absolute URL for the current origin. */
export function buildApiUrl(path: string): string {
  return new URL(buildApiPath(path), window.location.origin).toString();
}
