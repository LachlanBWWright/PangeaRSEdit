export interface NetworkInputFrame {
  readonly throttle: number;
  readonly steer: number;
  readonly brake: number;
  readonly fire: number;
}

export interface DeterminismHashSample {
  readonly frame: number;
  readonly hash: number;
}

export interface DeterminismPlayerState {
  readonly x: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
  readonly health: number;
  readonly shield: number;
  readonly weapon: number;
  readonly lap: number;
  readonly checkpoint: number;
}

export interface DeterminismReplayResult {
  readonly frameCount: number;
  readonly hashSamples: readonly DeterminismHashSample[];
  readonly players: readonly DeterminismPlayerState[];
}

interface MutableReplayPlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  health: number;
  shield: number;
  weapon: number;
  lap: number;
  checkpoint: number;
}

function nextLcg(state: number): number {
  return ((state * 1664525) + 1013904223) >>> 0;
}

function boundedInt(value: number, max: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function toHashInt(value: number): number {
  return Math.round(value * 1000);
}

function foldHash(hash: number, value: number): number {
  const mixed = (hash ^ (value >>> 0)) >>> 0;
  return Math.imul(mixed, 16777619) >>> 0;
}

function hashPlayerState(
  hash: number,
  player: MutableReplayPlayerState,
  randomState: number,
): number {
  let nextHash = hash;
  nextHash = foldHash(nextHash, toHashInt(player.x));
  nextHash = foldHash(nextHash, toHashInt(player.z));
  nextHash = foldHash(nextHash, toHashInt(player.vx));
  nextHash = foldHash(nextHash, toHashInt(player.vz));
  nextHash = foldHash(nextHash, player.health);
  nextHash = foldHash(nextHash, player.shield);
  nextHash = foldHash(nextHash, player.weapon);
  nextHash = foldHash(nextHash, player.lap);
  nextHash = foldHash(nextHash, player.checkpoint);
  nextHash = foldHash(nextHash, randomState);
  return nextHash;
}

function createInitialPlayers(): [MutableReplayPlayerState, MutableReplayPlayerState] {
  return [
    {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      health: 100,
      shield: 100,
      weapon: 20,
      lap: 0,
      checkpoint: 0,
    },
    {
      x: 2,
      z: 0,
      vx: 0,
      vz: 0,
      health: 100,
      shield: 100,
      weapon: 20,
      lap: 0,
      checkpoint: 0,
    },
  ];
}

function normalizeInput(input: NetworkInputFrame): NetworkInputFrame {
  return {
    throttle: Math.max(0, Math.min(1, input.throttle)),
    steer: Math.max(-1, Math.min(1, input.steer)),
    brake: input.brake === 0 ? 0 : 1,
    fire: input.fire === 0 ? 0 : 1,
  };
}

function stepCroMagPlayer(
  state: MutableReplayPlayerState,
  input: NetworkInputFrame,
  randomOffset: number,
): void {
  const acceleration = (input.throttle * 0.022) - (input.brake * 0.03);
  const steer = input.steer * 0.015;
  state.vx = (state.vx * 0.96) + steer + (randomOffset * 0.0004);
  state.vz = (state.vz * 0.965) + acceleration;
  state.x += state.vx;
  state.z += state.vz;

  if (input.fire === 1 && state.weapon > 0) {
    state.weapon = boundedInt(state.weapon - 1, 20);
  }

  if (state.z > (state.lap + 1) * 450) {
    state.lap += 1;
    state.checkpoint = 0;
  } else if (state.z > (state.checkpoint + 1) * 75) {
    state.checkpoint += 1;
  }
}

function stepNanosaur2Player(
  state: MutableReplayPlayerState,
  input: NetworkInputFrame,
  randomOffset: number,
): void {
  const acceleration = (input.throttle * 0.026) - (input.brake * 0.021);
  const steer = input.steer * 0.012;
  state.vx = (state.vx * 0.95) + steer + (randomOffset * 0.0005);
  state.vz = (state.vz * 0.968) + acceleration;
  state.x += state.vx;
  state.z += state.vz;

  if (input.fire === 1 && state.weapon > 0) {
    state.weapon = boundedInt(state.weapon - 1, 20);
  }

  if (state.z > (state.lap + 1) * 500) {
    state.lap += 1;
    state.checkpoint = 0;
  } else if (state.z > (state.checkpoint + 1) * 80) {
    state.checkpoint += 1;
  }
}

function toReadonlyPlayerState(
  player: MutableReplayPlayerState,
): DeterminismPlayerState {
  return {
    x: player.x,
    z: player.z,
    vx: player.vx,
    vz: player.vz,
    health: player.health,
    shield: player.shield,
    weapon: player.weapon,
    lap: player.lap,
    checkpoint: player.checkpoint,
  };
}

type StepFn = (
  state: MutableReplayPlayerState,
  input: NetworkInputFrame,
  randomOffset: number,
) => void;

function runReplay(
  frameCount: number,
  seed: number,
  hostInputs: readonly NetworkInputFrame[],
  guestInputs: readonly NetworkInputFrame[],
  stepFn: StepFn,
): DeterminismReplayResult {
  const players = createInitialPlayers();
  const hashSamples: DeterminismHashSample[] = [];
  let randomState = seed >>> 0;
  let currentHash = 2166136261;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const hostInput = normalizeInput(hostInputs[frame] ?? hostInputs[hostInputs.length - 1] ?? {
      throttle: 0,
      steer: 0,
      brake: 0,
      fire: 0,
    });
    const guestInput = normalizeInput(guestInputs[frame] ?? guestInputs[guestInputs.length - 1] ?? {
      throttle: 0,
      steer: 0,
      brake: 0,
      fire: 0,
    });

    randomState = nextLcg(randomState);
    const hostNoise = (randomState & 0xffff) - 32768;
    randomState = nextLcg(randomState);
    const guestNoise = (randomState & 0xffff) - 32768;

    stepFn(players[0], hostInput, hostNoise);
    stepFn(players[1], guestInput, guestNoise);

    currentHash = foldHash(currentHash, frame);
    currentHash = hashPlayerState(currentHash, players[0], randomState);
    currentHash = hashPlayerState(currentHash, players[1], randomState);

    if ((frame + 1) % 60 === 0) {
      hashSamples.push({
        frame: frame + 1,
        hash: currentHash >>> 0,
      });
    }
  }

  return {
    frameCount,
    hashSamples,
    players: [toReadonlyPlayerState(players[0]), toReadonlyPlayerState(players[1])],
  };
}

export function runCroMagDeterminismReplay(
  frameCount: number,
  seed: number,
  hostInputs: readonly NetworkInputFrame[],
  guestInputs: readonly NetworkInputFrame[],
): DeterminismReplayResult {
  return runReplay(frameCount, seed, hostInputs, guestInputs, stepCroMagPlayer);
}

export function runNanosaur2DeterminismReplay(
  frameCount: number,
  seed: number,
  hostInputs: readonly NetworkInputFrame[],
  guestInputs: readonly NetworkInputFrame[],
): DeterminismReplayResult {
  return runReplay(frameCount, seed, hostInputs, guestInputs, stepNanosaur2Player);
}

