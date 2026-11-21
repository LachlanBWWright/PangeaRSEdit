import { afterEach, expect, it, vi } from "vitest";
import { fetchIceServers } from "./iceServers";

afterEach(() => vi.unstubAllGlobals());

it("keeps the TURN server when an unauthenticated STUN entry has null credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    iceServers: [
      { urls: ["stun:example.test:3478"], username: null, credential: null },
      { urls: ["turn:example.test:3478"], username: "local-test", credential: "temporary" },
    ],
  })));

  const result = await fetchIceServers("lobby-id");
  expect(result.isOk() ? result.value : result.error).toEqual([
    { urls: ["stun:example.test:3478"], username: undefined, credential: undefined },
    { urls: ["turn:example.test:3478"], username: "local-test", credential: "temporary" },
  ]);
});
