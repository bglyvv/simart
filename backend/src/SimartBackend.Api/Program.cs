using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SimartBackend.Api.Contracts;
using SimartBackend.Application;
using SimartBackend.Application.Admin;
using SimartBackend.Application.Admin.Commands.LoginAdmin;
using SimartBackend.Application.Content;
using SimartBackend.Application.Content.Commands.AssignVideo;
using SimartBackend.Application.Content.Commands.CreatePlaylist;
using SimartBackend.Application.Content.Commands.DeletePlaylist;
using SimartBackend.Application.Content.Commands.DeleteVideo;
using SimartBackend.Application.Content.Commands.ImportYoutubePlaylist;
using SimartBackend.Application.Content.Commands.MoveVideo;
using SimartBackend.Application.Content.Commands.RestorePlaylist;
using SimartBackend.Application.Content.Commands.RestoreVideo;
using SimartBackend.Application.Content.Commands.UpsertWatchProgress;
using SimartBackend.Application.Content.Queries.GetDeletedPlaylists;
using SimartBackend.Application.Content.Queries.GetDeletedVideos;
using SimartBackend.Application.Content.Queries.GetNewContent;
using SimartBackend.Application.Content.Queries.GetPlaylists;
using SimartBackend.Application.Content.Queries.GetPlaylistVideos;
using SimartBackend.Application.Content.Queries.GetWatchProgress;
using SimartBackend.Application.Content.Queries.VerifyYoutubePlaylist;
using SimartBackend.Application.Economy;
using SimartBackend.Application.Economy.Commands.ApproveRewardRedemption;
using SimartBackend.Application.Economy.Commands.Donate;
using SimartBackend.Application.Economy.Commands.GrantAllowance;
using SimartBackend.Application.Economy.Commands.RedeemReward;
using SimartBackend.Application.Economy.Commands.RejectRewardRedemption;
using SimartBackend.Application.Economy.Queries.GetDonationCampaigns;
using SimartBackend.Application.Economy.Queries.GetPendingRedemptions;
using SimartBackend.Application.Economy.Queries.GetRewards;
using SimartBackend.Application.Economy.Queries.GetWalletBalance;
using SimartBackend.Application.Economy.Queries.GetWalletTransactions;
using SimartBackend.Application.Focus;
using SimartBackend.Application.Focus.Commands.AddScreenTime;
using SimartBackend.Application.Focus.Commands.StartFocusLock;
using SimartBackend.Application.Focus.Queries.GetActiveFocusLock;
using SimartBackend.Application.Focus.Queries.GetScreenTime;
using SimartBackend.Application.Games;
using SimartBackend.Application.Games.Commands.RecordGamePlay;
using SimartBackend.Application.Games.Queries.GetGamePlays;
using SimartBackend.Application.Habits;
using SimartBackend.Application.Social;
using SimartBackend.Application.Social.Commands.CreateComment;
using SimartBackend.Application.Social.Commands.CreatePost;
using SimartBackend.Application.Social.Commands.LikePost;
using SimartBackend.Application.Social.Commands.UnlikePost;
using SimartBackend.Application.Social.Queries.GetComments;
using SimartBackend.Application.Social.Queries.GetLeaderboard;
using SimartBackend.Application.Social.Queries.GetPosts;
using SimartBackend.Application.Habits.Commands.AddHabitTask;
using SimartBackend.Application.Habits.Commands.CompleteHabitTask;
using SimartBackend.Application.Habits.Commands.CreateFamilyHabitTask;
using SimartBackend.Application.Habits.Commands.CreateHabitCategory;
using SimartBackend.Application.Habits.Commands.UncompleteHabitTask;
using SimartBackend.Application.Habits.Queries.GetHabitCategories;
using SimartBackend.Application.Habits.Queries.GetHabitCompletions;
using SimartBackend.Application.Habits.Queries.GetHabitStreak;
using SimartBackend.Application.Habits.Queries.GetChildXp;
using SimartBackend.Application.Identity;
using SimartBackend.Application.Identity.Commands.AddChild;
using SimartBackend.Application.Identity.Commands.DeactivateFamily;
using SimartBackend.Application.Identity.Commands.ForgotPassword;
using SimartBackend.Application.Identity.Commands.LoginFamily;
using SimartBackend.Application.Identity.Commands.ReactivateFamily;
using SimartBackend.Application.Identity.Commands.ResetPassword;
using SimartBackend.Application.Identity.Commands.SignUpFamily;
using SimartBackend.Application.Identity.Commands.UpdateChild;
using SimartBackend.Application.Identity.Commands.UpdateParent;
using SimartBackend.Application.Identity.Queries.GetChildren;
using SimartBackend.Application.Identity.Queries.GetDeactivatedFamilies;
using SimartBackend.Application.Identity.Queries.GetFamilies;
using SimartBackend.Application.Partners;
using SimartBackend.Application.Partners.Commands.AdminAcceptRewardProposal;
using SimartBackend.Application.Partners.Commands.AdminDeclineRewardProposal;
using SimartBackend.Application.Partners.Commands.AdminEditRewardProposal;
using SimartBackend.Application.Partners.Commands.FulfillVoucher;
using SimartBackend.Application.Partners.Commands.LoginPartner;
using SimartBackend.Application.Partners.Commands.PartnerApproveRewardProposal;
using SimartBackend.Application.Partners.Commands.PartnerRejectRewardProposal;
using SimartBackend.Application.Partners.Commands.SubmitRewardProposal;
using SimartBackend.Application.Partners.Queries.GetAdminRewardProposals;
using SimartBackend.Application.Partners.Queries.GetPartnerRewardProposals;
using SimartBackend.Application.Partners.Queries.GetVoucher;
using SimartBackend.Domain.Content;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Games;
using SimartBackend.Domain.Entities.Partners;
using SimartBackend.Infrastructure;
using SimartBackend.Infrastructure.Identity;
using SimartBackend.Infrastructure.Persistence;
using AdminEntity = SimartBackend.Domain.Entities.Admin.Admin;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "Frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

