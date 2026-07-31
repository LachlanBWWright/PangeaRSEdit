using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PangeaRSEdit.Infrastructure.Persistence;

public sealed class PangeaRSEditDesignTimeDbContextFactory
    : IDesignTimeDbContextFactory<PangeaRSEditDbContext>
{
    public PangeaRSEditDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<PangeaRSEditDbContext>()
            .UseNpgsql("Host=localhost;Database=pangearsedit_design;Username=postgres;Password=postgres")
            .Options;

        return new PangeaRSEditDbContext(options);
    }
}
