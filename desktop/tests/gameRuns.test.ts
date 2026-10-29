import { afterEach, expect, it, vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import { ok } from "neverthrow";
import { GameRuns } from "../src/gameRuns.ts";
import { startProcess } from "../src/processes.ts";
import { useTemporaryDirectory } from "./fixtures.ts";
import { inspectorFixture } from "../../packages/desktop-contracts/tests/scriptInspectorFixture.ts";
import path from "node:path";

const root = useTemporaryDirectory();
const children: ChildProcess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
    child.kill("SIGKILL");
    await closed;
  }
});
function launch(runs: GameRuns, script: string, restart = async () => ok(undefined)) {
  const run = runs.begin("OttoMatic", restart, root());
  const child = startProcess(process.execPath, ["-e", script], root());
  expect(child.isOk()).toBe(true);
  if (child.isErr()) return null;
  children.push(child.value);
  child.value.once("spawn", () => run.observer.spawn(child.value));
  const closed = new Promise<void>((resolve) => child.value.once("close", (code, signal) => { run.observer.exit(code, signal); resolve(); }));
  return { ...run, child: child.value, closed };
}

it("streams stdout/stderr with complete UTF-8 characters and records the exit status", async () => {
  const notify = vi.fn();
  const runs = new GameRuns(notify);
  const run = launch(runs, 'process.stdout.write(Buffer.from([0xe2])); setTimeout(() => { process.stdout.write(Buffer.from([0x82,0xac])); process.stderr.write("Data/Scripts/dist/modules/helper.lua:12: failure\\n"); }, 10); setTimeout(() => process.exit(7), 30);');
  if (!run) return;
  await run.closed;
  const record = runs.list()[0];
  expect(record).toMatchObject({ state: "exited", exitCode: 7, canRestart: true, sourceProject: root() });
  expect(record?.output.filter((chunk) => chunk.stream === "stdout").map((chunk) => chunk.text).join("")).toBe("€");
  expect(record?.output.some((chunk) => chunk.stream === "stderr" && chunk.text.includes("helper.lua:12"))).toBe(true);
  await vi.waitFor(() => expect(notify).toHaveBeenCalled());
});

it("bounds noisy logs, stops the native process, and restarts only the most recent snapshot", async () => {
  const runs = new GameRuns(() => undefined);
  const restart = vi.fn(async () => ok(undefined));
  const run = launch(runs, 'process.stdout.write("x".repeat(600000)); setTimeout(() => {}, 30000);', restart);
  if (!run) return;
  await vi.waitFor(() => expect(runs.list()[0]?.droppedBytes).toBeGreaterThan(0));
  expect(runs.list()[0]?.output.reduce((sum, chunk) => sum + Buffer.byteLength(chunk.text), 0)).toBeLessThanOrEqual(262144);
  expect((await runs.restart(run.id)).isOk()).toBe(true);
  await run.closed;
  expect(restart).toHaveBeenCalledOnce();
  expect(runs.stop(run.id).isErr()).toBe(true);
  const first = runs.begin("OttoMatic", async () => ok(undefined));
  runs.begin("Bugdom", async () => ok(undefined));
  expect((await runs.restart(first.id)).isErr()).toBe(true);
});

it("keeps native snapshots with their launch and removes protocol frames from the console", async () => {
  const runs = new GameRuns(() => undefined);
  const frame = `[PangeaInspector] ${JSON.stringify(inspectorFixture)}\n`;
  const run = launch(runs, `process.stdout.write(${JSON.stringify(frame.slice(0, 18))}); setTimeout(() => process.stdout.write(${JSON.stringify(frame.slice(18) + "native message\n")}), 10);`);
  if (!run) return;
  await run.closed;
  expect(runs.list()[0]?.inspector).toEqual(inspectorFixture);
  expect(runs.list()[0]?.output.map((chunk) => chunk.text).join("")).toBe("native message\n");
  runs.begin("Bugdom", async () => ok(undefined));
  expect(runs.list()[1]?.inspector).toBeUndefined();
  expect(runs.list()[0]?.inspector).toEqual(inspectorFixture);
});

