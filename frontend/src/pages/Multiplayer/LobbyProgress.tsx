import { LoaderCircle } from "lucide-react";

interface LobbyProgressProps {
  readonly isPreloading: boolean;
  readonly action: "create" | "join";
}

export function LobbyProgress({ isPreloading, action }: LobbyProgressProps) {
  const label = isPreloading
    ? "Preparing game files…"
    : action === "create"
      ? "Creating lobby…"
      : "Joining lobby…";

  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}
