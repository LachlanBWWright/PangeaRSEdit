import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, expect, vi } from "vitest";
import { io } from "../src/files.ts";

export const bytes = (text: string) => new TextEncoder().encode(text);

export function useTemporaryDirectory() {
  let root = "";
  beforeEach(async () => {
    const created = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-suite-")), "Cannot create fixture");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const resolved = await io(() => fs.realpath(created.value), "Cannot resolve fixture directory");
    expect(resolved.isOk()).toBe(true);
    if (resolved.isOk()) root = resolved.value;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (root) expect((await io(() => fs.rm(root, { recursive: true, force: true }), "Cannot clean fixture")).isOk()).toBe(true);
  });
  return () => root;
}

export async function writeFixture(root: string, relative: string, content: string | Uint8Array) {
  const target = path.join(root, relative);
  expect((await io(() => fs.mkdir(path.dirname(target), { recursive: true }), "Cannot create fixture directory")).isOk()).toBe(true);
  expect((await io(() => fs.writeFile(target, content), "Cannot write fixture")).isOk()).toBe(true);
}

export async function readFixture(root: string, relative: string) {
  const read = await io(() => fs.readFile(path.join(root, relative), "utf8"), "Cannot read fixture");
  expect(read.isOk()).toBe(true);
  return read.isOk() ? read.value : null;
}
