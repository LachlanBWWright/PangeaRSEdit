using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PangeaRSEdit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PersistLobbyVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "multiplayer_lobbies",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "multiplayer_lobbies");
        }
    }
}
