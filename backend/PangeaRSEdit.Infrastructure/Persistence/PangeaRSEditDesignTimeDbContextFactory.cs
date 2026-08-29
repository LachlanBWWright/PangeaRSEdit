using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PangeaRSEdit.Infrastructure.Persistence;

public sealed class PangeaRSEditDesignTimeDbContextFactory
    : IDesignTimeDbContextFactory<PangeaRSEditDbContext>
{
    public PangeaRSEditDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? "Host=localhost;Database=pangearsedit_design;Username=postgres;Password=postgres";
        var options = new DbContextOptionsBuilder<PangeaRSEditDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new PangeaRSEditDbContext(options);
    }
}
