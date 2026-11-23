using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Tests.Api;

/// <summary>Boots the real Api host — real Program.cs, real DI wiring, real CORS/JWT
/// auth, every endpoint exactly as deployed — against an isolated EF Core in-memory
/// database instead of the real Neon/Postgres one. These tests exist specifically to
/// cover what the handler-level unit tests (Identity/, Content/) can't: actual HTTP
/// status codes, request binding, and — the real reason this exists — the add-child
/// family-ownership check, which lives directly in Program.cs's endpoint lambda, not
/// in any handler, so it had zero automated coverage before this.
///
/// One instance = one isolated database (a fresh GUID-named one per factory), so
/// tests across different IClassFixture-sharing test classes never see each other's
/// signed-up families.</summary>
public sealed class SimartBackendApiFactory : WebApplicationFactory<Program>
{
    public const string JwtSigningKey = "integration-test-signing-key-at-least-256-bits-0123456789";
    private readonly string _databaseName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Program.cs throws at startup if these are missing. The connection string's
        // actual value is never used — the real DbContext registration gets replaced
        // below — it just has to be *present* to pass that check.
        builder.UseSetting("ConnectionStrings:SimartDb", "Host=unused;Database=unused;Username=unused;Password=unused");
        builder.UseSetting("Jwt:SigningKey", JwtSigningKey);

        builder.ConfigureServices(services =>
        {
            var dbContextOptions = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<SimartDbContext>));
            if (dbContextOptions is not null)
                services.Remove(dbContextOptions);

            // Removing just the options descriptor above isn't enough — AddInfrastructure's
            // UseNpgsql() call also registered Npgsql's own provider-marker services
            // elsewhere in the collection, and EF Core refuses to build a DbContext when
            // two different providers' marker services are both visible to it ("Services
            // for database providers ... have been registered"). Giving the in-memory
            // provider its own isolated internal service provider sidesteps that check
            // entirely instead of trying to surgically find and remove every Npgsql
            // registration by hand.
            var inMemoryServices = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<SimartDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
                options.UseInternalServiceProvider(inMemoryServices);
            });
        });
    }
}