// Same signing key JwtAuthTokenService issues tokens with (see its doc comment for
// why a single symmetric key is enough — one backend issues and validates).
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]
    ?? throw new InvalidOperationException(
        "Missing Jwt:SigningKey — set it via `dotnet user-secrets` for local dev " +
        "(see backend/README.md) or the JWT__SIGNINGKEY env var in other environments.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SimartBackend";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SimartFrontend";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

// Admin accounts have no public signup (unlike Parent) — self-service admin creation
// would be a real backdoor, not a bridging convenience, so there's no POST
// /api/admin/signup. Exactly one admin is seeded idempotently here instead — runs on
// every startup (so a fresh/reset database always gets it back), only ever inserts
// when the row is actually missing, never overwrites an existing one (so changing the
// password by hand, e.g. via SettingsPage equivalent once one exists, sticks).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimartDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<SimartBackend.Application.Abstractions.IPasswordHasher>();
    const string seedAdminEmail = "admin@simart.az";
    if (!await db.Admins.AnyAsync(a => a.Email == seedAdminEmail))
    {
        db.Admins.Add(new AdminEntity
        {
            Id = Guid.NewGuid(),
            FullName = "SİMART Admin",
            Email = seedAdminEmail,
            PasswordHash = passwordHasher.Hash("Sim_2026_art/gm"),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}

// The reward catalog ("Mükafat Mağazası") has no admin management UI yet, so
// it's a fixed set seeded idempotently here instead — same "insert only if
// missing, every startup" shape as the admin account above, just gated on
// the whole table being empty (there's no single natural key to check one
// row at a time for a multi-row catalog). The four rewards match what used
// to be the frontend's static mock data in src/data/leagues.json.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimartDbContext>();
    if (!await db.Rewards.AnyAsync())
    {
        db.Rewards.AddRange(
            new Reward { Id = Guid.NewGuid(), Title = "Libra Kitab Mağazası", Description = "10 AZN-lik kitab endirimi", CostXp = 400, Icon = "books" },
            new Reward { Id = Guid.NewGuid(), Title = "Bambini Dondurma", Description = "1 pulsuz uşaq dondurması", CostXp = 250, Icon = "ice-cream" },
            new Reward { Id = Guid.NewGuid(), Title = "Genclik Parkı", Description = "2 nəfərlik giriş bileti", CostXp = 900, Icon = "ticket" },
            new Reward { Id = Guid.NewGuid(), Title = "ToyWorld Mağazası", Description = "15 AZN-lik hədiyyə kartı", CostXp = 600, Icon = "gift" });
        await db.SaveChangesAsync();
    }
}

// The six mini-games have no admin management UI either — same "fixed set,
// seeded idempotently" shape as the reward catalog above. Slugs/titles/icons/
// axes match GAME_CATALOG, the frontend's own static display metadata
// (GamesPage.tsx) — RecordGamePlayCommand resolves a play's slug to this
// table's internal Guid, never the other way around.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimartDbContext>();
    if (!await db.Games.AnyAsync())
    {
        db.Games.AddRange(
            new Game { Id = Guid.NewGuid(), Slug = "memory", Title = "Memory Match", Icon = "cards", Axis = "memory" },
            new Game { Id = Guid.NewGuid(), Slug = "tangram", Title = "Tangram", Icon = "triangle", Axis = "creativity" },
            new Game { Id = Guid.NewGuid(), Slug = "sudoku", Title = "Sudoku for Kids", Icon = "grid", Axis = "logic" },
            new Game { Id = Guid.NewGuid(), Slug = "sequence", Title = "Puzzle Logic", Icon = "link", Axis = "logic" },
            new Game { Id = Guid.NewGuid(), Slug = "colors", Title = "Rənglərin Sehri", Icon = "palette", Axis = "attention" },
            new Game { Id = Guid.NewGuid(), Slug = "words", Title = "Söz Tapmacası", Icon = "text", Axis = "reaction" });
        await db.SaveChangesAsync();
    }
}

// The donation campaign catalog ("Mükafat Mağazası"'s wallet-side sibling) has
// no admin management UI either — same "fixed set, seeded idempotently" shape
// as Games/Rewards above. The two campaigns match what used to be the
// frontend's static mock data in src/data/wallet.json.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimartDbContext>();
    if (!await db.DonationCampaigns.AnyAsync())
    {
        db.DonationCampaigns.AddRange(
            new DonationCampaign { Id = Guid.NewGuid(), Title = "Kimsəsiz Heyvanlara Sığınacaq Dəstəyi", Sponsor = "Rəsmi Sponsor: PASHA Bank", XpCost = 500, AznAmount = 5m, Icon = "paw" },
            new DonationCampaign { Id = Guid.NewGuid(), Title = "Meşə Salma Kampaniyası", Sponsor = "Rəsmi Sponsor: Kapital Bank", XpCost = 300, AznAmount = 3m, Icon = "tree" });
        await db.SaveChangesAsync();
    }
}

// Partner accounts — the real-world businesses/sponsors behind the Reward/
// DonationCampaign catalogs (see Reward.PartnerId/DonationCampaign.PartnerId
// and Voucher's own doc comment). Same "no self-service signup, fixed set
// seeded idempotently" shape as the single Admin account above, just six
// rows instead of one — each checked by its own email (not a single "table
// empty" gate), so a future seventh partner can be added here without
// re-seeding the ones that already exist. All six share one demo password
// (documented openly in backend/README.md, unlike the real Admin password
// above — these are synthetic demo accounts for exercising this feature,
// never a real deployment's credentials).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimartDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<SimartBackend.Application.Abstractions.IPasswordHasher>();
    var seedPartners = new (string Name, string Email)[]
    {
        ("Libra Kitab Mağazası", "libra@partners.simart.az"),
        ("Bambini Dondurma", "bambini@partners.simart.az"),
        ("Gənclik Parkı", "genclikparki@partners.simart.az"),
        ("ToyWorld Mağazası", "toyworld@partners.simart.az"),
        ("PASHA Bank", "pashabank@partners.simart.az"),
        ("Kapital Bank", "kapitalbank@partners.simart.az"),
    };
    foreach (var (name, email) in seedPartners)
    {
        if (!await db.Partners.AnyAsync(p => p.Email == email))
        {
            db.Partners.Add(new Partner
            {
                Id = Guid.NewGuid(),
                Name = name,
                Email = email,
                PasswordHash = passwordHasher.Hash("Partner_Demo_2026!"),
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }
    }
    await db.SaveChangesAsync();

    // Backfill PartnerId onto whichever Reward/DonationCampaign rows already
    // existed before this round — the "only if the whole table is empty"
    // seed blocks above never re-run against an already-populated catalog,
    // so a real row from an earlier round would otherwise be stuck with
    // PartnerId null forever. Matched by title/name — the only stable link
    // between the two catalogs and these new partner accounts right now.
    var partnersByName = await db.Partners.ToDictionaryAsync(p => p.Name, p => p.Id);

    var rewardPartnerMap = new Dictionary<string, string>
    {
        ["Libra Kitab Mağazası"] = "Libra Kitab Mağazası",
        ["Bambini Dondurma"] = "Bambini Dondurma",
        ["Genclik Parkı"] = "Gənclik Parkı",
        ["ToyWorld Mağazası"] = "ToyWorld Mağazası",
    };
    foreach (var reward in await db.Rewards.Where(r => r.PartnerId == null).ToListAsync())
    {
        if (rewardPartnerMap.TryGetValue(reward.Title, out var partnerName) && partnersByName.TryGetValue(partnerName, out var partnerId))
            reward.PartnerId = partnerId;
    }

    var campaignPartnerMap = new Dictionary<string, string>
    {
        ["Kimsəsiz Heyvanlara Sığınacaq Dəstəyi"] = "PASHA Bank",
        ["Meşə Salma Kampaniyası"] = "Kapital Bank",
    };
    foreach (var campaign in await db.DonationCampaigns.Where(c => c.PartnerId == null).ToListAsync())
    {
        if (campaignPartnerMap.TryGetValue(campaign.Title, out var partnerName) && partnersByName.TryGetValue(partnerName, out var partnerId))
            campaign.PartnerId = partnerId;
    }

    await db.SaveChangesAsync();
}

app.MapGet("/api/content/playlists", async (ISender sender, string? audience, CancellationToken cancellationToken) =>
{
    Audience? parsedAudience;
    switch (audience)
    {
        case null:
            parsedAudience = null;
            break;
        case "parent":
            parsedAudience = Audience.Parent;
            break;
        case "child":
            parsedAudience = Audience.Child;
            break;
        default:
            return Results.BadRequest(new { error = $"Unknown audience '{audience}'. Use 'parent' or 'child', or omit it for both." });
    }

    var playlists = await sender.Send(new GetPlaylistsQuery(parsedAudience), cancellationToken);
    return Results.Ok(playlists);
})
.WithName("GetPlaylists");

// Admin-gated — a manually-created playlist, not one discovered from YouTube (see
// "Deliberately not built" in root CLAUDE.md's "YouTube content sync" — this is
// that gap, closed: an admin registering a real YouTube playlist id + the
// audience/color metadata YouTube has no concept of). Rejects a youtubePlaylistId
// that already exists, including a soft-deleted one, rather than creating a
// confusing duplicate.
app.MapPost("/api/content/playlists", async (
    ISender sender, CreatePlaylistRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    // youtubePlaylistId is now optional — omitting it creates a playlist that
    // isn't tied to any real YouTube playlist at all (see CreatePlaylistCommand).
    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (body.Audience is not ("parent" or "child"))
        return Results.BadRequest(new { error = "audience must be 'parent' or 'child'." });
    if (string.IsNullOrWhiteSpace(body.ColorFrom) || string.IsNullOrWhiteSpace(body.ColorTo))
        return Results.BadRequest(new { error = "colorFrom and colorTo are required." });

    try
    {
        var result = await sender.Send(
            new CreatePlaylistCommand(
                string.IsNullOrWhiteSpace(body.YoutubePlaylistId) ? null : body.YoutubePlaylistId.Trim(),
                body.Title.Trim(), body.Audience, body.Description?.Trim(), body.ColorFrom, body.ColorTo),
            cancellationToken);
        return Results.Created($"/api/content/playlists/{result.PublicId}", result);
    }
    catch (PlaylistAlreadyExistsException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status409Conflict);
    }
})
.RequireAuthorization()
.WithName("CreatePlaylist");

