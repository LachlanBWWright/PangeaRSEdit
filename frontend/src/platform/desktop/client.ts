import { err, ok, ResultAsync, type Result } from "neverthrow";
import { z } from "zod";
import { replySchema, type DesktopBridge, type HostError, type HostRequest } from "@pangea/desktop-contracts";

declare global { interface Window { pangeaDesktop?: DesktopBridge } }

export function desktopBridge(): DesktopBridge | undefined { return globalThis.window?.pangeaDesktop; }

export async function desktopRequest<T>(request: HostRequest, schema: z.ZodType<T>): Promise<Result<T, HostError>> {
  const bridge = desktopBridge();
  if (!bridge) return err({ code: "unavailable", message: "This operation requires the desktop editor" });
  const response = await ResultAsync.fromPromise(bridge.request(request), () => ({ code: "transport", message: "Desktop service disconnected" }));
  if (response.isErr()) return err(response.error);
  const parsed = replySchema(schema).safeParse(response.value);
  if (!parsed.success) return err({ code: "invalid", message: "Invalid desktop service response" });
  return parsed.data.ok ? ok(parsed.data.value) : err(parsed.data.error);
}
