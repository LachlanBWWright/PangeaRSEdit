import { type AnimationChannel, type Document } from "@gltf-transform/core";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { parseNativeRotations } from "./nativeRotationMetadata";

export const NATIVE_ANIMATION_KEYS = 60;
const TICKS_PER_SECOND = 30;

export function channelTimes(channel: AnimationChannel): number[] {
  return Array.from(channel.getSampler()?.getInput()?.getArray() ?? []);
}

export function sharedChannelTimes(channels: readonly AnimationChannel[]): number[] {
  return [...new Set(channels.flatMap(channelTimes))].sort((a, b) => a - b);
}

export function validateNativeAnimations(document: Document, maximumKeys = NATIVE_ANIMATION_KEYS, allowBaking = false): Result<void, string> {
  const skins = document.getRoot().listSkins();
  if (skins.length > 1) return err(`This asset contains ${skins.length} armatures. Export one armature and its meshes per native model.`);
  const joints = skins[0]?.listJoints() ?? [];
  for (const animation of document.getRoot().listAnimations()) {
    const label = animation.getName() || "Unnamed animation";
    for (const joint of joints) {
      const channels = animation.listChannels().filter((channel) => channel.getTargetNode() === joint && channel.getTargetPath() !== "weights");
      for (const channel of channels) {
        const sampler = channel.getSampler();
        if (!sampler?.getInput()?.getArray() || !sampler.getOutput()?.getArray()) return err(`${label}: ${joint.getName()} has an incomplete animation sampler.`);
        if (sampler.getInterpolation() !== "LINEAR" && !(allowBaking && sampler.getInterpolation() === "CUBICSPLINE")) return err(`${label}: ${joint.getName()} uses ${sampler.getInterpolation()} interpolation. Convert STEP clips to LINEAR keys before native import.`);
        const times = channelTimes(channel);
        if (times.length === 0) return err(`${label}: ${joint.getName()} has an empty animation sampler.`);
        const values = Array.from(sampler.getOutput()?.getArray() ?? []);
        const components = channel.getTargetPath() === "rotation" ? 4 : 3;
        const multiplier = sampler.getInterpolation() === "CUBICSPLINE" ? 3 : 1;
        if (values.length !== times.length * components * multiplier || values.some((value) => !Number.isFinite(value))) return err(`${label}: ${joint.getName()} has invalid animation values.`);
        if (channel.getTargetPath() === "rotation") {
          for (let index = 0; index < times.length; index += 1) {
            const offset = (index * multiplier + (multiplier === 3 ? 1 : 0)) * components;
            if (Math.abs(Math.hypot(...values.slice(offset, offset + components)) - 1) > 0.001) return err(`${label}: ${joint.getName()} has a non-unit rotation quaternion. Normalize its rotation keys before native import.`);
          }
        }
        if (times.some((time, index) => !Number.isFinite(time) || time < 0 || (index > 0 && time <= (times[index - 1] ?? 0)))) return err(`${label}: ${joint.getName()} animation times must be finite, nonnegative and strictly increasing.`);
      }
      const times = sharedChannelTimes(channels);
      if (!allowBaking && times.length > maximumKeys) return err(`${label}: ${joint.getName()} needs ${times.length} combined transform keys; this native target supports at most ${maximumKeys} per bone and clip. Reduce the animation keys before import.`);
      const ticks = times.map((time) => Math.round(time * TICKS_PER_SECOND));
      if (!allowBaking && new Set(ticks).size !== ticks.length) return err(`${label}: ${joint.getName()} has distinct keys within the same 30 Hz native tick. Reduce or align these keys before import.`);
    }
  }
  return ok(undefined);
}

function normalizeQuaternion(values: readonly number[]): number[] {
  const length = Math.hypot(...values);
  return length > 0 ? values.map((value) => value / length) : [0, 0, 0, 1];
}

function interpolateValues(a: readonly number[], b: readonly number[], fraction: number, rotation: boolean): number[] {
  if (!rotation) return a.map((value, index) => value + ((b[index] ?? value) - value) * fraction);
  const dot = Math.min(1, Math.abs(a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0)));
  const sign = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0) < 0 ? -1 : 1;
  if (dot > 0.9995) return normalizeQuaternion(a.map((value, index) => value + ((b[index] ?? value) * sign - value) * fraction));
  const angle = Math.acos(dot);
  return normalizeQuaternion(a.map((value, index) => (value * Math.sin((1 - fraction) * angle) + (b[index] ?? 0) * sign * Math.sin(fraction * angle)) / Math.sin(angle)));
}

export function sampleAnimationChannel(channel: AnimationChannel, time: number): number[] {
  const times = channelTimes(channel);
  const values = Array.from(channel.getSampler()?.getOutput()?.getArray() ?? []);
  const rotation = channel.getTargetPath() === "rotation";
  const components = rotation ? 4 : 3;
  const cubic = channel.getSampler()?.getInterpolation() === "CUBICSPLINE";
  const frame = (index: number) => values.slice((index * (cubic ? 3 : 1) + (cubic ? 1 : 0)) * components, (index * (cubic ? 3 : 1) + (cubic ? 1 : 0) + 1) * components);
  const last = times.length - 1;
  if (time <= (times[0] ?? 0)) return frame(0);
  if (time >= (times[last] ?? 0)) return frame(last);
  const right = times.findIndex((keyTime) => keyTime >= time);
  const left = right - 1;
  const start = times[left] ?? 0;
  const fraction = (time - start) / ((times[right] ?? start) - start);
  const a = frame(left);
  const b = frame(right);
  if (cubic) {
    const duration = (times[right] ?? start) - start;
    const t2 = fraction * fraction;
    const t3 = t2 * fraction;
    const result = a.map((value, index) => (2 * t3 - 3 * t2 + 1) * value + (t3 - 2 * t2 + fraction) * duration * (values[(left * 3 + 2) * components + index] ?? 0) + (-2 * t3 + 3 * t2) * (b[index] ?? 0) + (t3 - t2) * duration * (values[right * 3 * components + index] ?? 0));
    return rotation ? normalizeQuaternion(result) : result;
  }
  return interpolateValues(a, b, fraction, rotation);
}