// The create-playlist modal's "is this a YouTube playlist?" toggle's "Yoxla"
// (check) button — a dry-run against the real YouTube Data API v3, writes
// nothing. 404 if the id/URL the admin typed in isn't a real, public playlist.
app.MapPost("/api/content/playlists/verify-youtube", async (
    ISender sender, VerifyYoutubePlaylistRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.YoutubePlaylistId))
        return Results.BadRequest(new { error = "youtubePlaylistId is required." });

    var preview = await sender.Send(new VerifyYoutubePlaylistQuery(body.YoutubePlaylistId.Trim()), cancellationToken);
    return preview is null
        ? Results.NotFound(new { error = "Playlist YouTube-da tapılmadı." })
        : Results.Ok(preview);
})
.RequireAuthorization()
.WithName("VerifyYoutubePlaylist");

// The create-playlist modal's actual submit once the "Yoxla" check above passed —
// registers the playlist and pulls in every one of its videos in one go. 404 if
// the playlist disappeared from YouTube between check and submit; 409 if this
// youtubePlaylistId is already registered (including a soft-deleted one).
app.MapPost("/api/content/playlists/import-youtube", async (
    ISender sender, ImportYoutubePlaylistRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.YoutubePlaylistId))
        return Results.BadRequest(new { error = "youtubePlaylistId is required." });
    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (body.Audience is not ("parent" or "child"))
        return Results.BadRequest(new { error = "audience must be 'parent' or 'child'." });
    if (string.IsNullOrWhiteSpace(body.ColorFrom) || string.IsNullOrWhiteSpace(body.ColorTo))
        return Results.BadRequest(new { error = "colorFrom and colorTo are required." });

    try
    {
        var result = await sender.Send(
            new ImportYoutubePlaylistCommand(
                body.YoutubePlaylistId.Trim(), body.Title.Trim(), body.Audience, body.Description?.Trim(),
                body.ColorFrom, body.ColorTo),
            cancellationToken);
        return Results.Created($"/api/content/playlists/{result.Playlist.PublicId}", result);
    }
    catch (PlaylistAlreadyExistsException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status409Conflict);
    }
    catch (PlaylistNotFoundException)
    {
        return Results.NotFound(new { error = "Playlist YouTube-da tapılmadı." });
    }
})
.RequireAuthorization()
.WithName("ImportYoutubePlaylist");

// Admin-gated, same AdminIdClaimType check as everywhere else. POST because it
// triggers real calls to the YouTube Data API (not free of side effects on quota),
// but it never writes to our own database — it's a diff: every video currently on
// the channel, minus whatever's already in Video.YoutubeVideoId. Nothing gets
// auto-added; see AssignVideo below for the write an admin actually confirms.
app.MapPost("/api/content/sync", async (ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var newVideos = await sender.Send(new GetNewContentQuery(), cancellationToken);
    return Results.Ok(newVideos);
})
.RequireAuthorization()
.WithName("GetNewContent");

