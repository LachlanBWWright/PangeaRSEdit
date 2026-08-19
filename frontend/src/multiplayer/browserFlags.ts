function readSearchParam(name: string): string | null {
  const location = globalThis.window?.location;
  if (!location) {
    return null;
  }
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

export function shouldShowDebugOverlay(): boolean {
  return readSearchParam("multiplayerDebug") === "1";
}

export function shouldUseMockHub(): boolean {
  return readSearchParam("multiplayerMockHub") === "1";
}

export function shouldForceLocalTransport(): boolean {
  return readSearchParam("multiplayerForceLocal") === "1";
}
