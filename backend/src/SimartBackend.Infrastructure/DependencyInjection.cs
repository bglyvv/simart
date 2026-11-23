using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SimartBackend.Application.Abstractions;
using SimartBackend.Infrastructure.Admin;
using SimartBackend.Infrastructure.Content;
using SimartBackend.Infrastructure.Economy;
using SimartBackend.Infrastructure.Focus;
using SimartBackend.Infrastructure.Games;
using SimartBackend.Infrastructure.Habits;
using SimartBackend.Infrastructure.Partners;
using SimartBackend.Infrastructure.Social;
using SimartBackend.Infrastructure.Identity;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("SimartDb")
            ?? throw new InvalidOperationException(
                "Missing ConnectionStrings:SimartDb — set it via `dotnet user-secrets` for local dev " +
                "(see backend/README.md) or the SIMARTDB_CONNECTION env var in other environments.");

        services.AddDbContext<SimartDbContext>(options => options
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention());

        // The family app's read model — reads the already-synced catalog from
        // SimartDbContext, so it has to match the DbContext's own (scoped) lifetime.
        services.AddScoped<IPlaylistCatalog, DbPlaylistCatalog>();

        // The real YouTube Data API v3 — used by GetNewContentQuery to find videos
        // on the channel that aren't in the database yet (see YouTubeApiContentSource's
        // doc comment). Named client so the base address is set once here instead of
        // being hardcoded into every request URL.
        services.AddHttpClient(YouTubeApiContentSource.HttpClientName,
            c => c.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/"));
        services.AddScoped<IYouTubeContentSource, YouTubeApiContentSource>();
        services.AddScoped<IContentCatalogRepository, EfContentCatalogRepository>();

        services.AddScoped<IFamilyAccountRepository, EfFamilyAccountRepository>();
        services.AddSingleton<IPasswordHasher, PasswordHasherAdapter>();
        services.AddSingleton<IAuthTokenService, JwtAuthTokenService>();

        // Resend's HTTP API — ForgotPasswordCommand's only side effect besides the
        // database write. Named client so the base address is set once here, same
        // pattern as the YouTube Data API client above.
        services.AddHttpClient(ResendPasswordResetEmailSender.HttpClientName,
            c => c.BaseAddress = new Uri("https://api.resend.com/"));
        services.AddScoped<IPasswordResetEmailSender, ResendPasswordResetEmailSender>();
        services.AddScoped<IHabitCatalogRepository, EfHabitCatalogRepository>();
        services.AddScoped<IAdminAccountRepository, EfAdminAccountRepository>();
        services.AddScoped<IFocusRepository, EfFocusRepository>();
        services.AddScoped<IRewardRepository, EfRewardRepository>();
        services.AddScoped<IWalletRepository, EfWalletRepository>();
        services.AddScoped<IPartnerAccountRepository, EfPartnerAccountRepository>();
        services.AddScoped<IVoucherRepository, EfVoucherRepository>();
        services.AddScoped<IRewardProposalRepository, EfRewardProposalRepository>();
        services.AddScoped<ISocialRepository, EfSocialRepository>();
        services.AddScoped<IGameRepository, EfGameRepository>();

        return services;
    }
}
