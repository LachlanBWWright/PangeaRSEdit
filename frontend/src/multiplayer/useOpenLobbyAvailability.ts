import { useEffect, useState } from "react";
import { listLobbies } from "./api";
import { isLobbyJoinable } from "./lobbyDisplay";

export function useOpenLobbyAvailability(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let mounted = true;
    let pending = false;
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        setAvailable(false);
        return;
      }
      if (pending) return;
      pending = true;
      void listLobbies({}).then((result) => {
        pending = false;
        if (!mounted) return;
        setAvailable(document.visibilityState === "visible" && navigator.onLine && result.isOk()
          && result.value.some((lobby) => lobby.isPublic && isLobbyJoinable(lobby)));
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
  return available;
}
