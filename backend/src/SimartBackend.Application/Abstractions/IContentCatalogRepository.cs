namespace SimartBackend.Application.Abstractions;

/// <summary>Where the real (database-backed) playlist/video catalog is read and
/// written for the admin review flow — distinct from IPlaylistCatalog, which only
/// ever returns the merged read-model GetPlaylistsQuery serves to the family app.
/// Implemented in Infrastructure against SimartDbContext.</summary>
public interface IContentCatalogRepository
{
    /// <summary>Every YoutubeVideoId already in the database (including
    /// soft-deleted/moderated ones — IgnoreQueryFilters — so a moderated-out video
    /// is never re-discovered as "new" and re-added). Used to diff against what
    /// IYouTubeContentSource returns.</summary>
    Task<IReadOnlySet<string>> GetExistingYoutubeVideoIdsAsync(CancellationToken cancellationToken);

    /// <summary>Every playlist already in the database — both the set of
    /// "known playlists" IYouTubeContentSource scans, and what GetNewContentQuery
    /// matches a discovered video's FoundInYoutubePlaylistId against.</summary>
    Task<IReadOnlyList<PlaylistSummary>> GetPlaylistSummariesAsync(CancellationToken cancellationToken);

    /// <summary>Creates the Video row — playlistId null is a deliberate, valid
    /// choice (a video with no playlist), not an error. Returns the new row's id.</summary>
    Task<Guid> AddVideoAsync(
        string youtubeVideoId, string title, int durationSeconds, Guid? playlistId, string audience,
        CancellationToken cancellationToken);

    /// <summary>Soft-deletes (IsDeleted/DeletedAt/DeletedBy — never a real DELETE) the
    /// video with this youtubeVideoId. Returns false if no non-already-deleted video
    /// has that id. The global query filter already hides a soft-deleted video from
    /// every family-facing read (GetPlaylistsQuery/DbPlaylistCatalog included), so
    /// this alone is what "remove from the feed" means — no separate step needed.</summary>
    Task<bool> SoftDeleteVideoAsync(string youtubeVideoId, Guid deletedByAdminId, CancellationToken cancellationToken);

    /// <summary>True if a playlist with this youtubePlaylistId exists at all —
    /// IgnoreQueryFilters, so a soft-deleted (removed) playlist still counts and
    /// CreatePlaylistCommand can't silently create a confusing duplicate row over it.
    /// Only ever called with a real (non-null) YouTube id — a playlist created
    /// without one has nothing to collide on.</summary>
    Task<bool> PlaylistExistsAsync(string youtubePlaylistId, CancellationToken cancellationToken);

    /// <summary>Resolves a playlist's public-facing id (the real YouTube id, or —
    /// for a playlist with none — the internal database Guid as a string, see
    /// <see cref="SimartBackend.Domain.Content.Playlist"/>) to that internal Guid.
    /// IgnoreQueryFilters, so a soft-deleted playlist still resolves (every
    /// playlist-targeting action needs to find it either way) — used by
    /// AssignVideoCommandHandler to resolve the id an admin picked (the same one
    /// the review UI's dropdown uses) into the foreign key Video.PlaylistId
    /// actually needs, as well as by every other playlist-targeting action in this
    /// interface. Null if nothing matches at all.</summary>
    Task<Guid?> ResolvePlaylistPublicIdAsync(string publicId, CancellationToken cancellationToken);

    /// <summary>Creates the Playlist row. youtubePlaylistId null is a deliberate
    /// "not tied to a real YouTube playlist" choice, same shape as a video's own
    /// nullable PlaylistId. Returns the new row's id.</summary>
    Task<Guid> AddPlaylistAsync(
        string? youtubePlaylistId, string title, string audience, string? description, string colorFrom, string colorTo,
        CancellationToken cancellationToken);

    /// <summary>Soft-deletes a playlist, and — requested explicitly, a change from
    /// this method's earlier behavior — cascades the same soft delete onto every one
    /// of its currently non-deleted videos too (same DeletedAt/DeletedBy, so
    /// RestorePlaylistAsync can tell exactly which videos it cascaded and which were
    /// separately deleted on their own). Returns false if no non-already-deleted
    /// playlist matches this public id.</summary>
    Task<bool> SoftDeletePlaylistAsync(string publicId, Guid deletedByAdminId, CancellationToken cancellationToken);

    /// <summary>Every soft-deleted playlist — the admin dashboard's "Silinmiş" tab.
    /// VideoCount only counts that playlist's own non-deleted videos (IgnoreQueryFilters
    /// on the playlist itself, default-filtered count on its videos).</summary>
    Task<IReadOnlyList<DeletedPlaylistSummary>> GetDeletedPlaylistsAsync(CancellationToken cancellationToken);

    /// <summary>Every soft-deleted video — the admin dashboard's "Silinmiş" tab.
    /// PlaylistTitle/PlaylistInternalId/PlaylistYoutubeId are read with
    /// IgnoreQueryFilters too, so they're still populated even when the video's
    /// former playlist has since been deleted as well.</summary>
    Task<IReadOnlyList<DeletedVideoSummary>> GetDeletedVideosAsync(CancellationToken cancellationToken);

