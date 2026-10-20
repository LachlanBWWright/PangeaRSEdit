import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { DesktopBridge } from "@pangea/desktop-contracts";
import { desktopRequest } from "./client";

const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

function installBridge(response: unknown) {
  const request = vi.fn(async () => response);
  const bridge: DesktopBridge = { request, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
  window.pangeaDesktop = bridge;
  return request;
}

describe("desktop bridge responses", () => {
  it("returns unavailable when running in the browser", async () => {
    window.pangeaDesktop = undefined;
    const result = await desktopRequest({ operation: "host.info" }, z.object({ platform: z.string() }));
    expect(result.isErr() && result.error.code).toBe("unavailable");
  });

  it("validates a response and forwards the exact typed request", async () => {
    const request = installBridge({ ok: true, value: { platform: "linux" } });
    const result = await desktopRequest({ operation: "host.info" }, z.object({ platform: z.string() }));
    expect(result.isOk() && result.value).toEqual({ platform: "linux" });
    expect(request).toHaveBeenCalledExactlyOnceWith({ operation: "host.info" });
  });

  it.each([null, {}, { ok: true, value: { platform: 1 } }, { ok: false, error: "failed" }, { ok: false, error: { code: 1, message: "failed" } }])("rejects malformed service responses: %j", async (response) => {
    installBridge(response);
    const result = await desktopRequest({ operation: "host.info" }, z.object({ platform: z.string() }));
    expect(result.isErr() && result.error.code).toBe("invalid");
  });

  it("preserves a typed service error", async () => {
    const error = { code: "conflict", message: "Project changed on disk" };
    installBridge({ ok: false, error });
    const result = await desktopRequest({ operation: "host.info" }, z.unknown());
    expect(result.isErr() && result.error).toEqual(error);
  });

  it("converts transport rejection into a typed failure", async () => {
    const request = installBridge(null);
    request.mockRejectedValueOnce(new Error("Disconnected"));
    const result = await desktopRequest({ operation: "host.info" }, z.unknown());
    expect(result.isErr() && result.error.code).toBe("transport");
  });
});
