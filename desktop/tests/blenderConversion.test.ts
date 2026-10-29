import path from "node:path";
import { expect, it, vi } from "vitest";
import { blenderArguments, exportBlend } from "../src/blenderConversion.ts";
import * as processes from "../src/processes.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

it("passes source paths as arguments and disables embedded Python autorun", () => {
  const args = blenderArguments("/source/enemy's model.blend", "/output/model.glb");
  expect(args.slice(0, 4)).toEqual(["--background", "--factory-startup", "--disable-autoexec", "/source/enemy's model.blend"]);
  expect(args.slice(-2)).toEqual(["--", "/output/model.glb"]);
  expect(args).toContain("--python-exit-code");
});

it("passes collection names as data rather than interpolating Python source", () => {
  const name = "Enemy's collection; print('unwanted')";
  const args = blenderArguments("/source/enemy.blend", "/output/model.glb", name);
  expect(args.at(-1)).toBe(name);
  const expression = args[args.indexOf("--python-expr") + 1];
  expect(expression).not.toContain(name);
  expect(expression).toContain("collection.all_objects");
});

it("reports Blender diagnostics on nonzero process exit", async () => {
  await writeFixture(root(), "fake.cjs", "process.stderr.write('Unsupported material'); process.exitCode = 1;");
  const start = processes.startProcess;
  vi.spyOn(processes, "startProcess").mockImplementation((_executable, _args, cwd) =>
    start(process.execPath, [path.join(root(), "fake.cjs")], cwd));
  const result = await exportBlend(path.join(root(), "source.blend"), path.join(root(), "result.glb"), "blender", new AbortController().signal);
  expect(result.isErr() && result.error.message).toContain("Unsupported material");
});

it("terminates an active Blender process on cancellation", async () => {
  await writeFixture(root(), "waiting.cjs", "setInterval(() => {}, 1000);");
  const start = processes.startProcess;
  const controller = new AbortController();
  vi.spyOn(processes, "startProcess").mockImplementation((_executable, _args, cwd) => {
    const child = start(process.execPath, [path.join(root(), "waiting.cjs")], cwd);
    if (child.isOk()) child.value.once("spawn", () => controller.abort());
    return child;
  });
  const result = await exportBlend(path.join(root(), "source.blend"), path.join(root(), "result.glb"), "blender", controller.signal);
  expect(result.isErr() && result.error.code).toBe("cancelled");
});

it("reports a missing Blender installation", async () => {
  const result = await exportBlend(path.join(root(), "source.blend"), path.join(root(), "result.glb"), path.join(root(), "missing-blender"), new AbortController().signal);
  expect(result.isErr() && result.error.code).toBe("launch");
});
