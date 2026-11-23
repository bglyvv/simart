using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content;
using SimartBackend.Domain.Entities.Content;
using SimartBackend.Infrastructure.Persistence;
using PlaylistEntity = SimartBackend.Domain.Entities.Content.Playlist;
using VideoEntity = SimartBackend.Domain.Entities.Content.Video;

namespace SimartBackend.Infrastructure.Content;

public sealed class EfContentCatalogRepository(SimartDbContext db) : IContentCatalogRepository
{
    public async Task<IReadOnlySet<string>> GetExistingYoutubeVideoIdsAsync(CancellationToken cancellationToken) =>
        (await db.Videos
            // A soft-deleted (moderated-out) video should never be re-discovered as
            // "new" and silently re-added — the global query filter would otherwise
            // hide it from this check entirely.
            .IgnoreQueryFilters()
            .Select(v => v.YoutubeVideoId)
            .ToListAsync(cancellationToken))
        .ToHashSet();

    public async Task<IReadOnlyList<PlaylistSummary>> GetPlaylistSummariesAsync(CancellationToken cancellationToken) =>
        await db.Playlists
            // A playlist created without a real YouTube id can't be scanned by
            // YouTubeApiContentSource (there's no id to call playlistItems.list
            // with) — exclude it rather than passing a null id into that call.
            .Where(p => p.YoutubePlaylistId != null)
            .Select(p => new PlaylistSummary(p.Id, p.YoutubePlaylistId!, p.Title, p.Audience))
            .ToListAsync(cancellationToken);

    public async Task<Guid?> ResolvePlaylistPublicIdAsync(string publicId, CancellationToken cancellationToken)
    {
        var byYoutubeId = await db.Playlists
            .IgnoreQueryFilters()
            .Where(p => p.YoutubePlaylistId == publicId)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (byYoutubeId is not null)
            return byYoutubeId;

        if (!Guid.TryParse(publicId, out var guid))
            return null;

        var exists = await db.Playlists.IgnoreQueryFilters().AnyAsync(p => p.Id == guid, cancellationToken);
        return exists ? guid : null;
    }

    public async Task<Guid> AddVideoAsync(
        string youtubeVideoId, string title, int durationSeconds, Guid? playlistId, string audience,
        CancellationToken cancellationToken)
    {
        var sortOrder = playlistId is { } pid
            ? await db.Videos.CountAsync(v => v.PlaylistId == pid, cancellationToken)
            : 0;

        var video = new VideoEntity
        {
            Id = Guid.NewGuid(),
            PlaylistId = playlistId,
            YoutubeVideoId = youtubeVideoId,
            Title = title,
            DurationSeconds = durationSeconds,
            Audience = audience,
            SortOrder = sortOrder,
        };
        db.Videos.Add(video);
        await db.SaveChangesAsync(cancellationToken);

        return video.Id;
    }

