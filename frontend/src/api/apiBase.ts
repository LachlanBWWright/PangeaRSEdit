import { z } from "zod";

function normalizeBasePath(baseUrl: string): string {
  if (baseUrl === "/") {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function resolveApiBasePath(
  apiBasePath: unknown,
  appBaseUrl: string,
): string {
  const parsedApiBasePath = z.string().safeParse(apiBasePath);
  if (parsedApiBasePath.success) {
    return normalizeBasePath(parsedApiBasePath.data);
  }
  return normalizeBasePath(appBaseUrl);
}

/** Builds a BASE_URL-aware API path that works when the app is hosted under a subpath. */
export function buildApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePath = resolveApiBasePath(
    import.meta.env.VITE_API_BASE_PATH,
    import.meta.env.BASE_URL,
  );
  return `${basePath}${normalizedPath}`;
}

/** Resolves a BASE_URL-aware API path into an absolute URL for the current origin. */
export function buildApiUrl(path: string): string {
  const parsedApiOrigin = z
    .string()
    .url()
    .safeParse(import.meta.env.VITE_API_ORIGIN);
  const origin = parsedApiOrigin.success
    ? parsedApiOrigin.data
    : window.location.origin;
  return new URL(buildApiPath(path), origin).toString();
}
