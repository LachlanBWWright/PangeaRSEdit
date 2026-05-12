using Microsoft.EntityFrameworkCore;
using PangeaRSEdit.Infrastructure.Persistence.Entities;

namespace PangeaRSEdit.Infrastructure.Persistence;

public sealed class PangeaRSEditDbContext(DbContextOptions<PangeaRSEditDbContext> options)
    : DbContext(options)
{
    public DbSet<UserProfileEntity> UserProfiles => Set<UserProfileEntity>();
    public DbSet<ExternalLoginEntity> ExternalLogins => Set<ExternalLoginEntity>();
    public DbSet<SavedLevelEntity> SavedLevels => Set<SavedLevelEntity>();
    public DbSet<MultiplayerLobbyEntity> MultiplayerLobbies => Set<MultiplayerLobbyEntity>();
    public DbSet<MultiplayerLobbyPlayerEntity> MultiplayerLobbyPlayers => Set<MultiplayerLobbyPlayerEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserProfileEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.DisplayName).HasMaxLength(256);
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.AvatarUrl).HasMaxLength(2048);
            entity.Property(x => x.CreatedAt);
            entity.Property(x => x.UpdatedAt);
        });

        modelBuilder.Entity<ExternalLoginEntity>(entity =>
        {
            entity.ToTable("external_logins");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.Provider).HasMaxLength(64);
            entity.Property(x => x.ProviderSubject).HasMaxLength(256);
            entity.HasIndex(x => new { x.Provider, x.ProviderSubject }).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(x => x.ExternalLogins)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SavedLevelEntity>(entity =>
        {
            entity.ToTable("saved_levels");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.Game).HasMaxLength(64);
            entity.Property(x => x.LevelKey).HasMaxLength(256);
            entity.Property(x => x.LevelName).HasMaxLength(256);
            entity.Property(x => x.SourceFileName).HasMaxLength(512);
            entity.Property(x => x.SourceFileSha256).HasMaxLength(128);
            entity.Property(x => x.PayloadSha256).HasMaxLength(128);
            entity.Property(x => x.Description).HasMaxLength(2048);
            entity.Property(x => x.PayloadJson);
            entity.Property(x => x.RowVersion).IsConcurrencyToken();
            entity.HasIndex(x => new { x.UserId, x.Game, x.LevelKey });
            entity.HasOne(x => x.User)
                .WithMany(x => x.SavedLevels)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MultiplayerLobbyEntity>(entity =>
        {
            entity.ToTable("multiplayer_lobbies");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.GameId).HasMaxLength(64);
            entity.Property(x => x.Mode).HasMaxLength(64);
            entity.Property(x => x.TrackOrLevel).HasMaxLength(256);
            entity.Property(x => x.HostParticipantId).HasMaxLength(128);
            entity.Property(x => x.JoinCode).HasMaxLength(32);
            entity.Property(x => x.State).HasMaxLength(64);
            entity.HasIndex(x => x.JoinCode);
            entity.HasMany(x => x.Players)
                .WithOne(x => x.Lobby)
                .HasForeignKey(x => x.LobbyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MultiplayerLobbyPlayerEntity>(entity =>
        {
            entity.ToTable("multiplayer_lobby_players");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.ParticipantId).HasMaxLength(128);
            entity.Property(x => x.DisplayName).HasMaxLength(256);
            entity.HasIndex(x => new { x.LobbyId, x.ParticipantId }).IsUnique();
        });
    }
}
