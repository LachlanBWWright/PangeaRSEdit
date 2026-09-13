CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

CREATE TABLE multiplayer_lobbies (
    "Id" uuid NOT NULL,
    "GameId" character varying(64) NOT NULL,
    "Mode" character varying(64) NOT NULL,
    "TrackOrLevel" character varying(256) NOT NULL,
    "TagDurationMinutes" integer NOT NULL DEFAULT 3,
    "MaxPlayers" integer NOT NULL,
    "HostParticipantId" character varying(128) NOT NULL,
    "JoinCode" character varying(32) NOT NULL,
    "State" character varying(64) NOT NULL,
    "MatchId" uuid,
    "MatchSeed" integer,
    "MatchStartedAt" timestamp with time zone,
    "MatchEndedAt" timestamp with time zone,
    "LastReportType" character varying(64),
    "LastReportDetail" character varying(512),
    "LastReportByParticipantId" character varying(128),
    "LastReportAt" timestamp with time zone,
    "MatchResultJson" text,
    "MatchResultByParticipantId" character varying(128),
    "MatchResultAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ExpiresAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_multiplayer_lobbies" PRIMARY KEY ("Id")
);

CREATE TABLE users (
    "Id" uuid NOT NULL,
    "DisplayName" character varying(256) NOT NULL,
    "Email" character varying(320) NOT NULL,
    "AvatarUrl" character varying(2048) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_users" PRIMARY KEY ("Id")
);

CREATE TABLE multiplayer_lobby_players (
    "Id" uuid NOT NULL,
    "LobbyId" uuid NOT NULL,
    "ParticipantId" character varying(128) NOT NULL,
    "DisplayName" character varying(256) NOT NULL,
    "PlayerIndex" integer NOT NULL,
    "IsHost" boolean NOT NULL,
    "IsReady" boolean NOT NULL,
    "JoinedAt" timestamp with time zone NOT NULL,
    "LastSeenAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_multiplayer_lobby_players" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_multiplayer_lobby_players_multiplayer_lobbies_LobbyId" FOREIGN KEY ("LobbyId") REFERENCES multiplayer_lobbies ("Id") ON DELETE CASCADE
);

CREATE TABLE external_logins (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Provider" character varying(64) NOT NULL,
    "ProviderSubject" character varying(256) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_external_logins" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_external_logins_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
);

CREATE TABLE saved_levels (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Game" character varying(64) NOT NULL,
    "LevelKey" character varying(256) NOT NULL,
    "LevelName" character varying(256) NOT NULL,
    "SourceFileName" character varying(512) NOT NULL,
    "SourceFileSize" bigint NOT NULL,
    "SourceFileSha256" character varying(128) NOT NULL,
    "PayloadFormatVersion" integer NOT NULL,
    "PayloadSizeBytes" bigint NOT NULL,
    "PayloadSha256" character varying(128) NOT NULL,
    "Description" character varying(2048) NOT NULL,
    "PayloadJson" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    "DeletedAt" timestamp with time zone,
    "RowVersion" bigint NOT NULL,
    CONSTRAINT "PK_saved_levels" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_saved_levels_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "IX_external_logins_Provider_ProviderSubject" ON external_logins ("Provider", "ProviderSubject");
CREATE INDEX "IX_external_logins_UserId" ON external_logins ("UserId");
CREATE INDEX "IX_multiplayer_lobbies_JoinCode" ON multiplayer_lobbies ("JoinCode");
CREATE UNIQUE INDEX "IX_multiplayer_lobby_players_LobbyId_ParticipantId" ON multiplayer_lobby_players ("LobbyId", "ParticipantId");
CREATE INDEX "IX_saved_levels_UserId_Game_LevelKey" ON saved_levels ("UserId", "Game", "LevelKey");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260714144409_InitialProductionSchema', '9.0.5');

ALTER TABLE multiplayer_lobbies ADD "IsPublic" boolean NOT NULL DEFAULT TRUE;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260714150215_PersistLobbyVisibility', '9.0.5');

CREATE UNIQUE INDEX "IX_multiplayer_lobby_players_LobbyId_PlayerIndex" ON multiplayer_lobby_players ("LobbyId", "PlayerIndex");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260808000000_EnforceUniqueLobbyPlayerIndexes', '9.0.5');
