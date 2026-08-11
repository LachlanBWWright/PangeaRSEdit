import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleSignInUrl, getMe, signOut } from "@/api/authApi";
import {
  createSavedLevel,
  deleteSavedLevel,
  listSavedLevels,
  loadSavedLevel,
  updateSavedLevel,
} from "@/api/savedLevelsApi";

const summary = {
  id: "saved-1",
  gameName: "Bugdom",
  levelId: "level-1",
  displayName: "My level",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  payloadVersion: 1,
};
const detail = { ...summary, payload: { tiles: [1, 2, 3] } };

function respond(data: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("auth API", () => {
  it("parses a valid current-user response and sends cookie credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond({ id: "user-1", displayName: "Player", email: "player@example.com" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getMe();
    expect(result.isOk() && result.value.displayName).toBe("Player");
    expect(fetchMock).toHaveBeenCalledWith("/api/me", { method: "GET", credentials: "include" });
  });

  it("reports schema, HTTP, and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(respond({ id: 4 }, 200)).mockResolvedValueOnce(respond({ message: "Not signed in" }, 401)).mockRejectedValueOnce(new Error("offline")));
    const invalid = await getMe();
    expect(invalid.isErr() && invalid.error.code).toBe("schema.invalid");
    const rejected = await getMe();
    expect(rejected.isErr() && rejected.error).toEqual({ code: "auth.error", message: "Not signed in", status: 401 });
    const offline = await getMe();
    expect(offline.isErr() && offline.error.code).toBe("network.unreachable");
  });

  it("signs out and generates encoded OAuth return URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(null, 204));
    vi.stubGlobal("fetch", fetchMock);
    expect((await signOut()).isOk()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-out", { method: "POST", credentials: "include" });
    expect(getGoogleSignInUrl()).toBe("/api/auth/google/sign-in");
    expect(getGoogleSignInUrl("/levels?a=1&b=2")).toBe("/api/auth/google/sign-in?returnUrl=%2Flevels%3Fa%3D1%26b%3D2");
  });
});

describe("saved levels API", () => {
  it("lists and validates saved-level summaries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([summary]));
    vi.stubGlobal("fetch", fetchMock);
    const result = await listSavedLevels();
    expect(result.isOk() && result.value).toEqual([summary]);
    expect(fetchMock).toHaveBeenCalledWith("/api/saved-levels", { method: "GET", credentials: "include" });
  });

  it("creates levels with serialized JSON and parses details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(detail, 201));
    vi.stubGlobal("fetch", fetchMock);
    const input = { gameName: "Bugdom", levelId: "level-1", displayName: "My level", payload: { tiles: [1] } };
    const result = await createSavedLevel(input);
    expect(result.isOk() && result.value).toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith("/api/saved-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
  });

  it("loads, updates, and deletes encoded IDs", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respond(detail))
      .mockResolvedValueOnce(respond({ ...detail, displayName: "Updated" }))
      .mockResolvedValueOnce(respond(null, 204));
    vi.stubGlobal("fetch", fetchMock);
    expect((await loadSavedLevel("id/with spaces")).isOk()).toBe(true);
    expect((await updateSavedLevel("id/with spaces", { displayName: "Updated" })).isOk()).toBe(true);
    expect((await deleteSavedLevel("id/with spaces")).isOk()).toBe(true);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/api/saved-levels/id%2Fwith%20spaces",
      "/api/saved-levels/id%2Fwith%20spaces",
      "/api/saved-levels/id%2Fwith%20spaces",
    ]);
  });

  it("returns typed errors for invalid schemas, HTTP failures, and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(respond({ invalid: true }))
      .mockResolvedValueOnce(respond({ message: "Forbidden" }, 403))
      .mockRejectedValueOnce(new Error("offline")));
    const invalid = await listSavedLevels();
    expect(invalid.isErr() && invalid.error.code).toBe("schema.invalid");
    const forbidden = await listSavedLevels();
    expect(forbidden.isErr() && forbidden.error).toEqual({ code: "api.error", message: "Forbidden", status: 403 });
    const offline = await deleteSavedLevel("saved-1");
    expect(offline.isErr() && offline.error.code).toBe("network.unreachable");
  });

  it("rejects circular create and update payloads before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const created = await createSavedLevel({ gameName: "Bugdom", levelId: "one", displayName: "Circular", payload: circular });
    const updated = await updateSavedLevel("saved-1", { payload: circular });
    expect(created.isErr() && created.error.code).toBe("request.invalid");
    expect(updated.isErr() && updated.error.code).toBe("request.invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
