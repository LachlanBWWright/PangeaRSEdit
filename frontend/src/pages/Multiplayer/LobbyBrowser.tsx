import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateLobbyDialog } from "./CreateLobbyDialog";
import { JoinLobbyDialog } from "./JoinLobbyDialog";
import { MultiplayerLobbyFilters } from "./MultiplayerLobbyFilters";
import { MultiplayerLobbyList } from "./MultiplayerLobbyList";
import type { LobbyBrowserProps } from "./types";

export function LobbyBrowser({
  isCreateLobbyOpen,
  formState,
  joinLobbyId,
  busy,
  isPreloading,
  lobbyListErrorText,
  actionErrorText,
  hasPublicLobbies,
  displayedPublicLobbies,
  joinGameFilter,
  joinModeFilter,
  onCreateLobbyOpenChange,
  onFormStateChange,
  onJoinLobbyIdChange,
  onJoinGameFilterChange,
  onJoinModeFilterChange,
  onRefreshLobbies,
  onCreateLobby,
  onJoinLobby,
  onQuickJoinLobby,
}: LobbyBrowserProps) {
  const controlsDisabled = busy || isPreloading;
  const [isJoinLobbyOpen, setIsJoinLobbyOpen] = useState(false);
  const [action, setAction] = useState<"create" | "code" | "quick" | null>(null);
  const joinTriggerRef = useRef<HTMLButtonElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingText = isPreloading
    ? "Preparing game files…"
    : action === "create" ? "Creating lobby…" : "Joining lobby…";
  const canClearFilters = hasPublicLobbies &&
    (joinGameFilter !== "all" || joinModeFilter !== "all");

  return (
    <>
      <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
        <header className="grid shrink-0 gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Find a lobby</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={joinTriggerRef}
                type="button"
                variant="outline"
                disabled={controlsDisabled}
                onClick={() => {
                  setAction(null);
                  setIsJoinLobbyOpen(true);
                }}
              >
                Join by code
              </Button>
              <Button
                ref={createTriggerRef}
                type="button"
                variant={hasPublicLobbies ? "outline" : "default"}
                disabled={controlsDisabled}
                onClick={() => {
                  setAction(null);
                  onCreateLobbyOpenChange(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create lobby
              </Button>
            </div>
          </div>
          <MultiplayerLobbyFilters
            joinGameFilter={joinGameFilter}
            joinModeFilter={joinModeFilter}
            busy={controlsDisabled}
            onJoinGameFilterChange={onJoinGameFilterChange}
            onJoinModeFilterChange={onJoinModeFilterChange}
            onRefresh={onRefreshLobbies}
          />
        </header>

        <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="Open lobbies">
          {lobbyListErrorText ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 py-2 text-destructive">
              <AlertDescription>{lobbyListErrorText}</AlertDescription>
            </Alert>
          ) : null}
          {action === "quick" && controlsDisabled ? (
            <p role="status" className="text-sm text-muted-foreground">{pendingText}</p>
          ) : null}
          {action === "quick" && actionErrorText ? (
            <Alert variant="destructive">
              <AlertDescription>{actionErrorText} Refresh the list or try another lobby.</AlertDescription>
            </Alert>
          ) : null}
          <MultiplayerLobbyList
            lobbies={displayedPublicLobbies}
            busy={controlsDisabled}
            onClearFilters={canClearFilters ? () => {
              onJoinGameFilterChange("all");
              onJoinModeFilterChange("all");
            } : undefined}
            listUnavailable={Boolean(lobbyListErrorText)}
            onQuickJoin={(id) => {
              setAction("quick");
              onQuickJoinLobby(id);
            }}
          />
        </section>
      </main>

      <JoinLobbyDialog
        open={isJoinLobbyOpen}
        formState={formState}
        joinLobbyId={joinLobbyId}
        busy={controlsDisabled}
        pendingText={pendingText}
        errorText={action === "code" ? actionErrorText : null}
        onCloseAutoFocus={() => joinTriggerRef.current?.focus()}
        onOpenChange={setIsJoinLobbyOpen}
        onFormStateChange={onFormStateChange}
        onJoinLobbyIdChange={onJoinLobbyIdChange}
        onJoin={() => {
          setAction("code");
          onJoinLobby();
        }}
      />

      <CreateLobbyDialog
        open={isCreateLobbyOpen}
        formState={formState}
        busy={controlsDisabled}
        pendingText={pendingText}
        errorText={action === "create" ? actionErrorText : null}
        onCloseAutoFocus={() => createTriggerRef.current?.focus()}
        onOpenChange={onCreateLobbyOpenChange}
        onFormStateChange={onFormStateChange}
        onCreate={() => {
          setAction("create");
          onCreateLobby();
        }}
      />
    </>
  );
}
