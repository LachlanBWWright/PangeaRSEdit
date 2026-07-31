using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PangeaRSEdit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialProductionSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "multiplayer_lobbies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Mode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TrackOrLevel = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    TagDurationMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 3),
                    MaxPlayers = table.Column<int>(type: "integer", nullable: false),
                    HostParticipantId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    JoinCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    State = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    MatchSeed = table.Column<int>(type: "integer", nullable: true),
                    MatchStartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MatchEndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastReportType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    LastReportDetail = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    LastReportByParticipantId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    LastReportAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MatchResultJson = table.Column<string>(type: "text", nullable: true),
                    MatchResultByParticipantId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    MatchResultAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_multiplayer_lobbies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    AvatarUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "multiplayer_lobby_players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LobbyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParticipantId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PlayerIndex = table.Column<int>(type: "integer", nullable: false),
                    IsHost = table.Column<bool>(type: "boolean", nullable: false),
                    IsReady = table.Column<bool>(type: "boolean", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_multiplayer_lobby_players", x => x.Id);
                    table.ForeignKey(
                        name: "FK_multiplayer_lobby_players_multiplayer_lobbies_LobbyId",
                        column: x => x.LobbyId,
                        principalTable: "multiplayer_lobbies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "external_logins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ProviderSubject = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_external_logins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_external_logins_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "saved_levels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Game = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    LevelKey = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    LevelName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    SourceFileName = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    SourceFileSize = table.Column<long>(type: "bigint", nullable: false),
                    SourceFileSha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PayloadFormatVersion = table.Column<int>(type: "integer", nullable: false),
                    PayloadSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    PayloadSha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RowVersion = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saved_levels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_saved_levels_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_external_logins_Provider_ProviderSubject",
                table: "external_logins",
                columns: new[] { "Provider", "ProviderSubject" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_external_logins_UserId",
                table: "external_logins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_multiplayer_lobbies_JoinCode",
                table: "multiplayer_lobbies",
                column: "JoinCode");

            migrationBuilder.CreateIndex(
                name: "IX_multiplayer_lobby_players_LobbyId_ParticipantId",
                table: "multiplayer_lobby_players",
                columns: new[] { "LobbyId", "ParticipantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_saved_levels_UserId_Game_LevelKey",
                table: "saved_levels",
                columns: new[] { "UserId", "Game", "LevelKey" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "external_logins");

            migrationBuilder.DropTable(
                name: "multiplayer_lobby_players");

            migrationBuilder.DropTable(
                name: "saved_levels");

            migrationBuilder.DropTable(
                name: "multiplayer_lobbies");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
