namespace SimartBackend.Domain.Content;

/// <summary>
/// A YouTube playlist (one of them is technically a YouTube "podcast", not a classic
/// playlist), merged with the locally-maintained <see cref="Audience"/> tag that YouTube
/// itself has no concept of. See <c>PlaylistAudienceMap</c> in the Infrastructure layer.
/// </summary>
/// <param name="Id">The public-facing identifier: the real YouTube playlist ID, or —
/// for a playlist created without one — the internal database Guid as a string.
/// Always non-null; use <paramref name="YoutubePlaylistId"/> to tell which case this is.</param>
/// <param name="YoutubePlaylistId">The real YouTube playlist ID, or null if this
/// playlist was created directly without tying it to one.</param>
public sealed record Playlist(
    string Id,
    string? YoutubePlaylistId,
    string Title,
    Audience Audience,
    string? Description,
    string ColorFrom,
    string ColorTo,
    IReadOnlyList<PlaylistVideo> Videos);
