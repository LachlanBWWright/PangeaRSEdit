import { describe, expect, it } from "vitest";

import { MultiplayerReconnectPolicy } from "@/multiplayer/reconnectPolicy";

describe("MultiplayerReconnectPolicy", () => {
  it("continues retrying with a bounded delay after the initial backoff", () => {
    const policy = new MultiplayerReconnectPolicy();

    expect(
      policy.nextRetryDelayInMilliseconds({
        previousRetryCount: 0,
        elapsedMilliseconds: 0,
        retryReason: new Error("cold start"),
      }),
    ).toBe(0);
    expect(
      policy.nextRetryDelayInMilliseconds({
        previousRetryCount: 100,
        elapsedMilliseconds: 600_000,
        retryReason: new Error("still starting"),
      }),
    ).toBe(30_000);
  });
});
