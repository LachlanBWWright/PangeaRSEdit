# WASM P2P Multiplayer Plan for Cro-Mag Rally and Nanosaur 2

## Goal

Add browser multiplayer for the WASM ports of Cro-Mag Rally and Nanosaur 2 by using the existing C# .NET backend to identify players, create lobbies, exchange WebRTC signaling data, coordinate match start, and store matchmaking history. Gameplay packets should flow peer-to-peer between browsers. The backend should only orchestrate matchmaking and signaling, with optional authenticated-user support kept available for future moderation, persistence, and private-match features.

## Current System Shape

- The frontend lives in `frontend/` and serves prebuilt game WASM artifacts under `public/wasm/cromagrally` and `public/wasm/nanosaur2`.
- The game ports are sibling submodules under `games/`.
- The backend already exists under `backend/` with ASP.NET Core controllers, cookie auth, CORS, `PangeaRSEdit.Application`, `PangeaRSEdit.Domain`, and `PangeaRSEdit.Infrastructure`.
- Backend persistence is currently in-memory through infrastructure services. Multiplayer can start in-memory for local development, but production matchmaking needs a shared store or sticky sessions.
- Cro-Mag Rally has original network-mode code in `games/cromagrally/Source/System/network.c`, but the NetSprocket implementation is disabled with `IMPLEMENT_ME_SOFT()` and `#if 0`.
- Nanosaur 2 has no network code. Its versus modes are local two-player split-screen only.

## Game Findings

### Cro-Mag Rally

Cro-Mag already has the most useful multiplayer architecture:

- Game modes include multiplayer race, two tag variants, survival, and capture the flag in `Source/Headers/main.h`.
- Original network state is represented by `gIsNetworkHost`, `gIsNetworkClient`, `gNetGameInProgress`, `gMyNetworkPlayerNum`, `gNumRealPlayers`, and per-player `onThisMachine`.
- `network.h` defines message payloads for game config, level-load sync, host-to-client controls, client-to-host controls, and vehicle selection.
- `Main.c` already routes network flow through:
  - `SetupNetworkHosting`
  - `SetupNetworkJoin`
  - `HostWaitForPlayersToPrepareLevel`
  - `ClientTellHostLevelIsPrepared`
  - `HostSend_ControlInfoToClients`
  - `ClientReceive_ControlInfoFromHost`
  - `ClientSend_ControlInfoToHost`
  - `HostReceive_ControlInfoFromClients`
- The runtime model is deterministic host-orchestrated lockstep: each client sends its local input for the next frame to the host, then the host broadcasts all players' inputs, FPS values, frame counter, and a random-seed sync check.
- The original manual states LAN support for 2 to 6 players. The modern port's app metadata also supports up to four local split-screen players, but the network code still uses `MAX_PLAYERS`.

This means Cro-Mag should be revived by replacing the disabled NetSprocket boundary with a browser transport boundary while preserving the existing game-loop synchronization model.

### Nanosaur 2

Nanosaur 2 needs a new network layer:

- Versus modes are set in `Source/Screens/MainMenu.c` by choosing race, battle, or capture-the-flag levels.
- `gNumPlayers` is set to `2` for all versus modes.
- `gVSMode` selects race, battle, or capture-the-flag behavior.
- `PlayGame_Versus` in `Source/System/Main.c` initializes both players locally, loads the level, and enters `PlayLevel`.
- `PlayLevel` updates steering for every player locally with `UpdatePlayerSteering(i)`, then moves objects, updates terrain, draws, and advances timers.
- Player state is held in `gPlayerInfo[MAX_PLAYERS]`, but the active versus game is built around exactly two players.
- The Nanosaur 2 manual describes Nano vs. Nano as same-computer split-screen only, with racing, battle, and capture-the-eggs modes.

This means Nanosaur 2 should receive a small Cro-Mag-inspired network abstraction: host-authoritative lockstep over player inputs, fixed two-player sessions, one local player per browser, and single-pane rendering for the local player instead of local split-screen once network mode is active.

## Architecture Decision

Use WebRTC data channels for gameplay packets, with the .NET backend acting as:

- lobby registry
- matchmaking coordinator
- authenticated player identity source
- WebRTC signaling channel
- match configuration authority
- match lifecycle observer

Do not run gameplay simulation on the backend in the first version. These ports already assume every machine runs the full simulation. Server authority would require a much larger rewrite, including headless game simulation, snapshot generation, reconciliation, and cheat handling.

Use a host-authoritative peer model:

