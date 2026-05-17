import { describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { launchCroMagNetworkMatch } from "@/multiplayer/gameLaunch/cromagLaunch";
import { launchNanosaur2NetworkMatch } from "@/multiplayer/gameLaunch/nanosaur2Launch";

const validMatchConfig = {
  matchId: "9bf7bd69-574e-45fe-b81a-9fdd4ec0ecdc",
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "ice-ramp",
  seed: 12345,
  hostParticipantId: "host-1",
  players: [
    {
      participantId: "host-1",
      playerIndex: 0,
      displayName: "Host",
    },
    {
      participantId: "guest-1",
      playerIndex: 1,
      displayName: "Guest",
    },
  ],
};

describe("multiplayer game launch adapters", () => {
  it("launches Cro-Mag with validated config", () => {
    const installBridge = vi.fn(() => ok(undefined));
    const startMatch = vi.fn(() => ok(undefined));

    const result = launchCroMagNetworkMatch({
      matchConfig: validMatchConfig,
      installBridge,
      startNetworkMatch: startMatch,
    });

    expect(result.isOk()).toBe(true);
    expect(installBridge).toHaveBeenCalledTimes(1);
    expect(startMatch).toHaveBeenCalledTimes(1);
  });

  it("launches Nanosaur 2 with validated config", () => {
    const installBridge = vi.fn(() => ok(undefined));
    const startMatch = vi.fn(() => ok(undefined));

    const result = launchNanosaur2NetworkMatch({
      matchConfig: {
        ...validMatchConfig,
        gameId: "nanosaur2",
      },
      installBridge,
      startNetworkMatch: startMatch,
    });

    expect(result.isOk()).toBe(true);
    expect(installBridge).toHaveBeenCalledTimes(1);
    expect(startMatch).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid launch config", () => {
    const result = launchCroMagNetworkMatch({
      matchConfig: {
        ...validMatchConfig,
        matchId: "bad-id",
      },
      installBridge: () => ok(undefined),
      startNetworkMatch: () => ok(undefined),
    });

    expect(result.isErr()).toBe(true);
  });
});
