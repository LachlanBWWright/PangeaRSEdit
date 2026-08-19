import { describe, expect, it } from "vitest";
import {
  type DeterminismReplayResult,
  runCroMagDeterminismReplay,
  runNanosaur2DeterminismReplay,
  type NetworkInputFrame,
} from "@/multiplayer/determinism";

function buildInputScript(frameCount: number, phaseOffset: number): NetworkInputFrame[] {
  const script: NetworkInputFrame[] = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    const phase = (frame + phaseOffset) % 240;
    script.push({
      throttle: phase < 180 ? 1 : 0.45,
      steer: phase < 120 ? 0.4 : -0.35,
      brake: phase >= 220 ? 1 : 0,
      fire: phase % 90 === 0 ? 1 : 0,
    });
  }
  return script;
}

function expectReplayAligned(
  hostReplay: DeterminismReplayResult,
  clientReplay: DeterminismReplayResult,
): void {
  expect(hostReplay.frameCount).toBe(clientReplay.frameCount);
  expect(hostReplay.hashSamples).toEqual(clientReplay.hashSamples);

  const hostPlayer0 = hostReplay.players[0];
  const clientPlayer0 = clientReplay.players[0];
  const hostPlayer1 = hostReplay.players[1];
  const clientPlayer1 = clientReplay.players[1];

  expect(hostPlayer0).toBeDefined();
  expect(clientPlayer0).toBeDefined();
  expect(hostPlayer1).toBeDefined();
  expect(clientPlayer1).toBeDefined();

  if (!hostPlayer0 || !clientPlayer0 || !hostPlayer1 || !clientPlayer1) {
    return;
  }

  expect(Math.abs(hostPlayer0.x - clientPlayer0.x)).toBeLessThanOrEqual(0.0001);
  expect(Math.abs(hostPlayer0.z - clientPlayer0.z)).toBeLessThanOrEqual(0.0001);
  expect(Math.abs(hostPlayer1.x - clientPlayer1.x)).toBeLessThanOrEqual(0.0001);
  expect(Math.abs(hostPlayer1.z - clientPlayer1.z)).toBeLessThanOrEqual(0.0001);
}

describe("multiplayer determinism replays", () => {
  it("keeps Cro-Mag host/client in sync for 3-minute equivalent replay", () => {
    const frames = 60 * 60 * 3;
    const hostInputs = buildInputScript(frames, 0);
    const guestInputs = buildInputScript(frames, 30);

    const hostReplay = runCroMagDeterminismReplay(
      frames,
      1_234_567,
      hostInputs,
      guestInputs,
    );
    const clientReplay = runCroMagDeterminismReplay(
      frames,
      1_234_567,
      hostInputs,
      guestInputs,
    );

    expectReplayAligned(hostReplay, clientReplay);
    expect(hostReplay.hashSamples).toHaveLength(frames / 60);
  });

  it("keeps Nanosaur 2 host/client in sync for 3-minute equivalent replay", () => {
    const frames = 60 * 60 * 3;
    const hostInputs = buildInputScript(frames, 10);
    const guestInputs = buildInputScript(frames, 75);

    const hostReplay = runNanosaur2DeterminismReplay(
      frames,
      987_654,
      hostInputs,
      guestInputs,
    );
    const clientReplay = runNanosaur2DeterminismReplay(
      frames,
      987_654,
      hostInputs,
      guestInputs,
    );

    expectReplayAligned(hostReplay, clientReplay);
    expect(hostReplay.hashSamples).toHaveLength(frames / 60);
  });
});
