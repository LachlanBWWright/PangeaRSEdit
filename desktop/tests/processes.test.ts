import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runProcess } from "../src/processes.ts";

afterEach(() => vi.useRealTimers());

describe("native process boundary", () => {
  it("captures output from successful headless tools", async () => {
    const result = await runProcess(process.execPath, ["-e", "process.stdout.write('1\\n')"], os.tmpdir());
    expect(result.isOk() && result.value).toBe("1\n");
  });

  it("passes shell metacharacters as a literal argument", async () => {
    const literal = "hello; $(echo unsafe) & | > output";
    const result = await runProcess(process.execPath, ["-e", "process.stdout.write(process.argv[1])", literal], os.tmpdir());
    expect(result.isOk() && result.value).toBe(literal);
  });

  it("returns exit status and stderr as a typed launch failure", async () => {
    const result = await runProcess(process.execPath, ["-e", "process.stderr.write('incompatible'); process.exit(7)"], os.tmpdir());
    expect(result.isErr() && result.error.code).toBe("launch");
    expect(result.isErr() && result.error.message).toContain("7: incompatible");
  });

  it("bounds diagnostic output", async () => {
    const result = await runProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(40000))"], os.tmpdir());
    expect(result.isOk() && result.value.length).toBe(16_384);
  });

  it("converts a missing executable into a typed launch failure", async () => {
    const result = await runProcess("pangea-test-missing-executable-745af9", [], os.tmpdir());
    expect(result.isErr() && result.error.code).toBe("launch");
  });

  it("terminates tools that do not finish before the deadline", async () => {
    vi.useFakeTimers();
    const pending = runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], os.tmpdir());
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await pending;
    expect(result.isErr() && result.error.code).toBe("timeout");
  });
});
