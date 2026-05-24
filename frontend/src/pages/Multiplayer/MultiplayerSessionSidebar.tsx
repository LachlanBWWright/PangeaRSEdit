import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  formatLobbyModeLabel,
  formatLobbyVisibility,
} from "@/multiplayer/lobbyDisplay";
import { HostStartControls } from "./HostStartControls";
import { LobbyRoster } from "./LobbyRoster";
import { MultiplayerDebugOverlay } from "./MultiplayerDebugOverlay";
import { NetworkDebugControls } from "./NetworkDebugControls";
import type { MultiplayerSessionViewProps } from "./types";

type MultiplayerSessionSidebarProps = Pick<
  MultiplayerSessionViewProps,
  | "lobby"
  | "showDebugOverlay"
  | "localParticipantId"
  | "localPlayerIndex"
  | "connectionStatus"
  | "currentMatchPhase"
  | "rtcStatusText"
  | "displayedPingMs"
  | "currentMatchKind"
  | "hudLabel"
  | "statusText"
  | "errorText"
  | "isHost"
  | "readyPlayerCount"
  | "busy"
  | "chatMessages"
  | "chatDraft"
  | "localParticipantIsReady"
  | "hasLocalParticipant"
  | "canStartLobby"
  | "canForceStartLobby"
  | "packetCounts"
  | "runtimeDebugStats"
  | "nativeDebugStats"
  | "networkDebugOptions"
  | "onCopyLobbyId"
  | "onRemoveParticipant"
  | "onChatDraftChange"
  | "onSendChat"
  | "onToggleReady"
  | "onStart"
  | "onStartAnyway"
  | "onLeave"
  | "onResetNetworkDebugOptions"
  | "onUpdateNetworkDebugOption"
>;

export function MultiplayerSessionSidebar({
  lobby,
  showDebugOverlay,
  localParticipantId,
  localPlayerIndex,
  connectionStatus,
  currentMatchPhase,
  rtcStatusText,
  displayedPingMs,
  currentMatchKind,
  hudLabel,
  statusText,
  errorText,
  isHost,
  readyPlayerCount,
  busy,
  chatMessages,
  chatDraft,
  localParticipantIsReady,
  hasLocalParticipant,
  canStartLobby,
  canForceStartLobby,
  packetCounts,
  runtimeDebugStats,
  nativeDebugStats,
  networkDebugOptions,
  onCopyLobbyId,
  onRemoveParticipant,
  onChatDraftChange,
  onSendChat,
  onToggleReady,
  onStart,
  onStartAnyway,
  onLeave,
  onResetNetworkDebugOptions,
  onUpdateNetworkDebugOption,
}: MultiplayerSessionSidebarProps) {
  return (
    <aside className="min-h-0">
      <Card className="flex max-h-full min-h-0 flex-col border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Session</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onCopyLobbyId}
            >
              Copy ID
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto text-xs">
          <section className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <strong>Connection:</strong> {connectionStatus}
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <strong>Phase:</strong> {currentMatchPhase}
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <strong>RTC:</strong> {rtcStatusText}
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <strong>Ping:</strong>{" "}
                {displayedPingMs === null ? "n/a" : `${displayedPingMs} ms`}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <strong>Kind:</strong> {currentMatchKind}
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <strong>HUD:</strong> {hudLabel}
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <strong>Status:</strong> {statusText}
            </div>
            {errorText ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-destructive">
                <strong>Error:</strong> {errorText}
              </div>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="grid gap-1.5">
              <div className="break-all">
                <strong>Lobby:</strong> {lobby.id}
              </div>
              <div>
                <strong>Join Code:</strong> {lobby.joinCode}
              </div>
              <div>
                <strong>State:</strong> {lobby.state}
              </div>
              <div>
                <strong>You:</strong> {isHost ? "host" : "guest"}
              </div>
              <div>
                <strong>Visibility:</strong>{" "}
                {formatLobbyVisibility(lobby.isPublic)}
              </div>
              <div>
                <strong>Mode:</strong> {formatLobbyModeLabel(lobby.mode)}
              </div>
              <div>
                <strong>Ready:</strong> {String(readyPlayerCount)}/
                {String(lobby.players.length)}
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <strong>Roster</strong>
            <LobbyRoster
              players={lobby.players}
              isHost={isHost}
              busy={busy}
              onRemoveParticipant={onRemoveParticipant}
            />
          </section>

          <Separator />

          <section className="space-y-2">
            <strong>Lobby Chat</strong>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded border p-2">
              {chatMessages.length === 0 ? (
                <div className="text-muted-foreground">No messages yet.</div>
              ) : (
                chatMessages.map((message, index) => (
                  <div
                    key={`${message.participantId}:${message.createdAt}:${index}`}
                  >
                    <strong>{message.displayName}:</strong> {message.message}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatDraft}
                placeholder="Send a message"
                onChange={(event) => {
                  onChatDraftChange(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSendChat();
                  }
                }}
              />
              <Button
                variant="secondary"
                disabled={chatDraft.trim().length === 0}
                onClick={onSendChat}
              >
                Send
              </Button>
            </div>
          </section>

          <Separator />

          <HostStartControls
            hasLocalParticipant={hasLocalParticipant}
            localParticipantIsReady={localParticipantIsReady}
            busy={busy}
            isHost={isHost}
            canStart={canStartLobby}
            canForceStart={canForceStartLobby}
            onToggleReady={onToggleReady}
            onStart={onStart}
            onStartAnyway={onStartAnyway}
            onLeave={onLeave}
          />

          {showDebugOverlay ? (
            <>
              <Separator />
              <NetworkDebugControls
                networkDebugOptions={networkDebugOptions}
                onResetNetworkDebugOptions={onResetNetworkDebugOptions}
                onUpdateNetworkDebugOption={onUpdateNetworkDebugOption}
              />
              <MultiplayerDebugOverlay
                lobby={lobby}
                localParticipantId={localParticipantId}
                localPlayerIndex={localPlayerIndex}
                isHost={isHost}
                connectionStatus={connectionStatus}
                rtcStatusText={rtcStatusText}
                packetCounts={packetCounts}
                runtimeDebugStats={runtimeDebugStats}
                nativeDebugStats={nativeDebugStats}
                errorText={errorText}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}
