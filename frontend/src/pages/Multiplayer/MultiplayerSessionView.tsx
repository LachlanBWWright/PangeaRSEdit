import { MultiplayerGameStage } from "./MultiplayerGameStage";
import { MultiplayerSessionSidebar } from "./MultiplayerSessionSidebar";
import type { MultiplayerSessionViewProps } from "./types";

export function MultiplayerSessionView(props: MultiplayerSessionViewProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <MultiplayerGameStage
        activeMatchConfigPresent={props.activeMatchConfigPresent}
        gameCanvasRef={props.gameCanvasRef}
      />
      <MultiplayerSessionSidebar
        lobby={props.lobby}
        showDebugOverlay={props.showDebugOverlay}
        localParticipantId={props.localParticipantId}
        localPlayerIndex={props.localPlayerIndex}
        connectionStatus={props.connectionStatus}
        currentMatchPhase={props.currentMatchPhase}
        rtcStatusText={props.rtcStatusText}
        displayedPingMs={props.displayedPingMs}
        currentMatchKind={props.currentMatchKind}
        hudLabel={props.hudLabel}
        statusText={props.statusText}
        errorText={props.errorText}
        isHost={props.isHost}
        readyPlayerCount={props.readyPlayerCount}
        busy={props.busy}
        chatMessages={props.chatMessages}
        chatDraft={props.chatDraft}
        localParticipantIsReady={props.localParticipantIsReady}
        hasLocalParticipant={props.hasLocalParticipant}
        canStartLobby={props.canStartLobby}
        canForceStartLobby={props.canForceStartLobby}
        canEndMatch={props.canEndMatch}
        packetCounts={props.packetCounts}
        runtimeDebugStats={props.runtimeDebugStats}
        nativeDebugStats={props.nativeDebugStats}
        networkDebugOptions={props.networkDebugOptions}
        onCopyLobbyId={props.onCopyLobbyId}
        onRemoveParticipant={props.onRemoveParticipant}
        onChatDraftChange={props.onChatDraftChange}
        onSendChat={props.onSendChat}
        onToggleReady={props.onToggleReady}
        onStart={props.onStart}
        onStartAnyway={props.onStartAnyway}
        onUpdateSelection={props.onUpdateSelection}
        onEndMatch={props.onEndMatch}
        onLeave={props.onLeave}
        onResetNetworkDebugOptions={props.onResetNetworkDebugOptions}
        onUpdateNetworkDebugOption={props.onUpdateNetworkDebugOption}
      />
    </div>
  );
}