function normalizedError(actual: readonly number[], predicted: readonly number[], path: string | null): number {
  if (path === "rotation") {
    const dot = Math.min(1, Math.abs(actual.reduce((sum, value, index) => sum + value * (predicted[index] ?? 0), 0)));
    return 2 * Math.acos(dot) / 0.01;
  }
  return Math.hypot(...actual.map((value, index) => value - (predicted[index] ?? 0))) / (path === "scale" ? 0.002 : 0.25);
}

function reducedSampleIndices(samples: readonly (readonly number[][])[], channels: readonly AnimationChannel[], maximumKeys: number): Result<number[], string> {
  const count = samples[0]?.length ?? 0;
  const selected = count > 1 ? [0, count - 1] : [0];
  while (selected.length <= maximumKeys) {
    let worstError = 1;
    let worstIndex = -1;
    for (let segment = 1; segment < selected.length; segment += 1) {
      const left = selected[segment - 1] ?? 0;
      const right = selected[segment] ?? left;
      for (let index = left + 1; index < right; index += 1) {
        for (const [channelIndex, channel] of channels.entries()) {
          const track = samples[channelIndex] ?? [];
          const predicted = interpolateValues(track[left] ?? [], track[right] ?? [], (index - left) / (right - left), channel.getTargetPath() === "rotation");
          const error = normalizedError(track[index] ?? [], predicted, channel.getTargetPath());
          if (error > worstError) { worstError = error; worstIndex = index; }
        }
      }
    }
    if (worstIndex < 0) return ok(selected);
    if (selected.length === maximumKeys) return err(`Cannot reduce this clip to ${maximumKeys} native keys within 0.25 position units, 0.002 scale units and 0.01 radians. Simplify or split the animation.`);
    selected.push(worstIndex);
    selected.sort((a, b) => a - b);
  }
  return err("The native animation key limit is too small.");
}

export function prepareNativeAnimations(document: Document, maximumKeys = NATIVE_ANIMATION_KEYS): Result<readonly string[], string> {
  const valid = validateNativeAnimations(document, maximumKeys, true);
  if (valid.isErr()) return err(valid.error);
  const changes: string[] = [];
  const joints = document.getRoot().listSkins()[0]?.listJoints() ?? [];
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
  for (const animation of document.getRoot().listAnimations()) {
    for (const [jointIndex, joint] of joints.entries()) {
      const channels = animation.listChannels().filter((channel) => channel.getTargetNode() === joint && channel.getTargetPath() !== "weights");
      const times = sharedChannelTimes(channels);
      const ticks = times.map((time) => Math.round(time * TICKS_PER_SECOND));
      const needsBaking = channels.some((channel) => channel.getSampler()?.getInterpolation() === "CUBICSPLINE") || times.length > maximumKeys || new Set(ticks).size !== ticks.length;
      if (!needsBaking) continue;
      const lastTick = Math.ceil((times[times.length - 1] ?? 0) * TICKS_PER_SECOND);
      if (lastTick > 3600) return err(`${animation.getName()}: clips requiring baking must be at most 120 seconds. Split this animation.`);
      const sampleTimes = Array.from({ length: lastTick + 1 }, (_, tick) => tick / TICKS_PER_SECOND);
      const samples = channels.map((channel) => sampleTimes.map((time) => sampleAnimationChannel(channel, time)));
      const selected = reducedSampleIndices(samples, channels, maximumKeys);
      if (selected.isErr()) return err(`${animation.getName()}, ${joint.getName()}: ${selected.error}`);
      for (const [index, channel] of channels.entries()) {
        const sampler = channel.getSampler();
        if (!sampler) continue;
        const input = document.createAccessor().setType("SCALAR").setBuffer(buffer).setArray(new Float32Array(selected.value.map((tick) => tick / TICKS_PER_SECOND)));
        const output = document.createAccessor().setType(channel.getTargetPath() === "rotation" ? "VEC4" : "VEC3").setBuffer(buffer).setArray(new Float32Array(selected.value.flatMap((tick) => samples[index]?.[tick] ?? [])));
        const replacement = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation("LINEAR");
        animation.addSampler(replacement);
        channel.setSampler(replacement);
      }
      const extras = animation.getExtras();
      const namespace = z.object({ accelerationModes: z.record(z.string(), z.array(z.number().int())) }).passthrough().safeParse(extras.pangears);
      if (namespace.success) {
        const modes = Object.fromEntries(Object.entries(namespace.data.accelerationModes).filter(([index]) => index !== String(jointIndex)));
        const rotations = Object.fromEntries(Object.entries(parseNativeRotations(namespace.data.nativeRotations)).filter(([index]) => index !== String(jointIndex)));
        animation.setExtras({ ...extras, pangears: { ...namespace.data, accelerationModes: modes, nativeRotations: rotations } });
      }
      changes.push(`${animation.getName()}, ${joint.getName()}: baked at 30 Hz and reduced to ${selected.value.length} keys (maximum errors: position 0.25 units, scale 0.002, rotation 0.01 radians at sampled ticks).`);
    }
  }
  return validateNativeAnimations(document, maximumKeys).map(() => changes);
}
