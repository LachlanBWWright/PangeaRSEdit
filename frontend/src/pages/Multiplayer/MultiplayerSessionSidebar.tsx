import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <aside className="min-h-0">
      <Card className="flex max-h-full min-h-0 flex-col border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Session</CardTitle>
            <Button
              variant="outline"
              size="default"
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
                <strong>Map:</strong>{" "}
                {getLevelOptionLabel(trackOptions, lobby.trackOrLevel)}
              </div>
              {usesCroMagTagDuration(lobby.gameId, lobby.mode) ? (
                <div>
                  <strong>Tag Duration:</strong>{" "}
                  {String(lobby.tagDurationMinutes)} minutes
                </div>
              ) : null}
              <div>
                <strong>Ready:</strong> {String(readyPlayerCount)}/
                {String(lobby.players.length)}
              </div>
            </div>
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
                size="default"
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
            canEndMatch={canEndMatch}
            onToggleReady={onToggleReady}
            onStart={onStart}
            onStartAnyway={onStartAnyway}
            onEndMatch={onEndMatch}
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