    public async Task<bool> SoftDeleteVideoAsync(string youtubeVideoId, Guid deletedByAdminId, CancellationToken cancellationToken)
    {
        // The default (filtered) query, deliberately — an already-deleted video
        // should report "not found" here too, same as it does everywhere else.
        var video = await db.Videos.FirstOrDefaultAsync(v => v.YoutubeVideoId == youtubeVideoId, cancellationToken);
        if (video is null)
            return false;

        video.IsDeleted = true;
        video.DeletedAt = DateTimeOffset.UtcNow;
        video.DeletedBy = deletedByAdminId;
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public Task<bool> PlaylistExistsAsync(string youtubePlaylistId, CancellationToken cancellationToken) =>
        db.Playlists.IgnoreQueryFilters().AnyAsync(p => p.YoutubePlaylistId == youtubePlaylistId, cancellationToken);

    public async Task<Guid> AddPlaylistAsync(
        string? youtubePlaylistId, string title, string audience, string? description, string colorFrom, string colorTo,
        CancellationToken cancellationToken)
    {
        var playlist = new PlaylistEntity
        {
            Id = Guid.NewGuid(),
            YoutubePlaylistId = youtubePlaylistId,
            Title = title,
            Audience = audience,
            Description = description,
            ColorFrom = colorFrom,
            ColorTo = colorTo,
        };
        db.Playlists.Add(playlist);
        await db.SaveChangesAsync(cancellationToken);

        return playlist.Id;
    }

    public async Task<bool> SoftDeletePlaylistAsync(string publicId, Guid deletedByAdminId, CancellationToken cancellationToken)
    {
        var internalId = await ResolvePlaylistPublicIdAsync(publicId, cancellationToken);
        if (internalId is null)
            return false;

        var playlist = await db.Playlists.FirstOrDefaultAsync(p => p.Id == internalId, cancellationToken);
        if (playlist is null)
            return false;

        // Requested explicitly: deleting a playlist now cascades onto its videos
        // too, not just the "unreachable via the parent filter" effect this used to
        // rely on alone. Capturing one timestamp/admin pair and stamping every
        // video with it (not each its own UtcNow) is what lets RestorePlaylistAsync
        // tell a cascaded video apart from one deleted separately.
        var deletedAt = DateTimeOffset.UtcNow;
        playlist.IsDeleted = true;
        playlist.DeletedAt = deletedAt;
        playlist.DeletedBy = deletedByAdminId;

        var videos = await db.Videos.Where(v => v.PlaylistId == playlist.Id).ToListAsync(cancellationToken);
        foreach (var video in videos)
        {
            video.IsDeleted = true;
            video.DeletedAt = deletedAt;
            video.DeletedBy = deletedByAdminId;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<DeletedPlaylistSummary>> GetDeletedPlaylistsAsync(CancellationToken cancellationToken) =>
        await db.Playlists
            .IgnoreQueryFilters()
            .Where(p => p.IsDeleted)
            .OrderByDescending(p => p.DeletedAt)
            .Select(p => new DeletedPlaylistSummary(
                p.Id.ToString(),
                p.YoutubePlaylistId,
                p.Title,
                p.Audience,
                p.ColorFrom,
                p.ColorTo,
                p.DeletedAt,
                // Explicit !IsDeleted, not a reliance on the default query filter —
                // this whole query already called IgnoreQueryFilters() on its root
                // (Playlists), and that turns out to suppress the global filter for
                // every entity reference in the compiled query, this embedded
                // subquery included, not just the root. Only counts videos that are
                // still actually there, not ones separately (or cascade-) deleted.
                db.Videos.Count(v => v.PlaylistId == p.Id && !v.IsDeleted)))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<DeletedVideoSummary>> GetDeletedVideosAsync(CancellationToken cancellationToken) =>
        await db.Videos
            .IgnoreQueryFilters()
            .Where(v => v.IsDeleted)
            .OrderByDescending(v => v.DeletedAt)
            .Select(v => new DeletedVideoSummary(
                v.YoutubeVideoId,
                v.Title,
                v.DurationSeconds,
                v.Audience,
                v.Playlist != null ? v.Playlist.Title : null,
                v.Playlist != null ? v.Playlist.Id : (Guid?)null,
                v.Playlist != null ? v.Playlist.YoutubePlaylistId : null,
                v.Playlist != null && v.Playlist.IsDeleted,
                v.DeletedAt))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PlaylistVideoStatusSummary>?> GetPlaylistVideosAsync(string publicId, CancellationToken cancellationToken)
    {
        var internalId = await ResolvePlaylistPublicIdAsync(publicId, cancellationToken);
        if (internalId is null)
            return null;

        return await db.Videos
            .IgnoreQueryFilters()
            .Where(v => v.PlaylistId == internalId)
            .OrderBy(v => v.SortOrder)
            .Select(v => new PlaylistVideoStatusSummary(
                v.YoutubeVideoId, v.Title, v.DurationSeconds, v.Audience, v.IsDeleted, v.DeletedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> RestoreVideoAsync(string youtubeVideoId, CancellationToken cancellationToken)
    {
        var video = await db.Videos
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(v => v.YoutubeVideoId == youtubeVideoId && v.IsDeleted, cancellationToken);
        if (video is null)
            return false;

        video.IsDeleted = false;
        video.DeletedAt = null;
        video.DeletedBy = null;
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> RestorePlaylistAsync(string publicId, CancellationToken cancellationToken)
    {
        var internalId = await ResolvePlaylistPublicIdAsync(publicId, cancellationToken);
        if (internalId is null)
            return false;

        var playlist = await db.Playlists
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == internalId && p.IsDeleted, cancellationToken);
        if (playlist is null)
            return false;

        // Only restore videos cascade-deleted alongside this exact delete (same
        // DeletedAt/DeletedBy pair SoftDeletePlaylistAsync stamped them with) —
        // a video deleted separately, before or after, stays deleted.
        var cascadedDeletedAt = playlist.DeletedAt;
        var cascadedDeletedBy = playlist.DeletedBy;

        playlist.IsDeleted = false;
        playlist.DeletedAt = null;
        playlist.DeletedBy = null;

        var cascadedVideos = await db.Videos
            .IgnoreQueryFilters()
            .Where(v => v.PlaylistId == playlist.Id && v.IsDeleted
                && v.DeletedAt == cascadedDeletedAt && v.DeletedBy == cascadedDeletedBy)
            .ToListAsync(cancellationToken);
        foreach (var video in cascadedVideos)
        {
            video.IsDeleted = false;
            video.DeletedAt = null;
            video.DeletedBy = null;
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> MoveVideoAsync(string youtubeVideoId, string? newPlaylistPublicId, CancellationToken cancellationToken)
    {
        var video = await db.Videos
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(v => v.YoutubeVideoId == youtubeVideoId, cancellationToken);
        if (video is null)
            return false;

        Guid? newPlaylistId = null;
        if (newPlaylistPublicId is not null)
        {
            newPlaylistId = await ResolvePlaylistPublicIdAsync(newPlaylistPublicId, cancellationToken)
                ?? throw new PlaylistNotFoundException(newPlaylistPublicId);
        }

        video.PlaylistId = newPlaylistId;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<Guid?> ResolveVideoIdAsync(string youtubeVideoId, CancellationToken cancellationToken) =>
        db.Videos
            .IgnoreQueryFilters()
            .Where(v => v.YoutubeVideoId == youtubeVideoId)
            .Select(v => (Guid?)v.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<WatchProgressRow>> GetWatchProgressForChildAsync(
        Guid childId, CancellationToken cancellationToken) =>
        await db.WatchProgresses
            .Where(w => w.ChildId == childId)
            .Select(w => new WatchProgressRow(w.Video.YoutubeVideoId, w.WatchedPct))
            .ToListAsync(cancellationToken);

    public async Task<int> UpsertWatchProgressAsync(Guid childId, Guid videoId, int pct, CancellationToken cancellationToken)
    {
        var existing = await db.WatchProgresses
            .FirstOrDefaultAsync(w => w.ChildId == childId && w.VideoId == videoId, cancellationToken);

        if (existing is null)
        {
            db.WatchProgresses.Add(new WatchProgress
            {
                Id = Guid.NewGuid(),
                ChildId = childId,
                VideoId = videoId,
                WatchedPct = pct,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync(cancellationToken);
            return pct;
        }

        var merged = Math.Max(existing.WatchedPct, pct);
        existing.WatchedPct = merged;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return merged;
    }
}
