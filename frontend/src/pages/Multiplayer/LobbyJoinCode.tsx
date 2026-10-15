import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyJoinCode } from "@/multiplayer/copyJoinCode";

interface LobbyJoinCodeProps {
  readonly joinCode: string;
}

async function copyCode(
  joinCode: string,
  setFeedback: (feedback: string) => void,
): Promise<void> {
  const result = await copyJoinCode(joinCode, globalThis.navigator?.clipboard);
  setFeedback(result.isOk() ? "Join code copied" : result.error);
}

export function LobbyJoinCode({ joinCode }: LobbyJoinCodeProps) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="select-all font-mono text-lg font-semibold tracking-wide text-foreground">
            {joinCode}
          </div>
          <div className="text-muted-foreground">Join code</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { void copyCode(joinCode, setFeedback); }}
        >
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy code
        </Button>
      </div>
      <p role="status" className="text-muted-foreground">{feedback}</p>
    </div>
  );
}