- one browser is the game host
- other browsers connect to the host through WebRTC data channels
- clients send input packets to host
- host broadcasts canonical per-frame input bundles and match timing
- every peer runs the same simulation locally

This mirrors Cro-Mag's original design and gives Nanosaur 2 the smallest viable networking model.

## Backend Plan

### Domain Models

Add domain models for:

- `MultiplayerLobby`
- `MultiplayerLobbyPlayer`
- `MultiplayerMatch`
- `MultiplayerSignalMessage`
- `MultiplayerMatchHistory`

Core lobby fields:

- `Id`
- `GameId`: `cromagrally` or `nanosaur2`
- `Mode`
- `TrackOrLevel`
- `MaxPlayers`
- `HostParticipantId`
- `HostUserId`, optional for future signed-in flows
- `JoinCode`
- `State`: `open`, `signaling`, `ready`, `starting`, `started`, `closed`, `expired`
- `CreatedAt`
- `ExpiresAt`

Player fields:

- `ParticipantId`, issued per browser session or guest player
- `UserId`, optional
- `DisplayName`
- `PeerId`
- `PlayerIndex`
- `Role`: `host` or `client`
- `ConnectionState`
- `LastSeenAt`

Match history fields:

- `Id`
- `LobbyId`
- `GameId`
- `Mode`
- `TrackOrLevel`
- `StartedAt`
- `EndedAt`
- `EndReason`
- `HostParticipantId`
- `PlayerCount`
- `PlayerSummaries`
- `ConnectionStats`
- `DesyncReports`

### Application Services

Add `IMultiplayerLobbyService` to `PangeaRSEdit.Application`:

- create lobby
- join lobby
- leave lobby
- list public lobbies by game
- mark player ready
- start match
- close expired lobbies
- append and consume signaling messages
- record match start, match end, player disconnects, connection failures, and desync reports

Return typed application results rather than exceptions. Keep the first implementation in-memory under infrastructure, matching the existing backend shape, but define the interface so Redis/PostgreSQL can replace it.

### API and SignalR

Use HTTP for lobby CRUD and SignalR for realtime signaling.

HTTP endpoints:

- `POST /api/multiplayer/lobbies`
- `GET /api/multiplayer/lobbies?gameId=...`
- `GET /api/multiplayer/lobbies/{id}`
- `POST /api/multiplayer/lobbies/{id}/join`
- `POST /api/multiplayer/lobbies/{id}/leave`
- `POST /api/multiplayer/lobbies/{id}/ready`
- `POST /api/multiplayer/lobbies/{id}/start`

SignalR hub:

- `/api/multiplayer/signaling`
- `JoinLobby(lobbyId)`
- `SendOffer(lobbyId, targetPeerId, offer)`
- `SendAnswer(lobbyId, targetPeerId, answer)`
- `SendIceCandidate(lobbyId, targetPeerId, candidate)`
- `SetReady(lobbyId, ready)`
- `MatchStarting(lobbyId, matchConfig)`

The hub should validate that the caller's server-issued participant id belongs to the lobby before relaying messages. If the caller is signed in, also bind that participant id to the authenticated user id. The backend should not inspect SDP internals beyond size limits and schema validation.

Public matchmaking should not require sign-in in the first version. Instead, issue a server-side `ParticipantId` for each guest browser session and associate it with a display name, peer id, join code, and optional authenticated `UserId`. This keeps the API ready for later rules like signed-in-only ranked lobbies, block lists, reporting, or persistent profiles without forcing authentication into the first playable version.

### Match Config

The backend should produce a signed or server-issued match config before gameplay starts:

```json
{
  "matchId": "guid",
  "gameId": "cromagrally",
  "mode": "multiplayerRace",
  "trackOrLevel": "ice-ramp",
  "seed": 123456,
  "hostPeerId": "peer-host",
  "players": [
    { "peerId": "peer-host", "playerIndex": 0, "displayName": "Host" },
    { "peerId": "peer-client", "playerIndex": 1, "displayName": "Client" }
  ]
}
```

Cro-Mag should expose the full original network player count, 2 to 6 players, subject to testing and runtime performance. If performance or WebRTC mesh complexity becomes a blocker, reduce the public default later through lobby settings rather than hard-coding a lower protocol limit. Nanosaur 2 should keep its original two-player limit.

## Frontend Plan

### Multiplayer Shell

Add a multiplayer launch surface separate from the editor:

- choose game
- choose mode and track/level
- create lobby
- join lobby by code
- show lobby players and readiness
- start match when host and required players are ready
- launch WASM with a match config

