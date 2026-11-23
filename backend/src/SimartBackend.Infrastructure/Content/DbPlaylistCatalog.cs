using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Infrastructure.Persistence;
using DomainAudience = SimartBackend.Domain.Content.Audience;
using DomainPlaylist = SimartBackend.Domain.Content.Playlist;
using DomainVideo = SimartBackend.Domain.Content.PlaylistVideo;
using PlaylistEntity = SimartBackend.Domain.Entities.Content.Playlist;

namespace SimartBackend.Infrastructure.Content;

/// <summary>Reads playlists from the database instead of the embedded seed — this is
/// the default <see cref="IPlaylistCatalog"/> registration; <c>SeededPlaylistCatalog</c>
/// stays registered under the <see cref="KeyedServiceNames.SeedPlaylistCatalog"/> key as
/// the one-time source <c>SyncPlaylistsFromSeedCommand</c> upserts from.</summary>
public sealed class DbPlaylistCatalog(SimartDbContext db) : IPlaylistCatalog
{
    public async Task<IReadOnlyList<DomainPlaylist>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rows = await db.Playlists
            .Include(p => p.Videos)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return rows.Select(ToDomain).ToList();
    }

    private static DomainPlaylist ToDomain(PlaylistEntity row) => new(
        row.YoutubePlaylistId ?? row.Id.ToString(),
        row.YoutubePlaylistId,
        row.Title,
        row.Audience == "parent" ? DomainAudience.Parent : DomainAudience.Child,
        row.Description,
        row.ColorFrom,
        row.ColorTo,
        row.Videos.OrderBy(v => v.SortOrder).Select(v => new DomainVideo(
            v.YoutubeVideoId,
            v.Title,
            Domain.Content.DurationFormat.FormatFromSeconds(v.DurationSeconds))).ToList());
}
