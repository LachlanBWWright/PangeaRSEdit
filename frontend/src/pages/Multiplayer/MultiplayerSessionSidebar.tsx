import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatLobbyModeLabel,
  formatLobbyVisibility,
} from "@/multiplayer/lobbyDisplay";
import {
  getLevelOptionLabel,
  getTrackOptions,
  usesCroMagTagDuration,
} from "@/multiplayer/menuOptions";
import { HostStartControls } from "./HostStartControls";
import { LobbyJoinCode } from "./LobbyJoinCode";
import { LobbySelectionControls } from "./LobbySelectionControls";
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
  | "canEndMatch"
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
  | "onUpdateSelection"
  | "onEndMatch"
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
  canEndMatch,
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
  onUpdateSelection,
  onEndMatch,
  onLeave,
  onResetNetworkDebugOptions,
  onUpdateNetworkDebugOption,
}: MultiplayerSessionSidebarProps) {
  const canEditSelection = isHost && lobby.state === "open";
  const trackOptions = getTrackOptions(lobby.gameId, lobby.mode);

  return (
    <aside className="flex h-full min-h-0 min-w-0 max-h-[calc(100dvh-6rem)] flex-col border-t border-border pt-4 lg:max-h-none lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
      <div className="flex min-h-0 flex-1 flex-col text-sm">
        <Tabs defaultValue="lobby" className="flex min-h-0 flex-1 flex-col">
          {showDebugOverlay ? (
            <TabsList className="h-9 shrink-0 bg-transparent p-0">
              <TabsTrigger value="lobby" className="text-xs">Lobby</TabsTrigger>
              <TabsTrigger value="debug" className="text-xs">Debug</TabsTrigger>
            </TabsList>
          ) : null}
          <TabsContent value="lobby" className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pb-3">
          <section aria-labelledby="multiplayer-lobby-heading" className="space-y-3">
            <h3 id="multiplayer-lobby-heading" className="font-semibold text-foreground">Lobby</h3>
            <LobbyJoinCode key={lobby.joinCode} joinCode={lobby.joinCode} />
            <div className="grid gap-1 text-muted-foreground">
              <div>
                <strong className="text-foreground">Visibility:</strong>{" "}
                {formatLobbyVisibility(lobby.isPublic)}
              </div>
              <div><strong className="text-foreground">Mode:</strong> {formatLobbyModeLabel(lobby.mode)}</div>
              <div>
                <strong className="text-foreground">Map:</strong>{" "}
                {getLevelOptionLabel(trackOptions, lobby.trackOrLevel)}
              </div>
              {usesCroMagTagDuration(lobby.gameId, lobby.mode) ? (
                <div>
                  <strong className="text-foreground">Tag Duration:</strong>{" "}
                  {String(lobby.tagDurationMinutes)} minutes
                </div>
              ) : null}
            </div>
            <div className="text-muted-foreground" aria-live="polite">
              {statusText}
            </div>
            {errorText ? (
              <div className="text-red-300" role="alert">
                <strong>Error:</strong> {errorText}
              </div>
            ) : null}
            {canEditSelection ? (
              <LobbySelectionControls lobby={lobby} busy={busy} onUpdateSelection={onUpdateSelection} />
            ) : null}
          </section>

          <Separator />

          <section aria-labelledby="multiplayer-roster-heading" className="space-y-2">
            <h3 id="multiplayer-roster-heading" className="font-semibold text-foreground">Players</h3>
            <LobbyRoster
              players={lobby.players}
              isHost={isHost}
              busy={busy}
              onRemoveParticipant={onRemoveParticipant}
            />
          </section>

          <Separator />

          <section aria-labelledby="multiplayer-chat-heading" className="space-y-2">
            <h3 id="multiplayer-chat-heading" className="font-semibold text-foreground">Lobby Chat</h3>
            <div role="log" aria-label="Lobby messages" tabIndex={0} className="max-h-28 space-y-1 overflow-y-auto rounded border p-2">
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
                aria-label="Chat message"
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
                size="default"
                disabled={chatDraft.trim().length === 0}
                onClick={onSendChat}
              >
                Send
              </Button>
            </div>
          </section>
          </div>
          <div className="shrink-0 border-t border-border bg-background pt-3">
            <HostStartControls
              hasLocalParticipant={hasLocalParticipant}
              localParticipantIsReady={localParticipantIsReady}
              busy={busy}
              isHost={isHost}
              canStart={canStartLobby}
              canForceStart={canForceStartLobby}
              canEndMatch={canEndMatch}
              lobbyState={lobby.state}
              readyPlayerCount={readyPlayerCount}
              playerCount={lobby.players.length}
              onToggleReady={onToggleReady}
              onStart={onStart}
              onStartAnyway={onStartAnyway}
              onEndMatch={onEndMatch}
              onLeave={onLeave}
            />
          </div>
          </TabsContent>

          {showDebugOverlay ? (
            <TabsContent value="debug" className="min-h-0 flex-1 space-y-4 overflow-y-auto text-xs">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">Developer tools</h3>
                <Button
                  variant="outline"
                  size="default"
                  disabled={busy}
                  onClick={onCopyLobbyId}
                >
                  Copy Lobby ID
                </Button>
              </div>
              <section aria-labelledby="multiplayer-status-heading" className="space-y-1 text-muted-foreground">
                <h3 id="multiplayer-status-heading" className="font-semibold text-foreground">Runtime status</h3>
                <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                  <div><strong className="text-foreground">Connection:</strong> {connectionStatus}</div>
                  <div><strong className="text-foreground">Phase:</strong> {currentMatchPhase}</div>
                  <div><strong className="text-foreground">RTC:</strong> {rtcStatusText}</div>
                  <div><strong className="text-foreground">Ping:</strong> {displayedPingMs === null ? "n/a" : `${displayedPingMs} ms`}</div>
                  <div><strong className="text-foreground">Kind:</strong> {currentMatchKind}</div>
                  <div><strong className="text-foreground">HUD:</strong> {hudLabel}</div>
                  <div className="sm:col-span-2"><strong className="text-foreground">Status:</strong> {statusText}</div>
                </div>
                {errorText ? (
                  <div className="pt-1 text-red-300"><strong>Error:</strong> {errorText}</div>
                ) : null}
              </section>

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
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </aside>
  );
}
