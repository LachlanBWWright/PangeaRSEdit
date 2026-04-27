function normalizeBasePath(baseUrl: string): string {
  if (baseUrl === "/") {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBasePath(import.meta.env.BASE_URL)}${normalizedPath}`;
}

export function buildApiUrl(path: string): string {
  return new URL(buildApiPath(path), window.location.origin).toString();
}