it("requests pages and handles through the native transport without exposing protocol output", async () => {
  const runs = new GameRuns(() => undefined);
  const requestPath = path.join(root(), "inspector-request");
  const run = runs.begin("OttoMatic", async () => ok(undefined), root());
  const page = { objects: inspectorFixture.objects, offset: 64, nextOffset: null, total: 66, truncated: false, error: null };
  const script = `const fs=require('node:fs'); const p=${JSON.stringify(requestPath)}; setInterval(()=>{if(!fs.existsSync(p))return;const [sequence,offset,filter,id,generation]=fs.readFileSync(p,'utf8').split(' ').map(Number);fs.unlinkSync(p); const page=id?{objects:[],error:'invalid or stale object handle'}:${JSON.stringify(page)};process.stdout.write('[PangeaInspectorPage] '+JSON.stringify({sequence:sequence+100,page})+'\\n');process.stdout.write('[PangeaInspectorPage] '+JSON.stringify({sequence,page})+'\\n');},10);`;
  const child = startProcess(process.execPath, ["-e", script], root());
  expect(child.isOk()).toBe(true);
  if (child.isErr()) return;
  children.push(child.value);
  await new Promise<void>((resolve) => child.value.once("spawn", () => { run.observer.spawn(child.value, requestPath); resolve(); }));
  const result = await runs.queryObjects(run.id, { offset: 64, scriptedOnly: false });
  expect(result.isOk() && result.value).toEqual(page);
  const stale = await runs.queryObjects(run.id, { offset: 0, scriptedOnly: false, handle: { id: 1, generation: 0 } });
  expect(stale.isErr() && stale.error.message).toContain("stale object handle");
  expect(runs.list()[0]?.output).toEqual([]);
});

it("times out unsupported native builds and releases queued requests", async () => {
  const runs = new GameRuns(() => undefined);
  const run = runs.begin("OttoMatic", async () => ok(undefined), root());
  const child = startProcess(process.execPath, ["-e", "setInterval(()=>{},1000)"], root());
  if (child.isErr()) return;
  children.push(child.value);
  await new Promise<void>((resolve) => child.value.once("spawn", () => { run.observer.spawn(child.value, path.join(root(), "unsupported-request")); resolve(); }));
  const pending = runs.queryObjects(run.id, { offset: 0, scriptedOnly: true });
  const next = runs.queryObjects(run.id, { offset: 64, scriptedOnly: true });
  const result = await pending;
  expect(result.isErr() && result.error.code).toBe("timeout");
  const nextResult = await next;
  expect(nextResult.isErr() && nextResult.error.code).toBe("timeout");
}, 10000);

it("serializes simultaneous page and nested-state requests", async () => {
  const runs = new GameRuns(() => undefined);
  const requestPath = path.join(root(), "state-request");
  const run = runs.begin("OttoMatic", async () => ok(undefined), root());
  const page = { objects: [], offset: 0, nextOffset: null, total: 0, truncated: false, error: null };
  const state = { entries: [{ key: "child", type: "table", value: "table", expandable: true, cycle: false, truncated: false }], offset: 0, nextOffset: null, total: 1, truncated: false, error: null };
  const script = `const fs=require('node:fs');const p=${JSON.stringify(requestPath)};setInterval(()=>{if(!fs.existsSync(p))return;const fields=fs.readFileSync(p,'utf8').split(' ');fs.unlinkSync(p);const state=fields[5]==='state';process.stdout.write((state?'[PangeaInspectorState] ':'[PangeaInspectorPage] ')+JSON.stringify({sequence:Number(fields[0]),page:state?${JSON.stringify(state)}:${JSON.stringify(page)}})+'\\n');},10);`;
  const child = startProcess(process.execPath, ["-e", script], root());
  if (child.isErr()) return;
  children.push(child.value);
  await new Promise<void>((resolve) => child.value.once("spawn", () => { run.observer.spawn(child.value, requestPath); resolve(); }));
  const results = await Promise.all([runs.queryObjects(run.id, { offset: 0, scriptedOnly: false }), runs.queryState(run.id, { handle: { id: 1, generation: 0 }, path: ["child"], offset: 0 })]);
  expect(results[0]?.isOk() && results[0].value).toEqual(page);
  expect(results[1]?.isOk() && results[1].value).toEqual(state);
  expect(runs.list()[0]?.output).toEqual([]);
});