Keep this logic outside React render closures:

- `src/multiplayer/api/`
- `src/multiplayer/signaling/`
- `src/multiplayer/webrtc/`
- `src/multiplayer/gameLaunch/`

Use Zod schemas for all backend and game-bridge messages. Use `neverthrow` `Result` or `ResultAsync` for API, SignalR, WebRTC setup, and WASM bridge calls.

### WebRTC Transport

Create a browser transport wrapper that exposes:

- `connectAsHost(matchConfig)`
- `connectAsClient(matchConfig)`
- `sendReliable(message)`
- `sendUnreliable(message)`
- `onMessage(callback)`
- `onConnectionState(callback)`

Use two data channels if supported:

- reliable ordered channel for lobby-ready, match-start, load-ready, character selection, and disconnect messages
- unordered low-latency channel for frame input packets

If browser support or network conditions make unordered channels unreliable during testing, start with reliable ordered packets because Cro-Mag's original code treats packet loss as fatal anyway.

### WASM Bridge

Add a game-agnostic JS-to-C bridge:

- JS owns WebRTC and backend communication.
- WASM game code calls imported C functions to poll and send network packets.
- JS queues inbound packets for WASM to drain each frame.

Needed imports:

- `PangeaNet_IsEnabled`
- `PangeaNet_IsHost`
- `PangeaNet_GetLocalPlayerIndex`
- `PangeaNet_GetPlayerCount`
- `PangeaNet_SendReliable`
- `PangeaNet_SendUnreliable`
- `PangeaNet_PollMessage`
- `PangeaNet_GetMatchConfig`

Needed exports:

- launch game directly into configured multiplayer mode
- set selected mode and track/level from match config
- report load-ready
- report match ended
- report fatal network desync

## Cro-Mag Implementation Plan

1. Replace NetSprocket references in `network.c` with a small `PangeaNet` backend that calls Emscripten imports when building for WASM.
2. Keep the public functions declared in `network.h` intact so `Main.c`, vehicle selection, pause, and player setup code continue to work.
3. Implement host and join setup from the match config instead of modal NetSprocket dialogs.
4. Map backend-assigned `playerIndex` to `gMyNetworkPlayerNum`; host remains player `0`.
5. Populate `gNumRealPlayers`, `gPlayerInfo[i].onThisMachine`, and player names from match config.
6. Serialize existing `NetConfigMessageType`, `NetSyncMessageType`, `NetHostControlInfoMessageType`, `NetClientControlInfoMessageType`, and `NetPlayerCharTypeMessage` into explicit little-endian byte packets for browser transport.
7. Preserve the original lockstep order in `PlayArea`.
8. Add timeout handling that returns to the frontend shell with a typed network error instead of a fatal alert.
9. Start with these modes:
   - multiplayer race
   - survival
   - tag variants
   - capture the flag after race/survival are stable

Main risk: deterministic simulation drift. Cro-Mag already has a random-seed sync check; keep it and add structured desync reporting with frame number, local player index, random value, and mode.

## Nanosaur 2 Implementation Plan

1. Add `network.h` and `network.c` equivalents for Nanosaur 2, using the same `PangeaNet` bridge as Cro-Mag but with a smaller packet set.
2. Add globals:
   - `gNetGameInProgress`
   - `gIsNetworkHost`
   - `gIsNetworkClient`
   - `gMyNetworkPlayerNum`
   - `gNumRealPlayers`
3. Keep `gNumPlayers = 2` for simulation in network versus mode, but render only the local player's pane.
4. Add a network launch path that sets:
   - `gNumPlayers = 2`
   - `gVSMode`
   - `gLevelNum`
   - local player index from match config
5. Change the input phase in `PlayLevel`:
   - host reads local player input
   - client receives host frame bundle before simulation
   - client reads and sends local input for the next frame after simulation input has been consumed
   - host receives client input for the next frame after rendering or at the end of the frame
6. Network packet types:
   - match config
   - load ready
   - client input
   - host input bundle
   - pause request
   - disconnect
7. Use the same deterministic random seed across peers at level start.
8. Delay online capture-the-flag until race and battle are stable, because carried objects, bases, wormholes, and scoring create more desync surfaces.

Main risk: the local split-screen assumptions are more deeply embedded than Cro-Mag's network assumptions. Rendering one local pane while simulating both players should be handled before any gameplay networking work is considered complete.

## Protocol

Use a versioned binary gameplay protocol on the data channel:

