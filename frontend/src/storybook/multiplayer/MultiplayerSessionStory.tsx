import { useState } from "react";
import { createSessionStoryProps } from "./multiplayerStoryFixtures";
import { MultiplayerSessionView } from "@/pages/Multiplayer/MultiplayerSessionView";
import { appendStoryChat, selectStoryMap, toggleStoryReady } from "./sessionStoryState";
import type { MultiplayerSessionViewProps } from "@/pages/Multiplayer/types";

export interface MultiplayerSessionStoryProps extends MultiplayerSessionViewProps {
  readonly short?: boolean;
}

export function MultiplayerSessionStory(props: MultiplayerSessionStoryProps) {
  const [lobby, setLobby] = useState(props.lobby);
  const [chatMessages, setChatMessages] = useState(props.chatMessages);
  const [chatDraft, setChatDraft] = useState(props.chatDraft);
  const [networkDebugOptions, setNetworkDebugOptions] = useState(props.networkDebugOptions);
  const permissions = createSessionStoryProps(lobby, props.localParticipantId ?? "");
  return (
    <div className={`flex min-h-0 w-full bg-background p-4 text-foreground ${props.short ? "h-[480px]" : "h-dvh"}`}>
      <MultiplayerSessionView
        {...props}
        lobby={lobby}
        readyPlayerCount={permissions.readyPlayerCount}
        localParticipantIsReady={permissions.localParticipantIsReady}
        canStartLobby={permissions.canStartLobby}
        canForceStartLobby={permissions.canForceStartLobby}
        chatMessages={chatMessages}
        chatDraft={chatDraft}
        networkDebugOptions={networkDebugOptions}
        onToggleReady={() => {
          props.onToggleReady();
          setLobby(toggleStoryReady(lobby, props.localParticipantId));
        }}
        onUpdateSelection={(mode, track, duration) => {
          props.onUpdateSelection(mode, track, duration);
          setLobby(selectStoryMap(lobby, mode, track, duration));
        }}
        onChatDraftChange={(draft) => { props.onChatDraftChange(draft); setChatDraft(draft); }}
        onSendChat={() => {
          props.onSendChat();
          setChatMessages(appendStoryChat(chatMessages, lobby, props.localParticipantId, chatDraft));
          setChatDraft("");
        }}
        onUpdateNetworkDebugOption={(key, value) => {
          props.onUpdateNetworkDebugOption(key, value);
          setNetworkDebugOptions({ ...networkDebugOptions, [key]: value });
        }}
        onResetNetworkDebugOptions={() => {
          props.onResetNetworkDebugOptions();
          setNetworkDebugOptions({ latencyMs: 0, packetLossPercent: 0, packetBurstPercent: 0, packetBurstSize: 1 });
        }}
      />
    </div>
  );
}
