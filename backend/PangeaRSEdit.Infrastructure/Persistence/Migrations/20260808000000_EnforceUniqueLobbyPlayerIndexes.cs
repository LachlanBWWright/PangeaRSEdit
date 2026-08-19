using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PangeaRSEdit.Infrastructure.Persistence.Migrations;

[DbContext(typeof(PangeaRSEditDbContext))]
[Migration("20260808000000_EnforceUniqueLobbyPlayerIndexes")]
public partial class EnforceUniqueLobbyPlayerIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_multiplayer_lobby_players_LobbyId_PlayerIndex",
            table: "multiplayer_lobby_players",
            columns: new[] { "LobbyId", "PlayerIndex" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_multiplayer_lobby_players_LobbyId_PlayerIndex",
            table: "multiplayer_lobby_players");
    }
}