    /// <summary>Every video belonging to this playlist, deleted or not — the admin
    /// dashboard's "Silinmiş" tab expand action, so an admin can see exactly which of
    /// a deleted playlist's videos would come back if it were restored, and which
    /// were deleted separately. Null if no playlist (deleted or not) matches this
    /// public id at all; an empty list if it exists but has no videos.</summary>
    Task<IReadOnlyList<PlaylistVideoStatusSummary>?> GetPlaylistVideosAsync(string publicId, CancellationToken cancellationToken);

    /// <summary>Un-deletes a video (IsDeleted/DeletedAt/DeletedBy all reset) —
    /// IgnoreQueryFilters to find it (it's hidden from the default query by
    /// definition), only succeeds if it's currently actually deleted. Returns false
    /// otherwise (doesn't exist at all, or isn't deleted). Immediately reappears in
    /// GetPlaylistsQuery/DbPlaylistCatalog once restored — same global filter,
    /// working in reverse. Deliberately doesn't check or touch the video's playlist
    /// at all (that's the review UI's job, via the warning + GetDeletedVideosAsync's
    /// IsPlaylistDeleted flag) — a video can end up restored-but-still-invisible if
    /// its playlist is still deleted, exactly as it would from any other soft-delete
    /// interaction between a parent and child row in this schema.</summary>
    Task<bool> RestoreVideoAsync(string youtubeVideoId, CancellationToken cancellationToken);

    /// <summary>Un-deletes a playlist, and restores exactly the videos
    /// SoftDeletePlaylistAsync cascaded onto it (matched by DeletedAt/DeletedBy, not
    /// just PlaylistId — a video deleted separately, before or after the playlist,
    /// stays deleted). Same not-found contract as RestoreVideoAsync.</summary>
    Task<bool> RestorePlaylistAsync(string publicId, CancellationToken cancellationToken);

    /// <summary>Moves an existing video (active or soft-deleted — IgnoreQueryFilters)
    /// to a different playlist, or to none at all (newPlaylistPublicId null). Used by
    /// the admin dashboard's per-video "change playlist" control on an active video,
    /// and by the restore-warning flow to re-home a deleted video whose old playlist
    /// is also deleted, without needing to restore that playlist too. Returns false
    /// if no video matches youtubeVideoId; throws PlaylistNotFoundException if
    /// newPlaylistPublicId doesn't resolve to any playlist we have.</summary>
    Task<bool> MoveVideoAsync(string youtubeVideoId, string? newPlaylistPublicId, CancellationToken cancellationToken);

    /// <summary>Resolves a video's internal id from its YoutubeVideoId —
    /// WatchProgress is keyed by the internal Guid, but the frontend only ever
    /// knows YoutubeVideoId, same "resolve at the boundary" shape
    /// ResolvePlaylistPublicIdAsync already uses for playlists.
    /// IgnoreQueryFilters, so a video that's since been soft-deleted still
    /// resolves — a child already partway through a video that gets moderated
    /// out shouldn't lose their own progress record over it. Null if no video
    /// has this id at all.</summary>
    Task<Guid?> ResolveVideoIdAsync(string youtubeVideoId, CancellationToken cancellationToken);

    /// <summary>Every video this child has any WatchProgress for, joined back to
    /// YoutubeVideoId — AnimationsPage.tsx's real replacement for the old
    /// local-only `watchedPct` seed. Loaded in full, not filtered to a specific
    /// video list; one child's distinct watched-video count is small enough
    /// that this is simpler than asking the caller to enumerate which videos
    /// it cares about, same reasoning as IHabitCatalogRepository.GetCompletionDatesAsync.</summary>
    Task<IReadOnlyList<WatchProgressRow>> GetWatchProgressForChildAsync(Guid childId, CancellationToken cancellationToken);

    /// <summary>Sets this child's WatchedPct for a video to the max of whatever
    /// was already stored and the new value — monotonic, the server-side copy
    /// of the same "never regress" rule AnimationsPage.tsx's own
    /// handleProgress already enforces client-side. Creates the row on first
    /// watch. Returns the resulting (post-merge) percentage.</summary>
    Task<int> UpsertWatchProgressAsync(Guid childId, Guid videoId, int pct, CancellationToken cancellationToken);
}

public sealed record WatchProgressRow(string YoutubeVideoId, int WatchedPct);

public sealed record PlaylistSummary(Guid Id, string YoutubePlaylistId, string Title, string Audience);

public sealed record DeletedPlaylistSummary(
    string Id, string? YoutubePlaylistId, string Title, string Audience, string ColorFrom, string ColorTo,
    DateTimeOffset? DeletedAt, int VideoCount);

public sealed record DeletedVideoSummary(
    string YoutubeVideoId, string Title, int DurationSeconds, string Audience,
    string? PlaylistTitle, Guid? PlaylistInternalId, string? PlaylistYoutubeId, bool IsPlaylistDeleted,
    DateTimeOffset? DeletedAt);

public sealed record PlaylistVideoStatusSummary(
    string YoutubeVideoId, string Title, int DurationSeconds, string Audience, bool IsDeleted, DateTimeOffset? DeletedAt);