// The write AssignVideo above's discovery actually leads to — one video at a time,
// each with whatever playlist/audience the admin picked in the review UI.
// PlaylistId null is valid (a video with no playlist); Audience is always required.
app.MapPost("/api/content/videos", async (
    ISender sender, AssignVideoRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.YoutubeVideoId))
        return Results.BadRequest(new { error = "youtubeVideoId is required." });
    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (body.Audience is not ("parent" or "child"))
        return Results.BadRequest(new { error = "audience must be 'parent' or 'child'." });

    try
    {
        var result = await sender.Send(
            new AssignVideoCommand(body.YoutubeVideoId, body.Title.Trim(), body.Duration, body.YoutubePlaylistId, body.Audience),
            cancellationToken);
        return Results.Created($"/api/content/videos/{result.Id}", result);
    }
    catch (PlaylistNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AssignVideo");

// Soft delete — the admin dashboard's "remove from feed" action on a video inside
// an expanded playlist. The video row (and anything already referencing it) stays
// in the database; the global IsDeleted query filter is what actually makes it
// disappear from GetPlaylistsQuery/DbPlaylistCatalog, i.e. the family app.
app.MapDelete("/api/content/videos/{youtubeVideoId}", async (
    ISender sender, string youtubeVideoId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var adminId = user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType);
    if (!Guid.TryParse(adminId, out var parsedAdminId))
        return Results.Forbid();

    try
    {
        await sender.Send(new DeleteVideoCommand(youtubeVideoId, parsedAdminId), cancellationToken);
        return Results.NoContent();
    }
    catch (VideoNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("DeleteVideo");

// Soft delete for a playlist — see IContentCatalogRepository.SoftDeletePlaylistAsync's
// doc comment for what happens to its videos (nothing directly; they just become
// unreachable once their parent is filtered out of GetPlaylistsQuery's result).
app.MapDelete("/api/content/playlists/{youtubePlaylistId}", async (
    ISender sender, string youtubePlaylistId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var adminId = user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType);
    if (!Guid.TryParse(adminId, out var parsedAdminId))
        return Results.Forbid();

    try
    {
        await sender.Send(new DeletePlaylistCommand(youtubePlaylistId, parsedAdminId), cancellationToken);
        return Results.NoContent();
    }
    catch (PlaylistNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("DeletePlaylist");

// Admin dashboard's "Silinmiş" (deleted) tab — read-only, no restore endpoint
// exists yet. Admin-gated like everything else here, even though it's a GET —
// this is exactly the kind of thing a family app should never see.
app.MapGet("/api/content/deleted-playlists", async (ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var result = await sender.Send(new GetDeletedPlaylistsQuery(), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetDeletedPlaylists");

app.MapGet("/api/content/deleted-videos", async (ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var result = await sender.Send(new GetDeletedVideosQuery(), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetDeletedVideos");

// The "Silinmiş" tab's restore buttons — the reverse of the DELETE endpoints above.
// POST, not PATCH/PUT: this isn't a partial update, it's one specific state
// transition (undo a soft delete), same "action, not a resource edit" reasoning
// AssignVideo/CreatePlaylist already use POST for.
app.MapPost("/api/content/videos/{youtubeVideoId}/restore", async (
    ISender sender, string youtubeVideoId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new RestoreVideoCommand(youtubeVideoId), cancellationToken);
        return Results.NoContent();
    }
    catch (VideoNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("RestoreVideo");

app.MapPost("/api/content/playlists/{youtubePlaylistId}/restore", async (
    ISender sender, string youtubePlaylistId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new RestorePlaylistCommand(youtubePlaylistId), cancellationToken);
        return Results.NoContent();
    }
    catch (PlaylistNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("RestorePlaylist");

// The "Silinmiş" tab's expand action on a deleted playlist — every one of its
// videos, deleted or not, so an admin can see exactly which would come back if
// the playlist were restored and which were deleted separately. Also works for
// an active (non-deleted) playlist id, though PlaylistDto.Videos already covers
// that case on the "Playlistlər" tab. 404 if no playlist (deleted or not) matches.
app.MapGet("/api/content/playlists/{playlistId}/videos", async (
    ISender sender, string playlistId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var videos = await sender.Send(new GetPlaylistVideosQuery(playlistId), cancellationToken);
    return videos is null
        ? Results.NotFound(new { error = $"Playlist '{playlistId}' was not found." })
        : Results.Ok(videos);
})
.RequireAuthorization()
.WithName("GetPlaylistVideos");

// The admin dashboard's per-video "change playlist" control, on both an active
// video row and the restore-warning's "move to a different playlist instead"
// option — youtubePlaylistId null removes it from any playlist. Works on a
// soft-deleted video too (not just active ones), since the restore-warning case
// needs exactly that.
app.MapPost("/api/content/videos/{youtubeVideoId}/move", async (
    ISender sender, string youtubeVideoId, MoveVideoRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new MoveVideoCommand(youtubeVideoId, body.YoutubePlaylistId), cancellationToken);
        return Results.NoContent();
    }
    catch (VideoNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (PlaylistNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("MoveVideo");

// Real per-video watch-progress sync — WatchProgress existed in the schema from
// the start, unused: AnimationsPage.tsx's `watchedPct` was always local-only
// Zustand state. These are this Content domain's first family-facing (child-
// ownership-gated) endpoints — everything else in this slice so far is
// admin-only. Keyed by the YoutubeVideoId the frontend already has; the internal
// Video.Id WatchProgress is actually a foreign key to is resolved server-side
// only (ContentCatalogRepository.ResolveVideoIdAsync), same "never surface the
// internal id" shape playlists already use.
app.MapGet("/api/content/children/{childId:guid}/watch-progress", async (
    ISender sender, Guid childId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetWatchProgressQuery(callerFamilyId, childId), cancellationToken);
        return Results.Ok(result);
    }
    catch (ContentChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (ContentAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetWatchProgress");

app.MapPost("/api/content/children/{childId:guid}/watch-progress", async (
    ISender sender, Guid childId, UpsertWatchProgressRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new UpsertWatchProgressCommand(callerFamilyId, childId, body.YoutubeVideoId, body.WatchedPct), cancellationToken);
        return Results.Ok(result);
    }
    catch (ContentChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (VideoNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (ContentAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidWatchedPctException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("UpsertWatchProgress");

// Signup is unauthenticated by nature (you don't have a token until you have an
// account) but now returns one immediately — see SignUpFamilyCommandHandler's
// "auto-login" comment — so the frontend's signup -> add-child flow never needs a
// separate login call.
app.MapPost("/api/identity/signup", async (ISender sender, SignUpRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.FullName))
        return Results.BadRequest(new { error = "fullName is required." });
    if (string.IsNullOrWhiteSpace(body.Email) || !body.Email.Contains('@'))
        return Results.BadRequest(new { error = "A valid email is required." });
    if (string.IsNullOrWhiteSpace(body.Password) || body.Password.Length < 6)
        return Results.BadRequest(new { error = "Password must be at least 6 characters." });
    if (string.IsNullOrWhiteSpace(body.Pin) || body.Pin.Length != 4 || !body.Pin.All(char.IsDigit))
        return Results.BadRequest(new { error = "PIN must be exactly 4 digits." });

    try
    {
        var result = await sender.Send(
            new SignUpFamilyCommand(body.FullName.Trim(), body.Email, body.Password, body.Pin),
            cancellationToken);
        return Results.Created($"/api/identity/families/{result.FamilyId}", result);
    }
    catch (EmailAlreadyUsedException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithName("SignUpFamily");

app.MapPost("/api/identity/login", async (ISender sender, LoginRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.BadRequest(new { error = "Email and password are required." });

    try
    {
        var result = await sender.Send(new LoginFamilyCommand(body.Email, body.Password), cancellationToken);
        return Results.Ok(result);
    }
    catch (InvalidCredentialsException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
    }
})
.WithName("LoginFamily");

// Always 204, whether or not the email matches a real account — same
// anti-enumeration shape InvalidCredentialsException already uses for login, just
// applied to a different endpoint. The actual email send (if any) happens inside
// the handler; a caller watching responses alone can never tell which case occurred.
app.MapPost("/api/identity/forgot-password", async (ISender sender, ForgotPasswordRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || !body.Email.Contains('@'))
        return Results.BadRequest(new { error = "A valid email is required." });

    await sender.Send(new ForgotPasswordCommand(body.Email), cancellationToken);
    return Results.NoContent();
})
.WithName("ForgotPassword");

app.MapPost("/api/identity/reset-password", async (ISender sender, ResetPasswordRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.Token))
        return Results.BadRequest(new { error = "token is required." });
    if (string.IsNullOrWhiteSpace(body.NewPassword) || body.NewPassword.Length < 6)
        return Results.BadRequest(new { error = "Password must be at least 6 characters." });

    try
    {
        await sender.Send(new ResetPasswordCommand(body.Token, body.NewPassword), cancellationToken);
        return Results.NoContent();
    }
    catch (InvalidResetTokenException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("ResetPassword");

// Auth-gated: the caller's token has to belong to the family it's writing a child
// into. This is the concrete "know which family is making this request" piece
// CLAUDE.md flagged as the real prerequisite for any write path.
app.MapPost("/api/identity/families/{familyId:guid}/children", async (
    ISender sender, Guid familyId, AddChildRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var tokenFamilyId = user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType);
    if (tokenFamilyId != familyId.ToString())
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.Name))
        return Results.BadRequest(new { error = "name is required." });
    if (string.IsNullOrWhiteSpace(body.AvatarEmoji))
        return Results.BadRequest(new { error = "avatarEmoji is required." });
    if (body.Gender is not ("boy" or "girl"))
        return Results.BadRequest(new { error = "gender must be 'boy' or 'girl'." });
    if (string.IsNullOrWhiteSpace(body.City))
        return Results.BadRequest(new { error = "city is required." });

    try
    {
        var result = await sender.Send(
            new AddChildCommand(familyId, body.Name.Trim(), body.AvatarEmoji, body.Gender, body.DateOfBirth, body.City.Trim()),
            cancellationToken);
        return Results.Created($"/api/identity/children/{result.ChildId}", result);
    }
    catch (FamilyNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AddChild");

// Same family-ownership gate as AddChild above — lets a returning parent (e.g. on a
// new device, with no local child cached) recover which child profile(s) to resume
// after LoginFamily, which only ever returns family/parent info by itself.
app.MapGet("/api/identity/families/{familyId:guid}/children", async (
    ISender sender, Guid familyId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var tokenFamilyId = user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType);
    if (tokenFamilyId != familyId.ToString())
        return Results.Forbid();

    var children = await sender.Send(new GetChildrenQuery(familyId), cancellationToken);
    return Results.Ok(children);
})
.RequireAuthorization()
.WithName("GetChildren");

// Open when familyId is omitted (the admin panel's view: admin-catalog tasks only).
// When familyId is given (the family app's view), it has to match the caller's own
// token — same direct-claim-vs-param check as everywhere else, just conditional on
// whether the caller is asking for their own family's tasks at all.
app.MapGet("/api/habits/categories", async (
    ISender sender, Guid? familyId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (familyId is not null)
    {
        var tokenFamilyId = user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType);
        if (tokenFamilyId != familyId.ToString())
            return Results.Forbid();
    }

    var categories = await sender.Send(new GetHabitCategoriesQuery(familyId), cancellationToken);
    return Results.Ok(categories);
})
.WithName("GetHabitCategories");

// Admin-gated, same pattern as /api/content/sync above. The *read* endpoint above
// stays open to the family app too (it's just the category/task catalog); these two
// writes are admin-only in practice, now actually enforced.
app.MapPost("/api/habits/categories", async (
    ISender sender, CreateHabitCategoryRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.Key))
        return Results.BadRequest(new { error = "key is required." });
    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (string.IsNullOrWhiteSpace(body.Icon))
        return Results.BadRequest(new { error = "icon is required." });

    var result = await sender.Send(
        new CreateHabitCategoryCommand(body.Key.Trim(), body.Title.Trim(), body.Icon.Trim()),
        cancellationToken);
    return Results.Created($"/api/habits/categories/{result.Id}", result);
})
.RequireAuthorization()
.WithName("CreateHabitCategory");

app.MapPost("/api/habits/categories/{categoryId:guid}/tasks", async (
    ISender sender, Guid categoryId, AddHabitTaskRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (body.XpValue <= 0)
        return Results.BadRequest(new { error = "xpValue must be a positive number." });

    try
    {
        var result = await sender.Send(
            new AddHabitTaskCommand(categoryId, body.Title.Trim(), body.Note?.Trim(), body.XpValue),
            cancellationToken);
        return Results.Created($"/api/habits/categories/{categoryId}/tasks/{result.Id}", result);
    }
    catch (HabitCategoryNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AddHabitTask");

// A parent creating a task for their OWN family — family-ownership gate like
// AddChild, not the admin gate above (a parent token has no adminId claim and
// never will). FamilyHabitLimits caps this at 5 tasks/family and 10 XP/task —
// a parent is trusted with their own family's catalog, but not to hand out
// unlimited tasks or XP the way an admin implicitly is.
app.MapPost("/api/habits/families/{familyId:guid}/tasks", async (
    ISender sender, Guid familyId, CreateFamilyHabitTaskRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var tokenFamilyId = user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType);
    if (tokenFamilyId != familyId.ToString())
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(body.Title))
        return Results.BadRequest(new { error = "title is required." });
    if (body.XpValue <= 0)
        return Results.BadRequest(new { error = "xpValue must be a positive number." });

    try
    {
        var result = await sender.Send(
            new CreateFamilyHabitTaskCommand(familyId, body.CategoryId, body.Title.Trim(), body.Note?.Trim(), body.XpValue),
            cancellationToken);
        return Results.Created($"/api/habits/categories/{body.CategoryId}/tasks/{result.Id}", result);
    }
    catch (HabitCategoryNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitTaskXpTooHighException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (TooManyFamilyHabitTasksException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status409Conflict);
    }
})
.RequireAuthorization()
.WithName("CreateFamilyHabitTask");

// These three are keyed by childId, not familyId — the route doesn't carry the
// family to compare against directly, so the ownership check happens inside the
// handler via HabitChildOwnership (resolves the child's real family, then compares
// to the caller's token familyId). Same net effect as the direct-claim checks
// everywhere else, just one DB lookup deeper because of how the URL is shaped.
app.MapPost("/api/habits/children/{childId:guid}/completions", async (
    ISender sender, Guid childId, CompleteHabitTaskRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new CompleteHabitTaskCommand(callerFamilyId, childId, body.TaskId, body.LogDate), cancellationToken);
        return Results.Ok(result);
    }
    catch (HabitChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitTaskNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("CompleteHabitTask");

app.MapDelete("/api/habits/children/{childId:guid}/completions/{taskId:guid}", async (
    ISender sender, Guid childId, Guid taskId, DateOnly logDate, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        await sender.Send(new UncompleteHabitTaskCommand(callerFamilyId, childId, taskId, logDate), cancellationToken);
        return Results.NoContent();
    }
    catch (HabitChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("UncompleteHabitTask");

app.MapGet("/api/habits/children/{childId:guid}/completions", async (
    ISender sender, Guid childId, DateOnly logDate, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetHabitCompletionsQuery(callerFamilyId, childId, logDate), cancellationToken);
        return Results.Ok(result);
    }
    catch (HabitChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetHabitCompletions");

// HabitsPage.tsx's "Həftəlik Seriya" (weekly streak) widget — was entirely static
// mock data before this, even for a family synced to a real backend account.
// `today` is a required query param, not computed from DateTime.UtcNow server-side
// — same reasoning as logDate everywhere else in this slice: only the frontend
// actually knows the child's local "today".
app.MapGet("/api/habits/children/{childId:guid}/streak", async (
    ISender sender, Guid childId, DateOnly today, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetHabitStreakQuery(callerFamilyId, childId, today), cancellationToken);
        return Results.Ok(result);
    }
    catch (HabitChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetHabitStreak");

// The real, authoritative total XP — the same ledger sum a redeem/donate
// attempt checks server-side. Added because the frontend's own xp display
// is a local, optimistically-updated counter that can drift from this (e.g.
// a streak bonus computed server-side that the local "+3 XP" guess didn't
// know about) — a child could see enough XP locally to afford a reward and
// still get a real 400 from the spend, with nothing on screen explaining
// why. Lets pages reconcile the displayed number against the real one.
app.MapGet("/api/habits/children/{childId:guid}/xp", async (
    ISender sender, Guid childId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var totalXp = await sender.Send(new GetChildXpQuery(callerFamilyId, childId), cancellationToken);
        return Results.Ok(new { totalXp });
    }
    catch (HabitChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (HabitAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetChildXp");

// Focus Mode's "video limit reached" lock — FocusSession existed in the schema
// since the start with no handler ever touching it; AnimationsPage.tsx starts a
// real lock after 2 videos complete in a day, FocusModePage.tsx reads it back so
// the countdown (and the lock itself) survives a reload or a different device,
// not just local Zustand state. Keyed by childId, same ownership-via-child shape
// as the Habits completion routes above.
app.MapPost("/api/focus/children/{childId:guid}/lock", async (
    ISender sender, Guid childId, StartFocusLockRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new StartFocusLockCommand(callerFamilyId, childId, body.Minutes, body.Reason), cancellationToken);
        return Results.Ok(result);
    }
    catch (FocusChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (FocusAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidFocusLockMinutesException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("StartFocusLock");

app.MapGet("/api/focus/children/{childId:guid}/lock/active", async (
    ISender sender, Guid childId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetActiveFocusLockQuery(callerFamilyId, childId), cancellationToken);
        return result is null ? Results.NoContent() : Results.Ok(result);
    }
    catch (FocusChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (FocusAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetActiveFocusLock");

// Real cumulative screen-time tracking — a genuinely new mechanism, not an
// extension of FocusSession (which only ever records lock events, never
// cumulative watch-time — see this file's own comment above). Backs
// HabitsPage.tsx's "Bugünkü ekran vaxtı" stat, flagged as still-mock in root
// CLAUDE.md's "Focus Mode" section until this round. AnimationsPage.tsx flushes
// small positive real-elapsed-playback-time deltas every few seconds while a
// video is actually playing — Date is required from the caller, same "only the
// frontend knows the child's local 'today'" reasoning as logDate everywhere
// else in this backend.
app.MapPost("/api/focus/children/{childId:guid}/screen-time", async (
    ISender sender, Guid childId, AddScreenTimeRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new AddScreenTimeCommand(callerFamilyId, childId, body.Date, body.SecondsDelta), cancellationToken);
        return Results.Ok(result);
    }
    catch (FocusChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (FocusAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidScreenTimeDeltaException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AddScreenTime");

app.MapGet("/api/focus/children/{childId:guid}/screen-time", async (
    ISender sender, Guid childId, DateOnly date, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetScreenTimeQuery(callerFamilyId, childId, date), cancellationToken);
        return Results.Ok(result);
    }
    catch (FocusChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (FocusAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetScreenTime");

// Leagues' "Mükafat Mağazası" (reward store) — Reward/RewardRedemption existed in
// the schema from the start with zero handlers; LeaguesPage.tsx's redeem flow was
// entirely local Zustand state (an instant, unapproved "spend"). The real version
// matches the mock's own disclaimer text (a reward only unlocks after a parent
// approves it): redeeming debits XP immediately (reserving it) and creates a
// "pending" row; a parent then approves (no further XP change) or rejects
// (refunds the XP) from Settings. See "Leagues" in backend/README.md.
app.MapGet("/api/leagues/children/{childId:guid}/rewards", async (
    ISender sender, Guid childId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetRewardsQuery(callerFamilyId, childId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetRewards");

app.MapPost("/api/leagues/children/{childId:guid}/rewards/{rewardId:guid}/redeem", async (
    ISender sender, Guid childId, Guid rewardId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new RedeemRewardCommand(callerFamilyId, childId, rewardId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InsufficientXpException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (RewardAlreadyRedeemedException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("RedeemReward");

// Keyed by the caller's own familyId (query param, validated against the token) —
// same shape GET /api/habits/categories?familyId= already uses — rather than a
// childId, since a parent reviewing pending redemptions wants their whole family's
// list, not one child at a time.
app.MapGet("/api/leagues/pending-redemptions", async (
    ISender sender, Guid familyId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    var tokenFamilyId = user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType);
    if (tokenFamilyId is null || tokenFamilyId != familyId.ToString())
        return Results.Forbid();

    var result = await sender.Send(new GetPendingRedemptionsQuery(familyId), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetPendingRedemptions");

app.MapPost("/api/leagues/redemptions/{redemptionId:guid}/approve", async (
    ISender sender, Guid redemptionId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();
    if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var callerParentId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new ApproveRewardRedemptionCommand(callerFamilyId, callerParentId, redemptionId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RedemptionNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (RedemptionAlreadyResolvedException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("ApproveRewardRedemption");

app.MapPost("/api/leagues/redemptions/{redemptionId:guid}/reject", async (
    ISender sender, Guid redemptionId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();
    if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var callerParentId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new RejectRewardRedemptionCommand(callerFamilyId, callerParentId, redemptionId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RedemptionNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (RedemptionAlreadyResolvedException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("RejectRewardRedemption");

// The "Təhlükəsiz Sosial Mühit" feed — SocialPost/PostLike/SocialComment/
// CommentLike existed in the schema from the start with zero handlers;
// SocialPage.tsx's feed, likes, and leaderboard were all static mock JSON, with
// no way to actually post anything. Deliberately cross-family (unlike every
// other slice in this file): the feed and leaderboard span every family in the
// app, same as the original mock always implied — see ISocialRepository's doc
// comment. CommentLike is NOT wired up this round — see "Social" in
// backend/README.md for what's deliberately still missing.
app.MapGet("/api/social/posts", async (
    ISender sender, Guid childId, int? limit, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetPostsQuery(callerFamilyId, childId, limit ?? 20), cancellationToken);
        return Results.Ok(result);
    }
    catch (SocialChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetPosts");

app.MapPost("/api/social/children/{childId:guid}/posts", async (
    ISender sender, Guid childId, CreatePostRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new CreatePostCommand(callerFamilyId, childId, body.Caption, body.MediaEmoji), cancellationToken);
        return Results.Created($"/api/social/posts/{result.Id}", result);
    }
    catch (SocialChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (SocialCaptionInvalidException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("CreatePost");

app.MapPost("/api/social/children/{childId:guid}/posts/{postId:guid}/like", async (
    ISender sender, Guid childId, Guid postId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        await sender.Send(new LikePostCommand(callerFamilyId, childId, postId), cancellationToken);
        return Results.NoContent();
    }
    catch (SocialChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialPostNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("LikePost");

app.MapDelete("/api/social/children/{childId:guid}/posts/{postId:guid}/like", async (
    ISender sender, Guid childId, Guid postId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        await sender.Send(new UnlikePostCommand(callerFamilyId, childId, postId), cancellationToken);
        return Results.NoContent();
    }
    catch (SocialChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("UnlikePost");

app.MapGet("/api/social/posts/{postId:guid}/comments", async (
    ISender sender, Guid postId, CancellationToken cancellationToken) =>
{
    try
    {
        var result = await sender.Send(new GetCommentsQuery(postId), cancellationToken);
        return Results.Ok(result);
    }
    catch (SocialPostNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("GetComments");

app.MapPost("/api/social/children/{childId:guid}/posts/{postId:guid}/comments", async (
    ISender sender, Guid childId, Guid postId, CreateCommentRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new CreateCommentCommand(callerFamilyId, childId, postId, body.Body, body.ParentCommentId), cancellationToken);
        return Results.Created($"/api/social/posts/{postId}/comments/{result.Id}", result);
    }
    catch (SocialChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialPostNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (SocialAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (SocialCommentInvalidException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (SocialParentCommentMismatchException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("CreateComment");

app.MapGet("/api/social/leaderboard", async (ISender sender, int? limit, CancellationToken cancellationToken) =>
{
    var result = await sender.Send(new GetLeaderboardQuery(limit ?? 10), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetLeaderboard");

// Mini-games — Game/GameResult existed in the schema from the start with zero
// handlers; GamesPage.tsx's six games always played fine (all client-side
// logic, no backend needed for that), but every result and every XP award was
// local Zustand state only (`gameHistory`/`addXp`), never reaching the
// backend even for a backend-synced child. Keyed by childId, same ownership-
// via-child shape as the Habits completion / Focus lock routes. The XP amount
// is computed server-side (GameXpAward, mirroring GamesPage.tsx's own
// formula exactly) and written to the same XpTransaction ledger Habits first
// wrote and Leagues first spent from — a direct client-sent XP number is
// never trusted, same posture as every other XP award in this backend.
app.MapPost("/api/games/children/{childId:guid}/plays", async (
    ISender sender, Guid childId, RecordGamePlayRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new RecordGamePlayCommand(callerFamilyId, childId, body.GameId, body.Score), cancellationToken);
        return Results.Ok(result);
    }
    catch (GameChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (GameAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (GameNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidGameScoreException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("RecordGamePlay");

app.MapGet("/api/games/children/{childId:guid}/plays", async (
    ISender sender, Guid childId, int? limit, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetGamePlaysQuery(callerFamilyId, childId, limit ?? 30), cancellationToken);
        return Results.Ok(result);
    }
    catch (GameChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (GameAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetGamePlays");

// The kid's wallet — WalletTransaction/DonationCampaign existed in the schema
// from the start with zero handlers; WalletPage.tsx's balance, transaction
// history, and donate flow were all static mock data / local-only Zustand
// state, and `donate()` never actually kept the balance in sync with its own
// transaction log (see IWalletRepository.GetBalanceAsync's doc comment — the
// real formula, balance = sum(in) - sum(out), is only actually enforced now).
// The donation campaign catalog is open/unauthenticated, same "just a
// catalog, nothing to own" shape as GET /api/habits/categories; everything
// else here is keyed by childId, same ownership-via-child shape as Habits/
// Focus/Games. See "Wallet" in backend/README.md for the full design,
// including why GrantAllowance (a parent manually crediting pocket money) is
// the one piece of this that's a genuinely new capability, not a port of
// existing mock behavior.
app.MapGet("/api/wallet/donation-campaigns", async (ISender sender, CancellationToken cancellationToken) =>
{
    var result = await sender.Send(new GetDonationCampaignsQuery(), cancellationToken);
    return Results.Ok(result);
})
.WithName("GetDonationCampaigns");

app.MapGet("/api/wallet/children/{childId:guid}/balance", async (
    ISender sender, Guid childId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetWalletBalanceQuery(callerFamilyId, childId), cancellationToken);
        return Results.Ok(result);
    }
    catch (WalletChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (WalletAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetWalletBalance");

app.MapGet("/api/wallet/children/{childId:guid}/transactions", async (
    ISender sender, Guid childId, int? limit, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetWalletTransactionsQuery(callerFamilyId, childId, limit ?? 30), cancellationToken);
        return Results.Ok(result);
    }
    catch (WalletChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (WalletAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetWalletTransactions");

app.MapPost("/api/wallet/children/{childId:guid}/donations", async (
    ISender sender, Guid childId, DonateRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new DonateCommand(callerFamilyId, childId, body.CampaignId), cancellationToken);
        return Results.Ok(result);
    }
    catch (WalletChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (WalletAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (DonationCampaignNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InsufficientXpException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("Donate");

// A parent manually granting pocket money — the real version of "Valideyn Cib
// Pulu", see GrantAllowanceCommand's doc comment for what this round
// deliberately left out (automatic league-tier/streak AZN credits).
app.MapPost("/api/wallet/children/{childId:guid}/allowance", async (
    ISender sender, Guid childId, GrantAllowanceRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.FamilyIdClaimType), out var callerFamilyId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GrantAllowanceCommand(callerFamilyId, childId, body.AmountAzn), cancellationToken);
        return Results.Ok(result);
    }
    catch (WalletChildNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (WalletAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidAllowanceAmountException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("GrantAllowance");

// Admin login — email/password against the Admin table (seeded at startup above, see
// that comment for why there's no public signup to pair with this). Reuses
// LoginRequest (same Email/Password shape as family login) rather than a near-
// identical duplicate contract.
app.MapPost("/api/admin/login", async (ISender sender, LoginRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.BadRequest(new { error = "Email and password are required." });

    try
    {
        var result = await sender.Send(new LoginAdminCommand(body.Email, body.Password), cancellationToken);
        return Results.Ok(result);
    }
    catch (InvalidAdminCredentialsException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
    }
})
.WithName("LoginAdmin");

// Admin-only account directory — never consumed by the family app. Admin-gated, same
// pattern as /api/content/sync above.
app.MapGet("/api/admin/families", async (ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var families = await sender.Send(new GetFamiliesQuery(), cancellationToken);
    return Results.Ok(families);
})
.RequireAuthorization()
.WithName("GetFamilies");

// Admin account management — deactivate/reactivate a family (cascades onto its
// Parents/Children, see IFamilyAccountRepository.DeactivateFamilyAsync) and edit a
// parent's display name / a child's name+city. AdminAccountsPage.tsx used to be
// listing-only; this is the "Next steps" gap that closed.
app.MapGet("/api/admin/families/deactivated", async (
    ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var families = await sender.Send(new GetDeactivatedFamiliesQuery(), cancellationToken);
    return Results.Ok(families);
})
.RequireAuthorization()
.WithName("GetDeactivatedFamilies");

app.MapPost("/api/admin/families/{familyId:guid}/deactivate", async (
    ISender sender, Guid familyId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType), out var adminId))
        return Results.Forbid();

    try
    {
        await sender.Send(new DeactivateFamilyCommand(familyId, adminId), cancellationToken);
        return Results.NoContent();
    }
    catch (FamilyNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("DeactivateFamily");

app.MapPost("/api/admin/families/{familyId:guid}/reactivate", async (
    ISender sender, Guid familyId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new ReactivateFamilyCommand(familyId), cancellationToken);
        return Results.NoContent();
    }
    catch (FamilyNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("ReactivateFamily");

app.MapPatch("/api/admin/parents/{parentId:guid}", async (
    ISender sender, Guid parentId, UpdateParentRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new UpdateParentCommand(parentId, body.FullName), cancellationToken);
        return Results.NoContent();
    }
    catch (ParentNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidParentNameException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("UpdateParent");

app.MapPatch("/api/admin/children/{childId:guid}", async (
    ISender sender, Guid childId, UpdateChildRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    try
    {
        await sender.Send(new UpdateChildCommand(childId, body.Name, body.City), cancellationToken);
        return Results.NoContent();
    }
    catch (ChildAccountNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidChildInfoException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("UpdateChild");

// Partner login — a real-world business (the bookstore, the ice cream shop,
// the park, the toy store, or one of the two sponsor banks) fulfilling
// redemptions in person. Reuses LoginRequest (same Email/Password shape as
// family/admin login), same "no near-identical duplicate contract" reasoning
// LoginAdmin already established. Six demo accounts are seeded at startup
// above — see that comment for why there's no public partner signup either.
app.MapPost("/api/partners/login", async (ISender sender, LoginRequest body, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.BadRequest(new { error = "Email and password are required." });

    try
    {
        var result = await sender.Send(new LoginPartnerCommand(body.Email, body.Password), cancellationToken);
        return Results.Ok(result);
    }
    catch (InvalidPartnerCredentialsException)
    {
        return Results.Unauthorized();
    }
})
.WithName("LoginPartner");

// The QR scan/manual-entry lookup — GetVoucherQueryHandler's own ownership
// check means a partner can only ever see a voucher tied to their own
// Rewards/DonationCampaigns, never another partner's, even with a code they
// somehow guessed.
app.MapGet("/api/partners/vouchers/{code}", async (
    ISender sender, string code, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new GetVoucherQuery(callerPartnerId, code), cancellationToken);
        return Results.Ok(result);
    }
    catch (VoucherNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (VoucherAccessDeniedException)
    {
        return Results.Forbid();
    }
})
.RequireAuthorization()
.WithName("GetVoucher");

// Marks a voucher collected in person — the loop a QR scan closes. See
// FulfillVoucherCommandHandler's own doc comment for the extra gate on a
// reward-sourced voucher (the underlying redemption has to be "approved").
app.MapPost("/api/partners/vouchers/{code}/fulfill", async (
    ISender sender, string code, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new FulfillVoucherCommand(callerPartnerId, code), cancellationToken);
        return Results.Ok(result);
    }
    catch (VoucherNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (VoucherAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (VoucherAlreadyFulfilledException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (VoucherNotYetApprovedException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("FulfillVoucher");

// Reward proposals — "partner can create something that can be redeemed
// using XP, admin should accept it; admin can also edit it, which sends it
// back to the partner's panel; once they approve it, it's public." See
// RewardProposal's own doc comment in the Domain layer for the full
// lifecycle and backend/README.md's "Reward proposals" for the endpoint
// contracts. Every write returns the proposal's full event history
// (RewardProposalDto.Events) — the explicitly requested "there should be a
// history" is satisfied by that, not a separate endpoint.
app.MapPost("/api/partners/reward-proposals", async (
    ISender sender, SubmitRewardProposalRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new SubmitRewardProposalCommand(callerPartnerId, body.Title, body.Description, body.CostXp, body.Icon), cancellationToken);
        return Results.Ok(result);
    }
    catch (InvalidRewardProposalFieldsException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("SubmitRewardProposal");

app.MapGet("/api/partners/reward-proposals", async (
    ISender sender, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    var result = await sender.Send(new GetPartnerRewardProposalsQuery(callerPartnerId), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetPartnerRewardProposals");

app.MapPost("/api/partners/reward-proposals/{proposalId:guid}/approve", async (
    ISender sender, Guid proposalId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new PartnerApproveRewardProposalCommand(callerPartnerId, proposalId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardProposalNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardProposalAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidRewardProposalStatusException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("PartnerApproveRewardProposal");

app.MapPost("/api/partners/reward-proposals/{proposalId:guid}/reject", async (
    ISender sender, Guid proposalId, RejectRewardProposalRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.PartnerIdClaimType), out var callerPartnerId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new PartnerRejectRewardProposalCommand(callerPartnerId, proposalId, body.Note), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardProposalNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (RewardProposalAccessDeniedException)
    {
        return Results.Forbid();
    }
    catch (InvalidRewardProposalStatusException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("PartnerRejectRewardProposal");

// Admin-gated, same AdminIdClaimType check as everywhere else.
app.MapGet("/api/admin/reward-proposals", async (
    ISender sender, string? status, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType) is null)
        return Results.Forbid();

    var result = await sender.Send(new GetAdminRewardProposalsQuery(status), cancellationToken);
    return Results.Ok(result);
})
.RequireAuthorization()
.WithName("GetAdminRewardProposals");

app.MapPost("/api/admin/reward-proposals/{proposalId:guid}/accept", async (
    ISender sender, Guid proposalId, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType), out var adminId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new AdminAcceptRewardProposalCommand(proposalId, adminId), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardProposalNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidRewardProposalStatusException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AdminAcceptRewardProposal");

app.MapPost("/api/admin/reward-proposals/{proposalId:guid}/edit", async (
    ISender sender, Guid proposalId, EditRewardProposalRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType), out var adminId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(
            new AdminEditRewardProposalCommand(proposalId, adminId, body.Title, body.Description, body.CostXp, body.Icon), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardProposalNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidRewardProposalStatusException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (InvalidRewardProposalFieldsException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AdminEditRewardProposal");

app.MapPost("/api/admin/reward-proposals/{proposalId:guid}/decline", async (
    ISender sender, Guid proposalId, DeclineRewardProposalRequest body, ClaimsPrincipal user, CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(user.FindFirstValue(JwtAuthTokenService.AdminIdClaimType), out var adminId))
        return Results.Forbid();

    try
    {
        var result = await sender.Send(new AdminDeclineRewardProposalCommand(proposalId, adminId, body.Note), cancellationToken);
        return Results.Ok(result);
    }
    catch (RewardProposalNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (InvalidRewardProposalStatusException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.RequireAuthorization()
.WithName("AdminDeclineRewardProposal");

app.Run();

// Top-level statements generate an internal Program class by default — this makes it
// public and nameable so WebApplicationFactory<Program> (in SimartBackend.Tests) can
// boot the real app. Doesn't change runtime behavior at all.
public partial class Program;
