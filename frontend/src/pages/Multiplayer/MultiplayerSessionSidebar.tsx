import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatLobbyModeLabel,
  formatLobbyVisibility,
} from "@/multiplayer/lobbyDisplay";
import {
  CROMAG_TAG_DURATION_OPTIONS,
  defaultTrackForMode,
  getLevelOptionLabel,
  getModeOptions,
  getTrackOptions,
  usesCroMagTagDuration,
} from "@/multiplayer/menuOptions";
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
    <aside className="min-h-0 border-l border-border pl-4">
      <div className="min-h-0 max-h-full overflow-hidden text-xs">
        <Tabs defaultValue="lobby" className="min-h-0">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger value="lobby" className="text-xs">Lobby</TabsTrigger>
            {showDebugOverlay ? (
              <TabsTrigger value="debug" className="text-xs">Debug</TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="lobby" className="space-y-3 overflow-hidden text-xs">
          <section aria-labelledby="multiplayer-lobby-heading" className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 id="multiplayer-lobby-heading" className="font-semibold text-foreground">Lobby</h3>
                <div className="mt-1 font-mono text-lg font-semibold tracking-wide text-foreground">
                  {lobby.joinCode}
                </div>
                <div className="text-muted-foreground">Join code</div>
              </div>
            </div>
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
              <div className="text-destructive" role="alert">
                <strong>Error:</strong> {errorText}
              </div>
            ) : null}
            {canEditSelection ? (
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label>Mode</Label>
                  <Select
                    value={lobby.mode}
                    disabled={busy}
                    onValueChange={(nextMode) => {
                      onUpdateSelection(
                        nextMode,
                        defaultTrackForMode(lobby.gameId, nextMode),
                        lobby.tagDurationMinutes,
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModeOptions(lobby.gameId).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Map</Label>
                  <Select
                    value={lobby.trackOrLevel}
                    disabled={busy}
                    onValueChange={(nextTrackOrLevel) => {
                      onUpdateSelection(
                        lobby.mode,
                        nextTrackOrLevel,
                        lobby.tagDurationMinutes,
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select map" />
                    </SelectTrigger>
                    <SelectContent>
                      {trackOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {usesCroMagTagDuration(lobby.gameId, lobby.mode) ? (
                  <div className="grid gap-1">
                    <Label>Tag Duration</Label>
                    <Select
                      value={String(lobby.tagDurationMinutes)}
                      disabled={busy}
                      onValueChange={(value) => {
                        onUpdateSelection(
                          lobby.mode,
                          lobby.trackOrLevel,
                          Number.parseInt(value, 10),
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tag duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {CROMAG_TAG_DURATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
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

          <HostStartControls
            hasLocalParticipant={hasLocalParticipant}
            localParticipantIsReady={localParticipantIsReady}
            busy={busy}
            isHost={isHost}
            canStart={canStartLobby}
            canForceStart={canForceStartLobby}
            canEndMatch={canEndMatch}
            onToggleReady={onToggleReady}
            onStart={onStart}
            onStartAnyway={onStartAnyway}
            onEndMatch={onEndMatch}
            onLeave={onLeave}
          />

          <Separator />

          <section aria-labelledby="multiplayer-chat-heading" className="space-y-2">
            <h3 id="multiplayer-chat-heading" className="font-semibold text-foreground">Lobby Chat</h3>
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
                size="default"
                disabled={chatDraft.trim().length === 0}
                onClick={onSendChat}
              >
                Send
              </Button>
            </div>
          </section>

          </TabsContent>

          {showDebugOverlay ? (
            <TabsContent value="debug" className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto text-xs">
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
                  <div className="pt-1 text-destructive"><strong>Error:</strong> {errorText}</div>
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