- `protocolVersion`
- `gameId`
- `matchId`
- `messageType`
- `frameNumber`
- `payload`

Do not send raw C structs directly across peers. Define packed serialization functions so padding, alignment, compiler, and endian behavior cannot leak into the protocol.

Recommended first message types:

- `hello`
- `matchConfigAck`
- `loadReady`
- `clientInput`
- `hostFrameInputBundle`
- `characterSelection`
- `pause`
- `disconnect`
- `desync`

## NAT Traversal

Use STUN for the first playable version:

- configurable STUN server list in frontend config
- backend passes ICE server config to lobby participants

STUN is appropriate for a private or early public test because it keeps infrastructure simple and allows direct P2P connections for many networks. Add TURN when connection reliability matters more than infrastructure cost. Without TURN, some users behind symmetric NATs, restrictive corporate networks, or carrier-grade NATs will fail to connect. TURN credentials should be minted by the backend with short lifetimes once TURN is introduced.

## Security and Abuse Controls

- Do not require sign-in for public matchmaking in the first version.
- Keep optional authenticated `UserId` fields and authorization checks so signed-in-only lobbies can be enabled later.
- Allow private join-code lobbies without lobby listing.
- Issue guest participant ids server-side rather than trusting browser-generated identity.
- Rate-limit lobby creation, join attempts, and signaling messages.
- Expire abandoned lobbies.
- Cap signaling payload size.
- Do not trust frontend-supplied player indexes, host role, or match config.
- Treat the host as gameplay-authoritative for first version, but document that this is not cheat-resistant.
- Store matchmaking history without retaining raw SDP, ICE candidates, IP addresses, or gameplay packets longer than operationally necessary.

## Milestones

### 1. Backend and Frontend Signaling Skeleton

- Add lobby API and SignalR hub.
- Add frontend lobby UI and WebRTC connection wrapper.
- Verify two browser tabs can create, join, exchange SDP/ICE, open data channels, and send test packets.

### 2. Cro-Mag Online Race Prototype

- Implement `PangeaNet` bridge in the Cro-Mag WASM build.
- Launch directly into a two-player race from match config.
- Exchange input packets over WebRTC.
- Validate deterministic sync over several laps in two local browser tabs.

### 3. Cro-Mag Multiplayer Modes

- Add vehicle/character selection sync.
- Add survival and tag modes.
- Add capture-the-flag.
- Test the full 2-to-6 player network range, including mesh connection setup, host input aggregation, CPU cost, and rendering load.

### 4. Nanosaur 2 Online Race Prototype

- Add Nanosaur 2 network globals and bridge.
- Launch directly into a two-player race.
- Render local pane only while simulating both players.
- Exchange input packets and validate deterministic sync.

### 5. Nanosaur 2 Battle and Capture-the-Eggs

- Add battle after race is stable.
- Add capture-the-eggs after carried-object and wormhole state are verified.
- Add desync diagnostics around player death, carried objects, lap/checkpoint state, and scoring.

### 6. Production Hardening

- Persist match history.
- Move live lobby state to Redis or PostgreSQL-backed storage if the deployment needs multiple backend instances.
- Add TURN credentials if STUN-only connection failures are common enough to affect real usage.
- Add telemetry for connection failure, RTT, packet delay, desync, and abandoned matches.
- Add reconnect policy. First version can terminate the match on disconnect, matching Cro-Mag's original host-leaves behavior.

## Testing Strategy

- Backend unit tests for lobby state transitions and authorization.
- Backend integration tests for HTTP endpoints and SignalR hub membership checks.
- Frontend tests for Zod parsing of lobby, signaling, and match-config messages.
- Browser integration test with two contexts exchanging WebRTC data-channel packets.
- Cro-Mag deterministic smoke test: same seed, same inputs, same frame counters.
- Nanosaur 2 deterministic smoke test: same seed, same inputs, same player positions/checkpoint state after fixed frame counts.
- Manual WAN tests with STUN before early public testing.
- Manual WAN tests with TURN before a reliability-focused launch.

## Decisions

- Public matchmaking should support guest players from the start.
- The backend should keep optional authenticated-user infrastructure so future signed-in-only modes, moderation, and persistent profiles do not require a redesign.
- Cro-Mag should expose the full original 2-to-6 network player count.
- Nanosaur 2 should keep its two-player limit.
- STUN-only is acceptable for the first playable version. Add TURN when testing shows connection failures are blocking real usage.
- The backend should store matchmaking history, including match summaries, connection outcomes, disconnects, and desync reports.
