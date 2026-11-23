namespace SimartBackend.Application.Content.Dtos;

/// <summary>A video found on YouTube but not yet in our database — GET
/// /api/content/sync's response. SuggestedPlaylistId/Title/Audience are filled in
/// when the video was found inside one of our already-known playlists (null
/// otherwise, meaning it's not in any playlist at all) — a default for the admin
/// review UI to pre-select, not something that's ever applied automatically.
/// SuggestedPlaylistId is the real YouTube playlist id (matching
/// PlaylistDto.Id/GET /api/content/playlists), not our internal database Guid —
/// so the same value both pre-selects a <select> populated from that endpoint and
/// round-trips straight into AssignVideoCommand without a lookup on the frontend.</summary>
public sealed record DiscoveredVideoDto(
    string YoutubeVideoId,
    string Title,
    string Duration,
    string? SuggestedPlaylistId,
    string? SuggestedPlaylistTitle,
    string? SuggestedAudience);

/// <summary>Returned by AssignVideoCommand once a discovered video has been
/// committed to the database with an admin's chosen playlist/audience.</summary>
public sealed record AssignedVideoDto(Guid Id, string YoutubeVideoId, string Title, Guid? PlaylistId, string Audience);

/// <summary>Returned by CreatePlaylistCommand. PublicId (YoutubePlaylistId when set,
/// otherwise the database Guid as a string) is what the rest of the admin UI
/// addresses this playlist by — same convention PlaylistDto.Id uses.</summary>
public sealed record CreatedPlaylistDto(
    Guid Id,
    string PublicId,
    string? YoutubePlaylistId,
    string Title,
    string Audience,
    string? Description,
    string ColorFrom,
    string ColorTo);

/// <summary>GET /api/content/deleted-playlists' response shape — the admin
/// dashboard's "Silinmiş" tab. Id is the same public-identifier convention as
/// PlaylistDto.Id (YoutubePlaylistId when set, otherwise the database Guid as a
/// string) — what restore/expand actually address. VideoCount only counts the
/// playlist's own non-deleted videos (how many real videos would reappear if this
/// playlist were ever restored, on top of whichever were cascade-deleted with it).</summary>
public sealed record DeletedPlaylistDto(
    string Id,
    string? YoutubePlaylistId,
    string Title,
    string Audience,
    string ColorFrom,
    string ColorTo,
    DateTimeOffset? DeletedAt,
    int VideoCount);

/// <summary>GET /api/content/deleted-videos' response shape. PlaylistTitle is
/// whichever playlist the video was in when deleted, even if that playlist has
/// since been deleted too (or was null — the video never had one). PlaylistId is
/// that playlist's own public identifier (for a "restore the playlist too" shortcut
/// or to pre-select it when moving the video elsewhere) — null only when the video
/// never had a playlist. IsPlaylistDeleted is the warning flag: true means
/// restoring this video alone won't make it visible anywhere until its playlist is
/// also restored (or the video is moved to a different, active playlist).</summary>
public sealed record DeletedVideoDto(
    string YoutubeVideoId,
    string Title,
    string Duration,
    string Audience,
    string? PlaylistTitle,
    string? PlaylistId,
    bool IsPlaylistDeleted,
    DateTimeOffset? DeletedAt);

/// <summary>GET /api/content/playlists/{id}/videos' response shape — every video in
/// a playlist (deleted or not), for the "expand a deleted playlist" view in the
/// admin dashboard's "Silinmiş" tab. Also reusable for the active tab if a future
/// view needs it, though PlaylistDto.Videos already covers the common case there.</summary>
public sealed record PlaylistVideoStatusDto(
    string YoutubeVideoId,
    string Title,
    string Duration,
    string Audience,
    bool IsDeleted,
    DateTimeOffset? DeletedAt);

/// <summary>POST /api/content/playlists/verify-youtube's response shape — a
/// dry-run check (writes nothing) that a given id is a real, public YouTube
/// playlist, with enough of a preview (title, video count) for the admin to
/// confirm before committing to the actual import.</summary>
public sealed record YoutubePlaylistPreviewDto(string YoutubePlaylistId, string Title, int VideoCount);

/// <summary>POST /api/content/playlists/import-youtube's response shape — the
/// playlist that got created plus how many of its videos were actually new
/// (SkippedExistingCount covers a video already in our database under a different
/// playlist, or with none — never moved automatically, so the admin can do that by
/// hand via "change playlist" if that's actually what they want).</summary>
public sealed record ImportYoutubePlaylistResultDto(
    CreatedPlaylistDto Playlist, int ImportedVideoCount, int SkippedExistingCount);
