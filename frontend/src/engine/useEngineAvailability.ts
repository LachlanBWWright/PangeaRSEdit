import { useEffect, useState } from "react";
import { ResultAsync } from "neverthrow";

export function useEngineAvailability(url: string) {
  const [availability, setAvailability] = useState<"loading" | "available" | "missing">("loading");
  useEffect(() => {
    const controller = new AbortController();
    void ResultAsync.fromPromise(fetch(url.split("?")[0]?.replace(/\.html$/, ".wasm") ?? url, { method: "HEAD", signal: controller.signal }), () => "Runtime request failed")
      .match((response) => { if (!controller.signal.aborted) setAvailability(response.ok && response.headers.get("content-type")?.includes("application/wasm") ? "available" : "missing"); },
        () => { if (!controller.signal.aborted) setAvailability("missing"); });
    return () => controller.abort();
  }, [url]);
  return availability;
}
