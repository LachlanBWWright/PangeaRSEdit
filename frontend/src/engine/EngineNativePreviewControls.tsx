import { useEffect, useRef, useState, type Dispatch } from "react";
import { enginePreviewStatusSchema, type EnginePreviewStatus } from "@pangea/desktop-contracts";
import { desktopBridge, desktopRequest } from "@/platform/desktop/client";
import type { EnginePackage } from "./enginePackage";
import type { EngineWorkspaceAction } from "./engineWorkspaceState";
import { startEngineNativePreview } from "./engineNativePreview";

interface Props { packageData: EnginePackage; dispatch: Dispatch<EngineWorkspaceAction>; sceneId?: string }
export function EngineNativePreviewControls({ packageData, dispatch, sceneId }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<EnginePreviewStatus | null>(null);
  const observed = useRef<EnginePreviewStatus | null>(null);
  const requestEpoch = useRef(0);
  const desktop = !!desktopBridge();
  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    let refreshId = 0;
    async function refresh() {
      const epoch = requestEpoch.current;
      if (epoch % 2) return;
      const id = ++refreshId;
      const result = await desktopRequest({ operation: "engine.preview-status" }, enginePreviewStatusSchema);
      if (disposed || id !== refreshId || epoch !== requestEpoch.current) return;
      if (result.isErr()) { if (!observed.current) setMessage(result.error.message); return; }
      const previous = observed.current;
      const next = result.value;
      observed.current = next;
      setStatus(next);
      if (!previous || previous.running !== next.running || previous.available !== next.available || previous.pid !== next.pid) setMessage(next.message);
    }
    function focus() { void refresh(); }
    void refresh();
    const interval = window.setInterval(() => { if (observed.current?.running) void refresh(); }, 1000);
    window.addEventListener("focus", focus);
    return () => { disposed = true; window.clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [desktop]);
  if (!desktopBridge()) return null;
  async function run(stop: boolean) {
    requestEpoch.current++;
    setBusy(true);
    const result = stop ? await desktopRequest({ operation: "engine.preview-stop" }, enginePreviewStatusSchema) : await startEngineNativePreview(packageData, sceneId);
    const text = result.isOk() ? result.value.message : result.error.message;
    setMessage(text);
    if (result.isOk()) { observed.current = result.value; setStatus(result.value); }
    dispatch({ type: "status", message: text });
    requestEpoch.current++;
    setBusy(false);
  }
  return <><button disabled={busy || status?.running} onClick={() => void run(false)}>Run native game</button><button disabled={busy || !status?.running} onClick={() => void run(true)}>Stop native game</button>{message && <p className="engine-native-status" aria-live="polite">{message}</p>}</>;
}
