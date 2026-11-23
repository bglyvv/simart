namespace SimartBackend.Api.Contracts;

/// <summary>YoutubePlaylistId null is a deliberate "no playlist" choice — see
/// AssignVideoCommand's doc comment. It's the real YouTube playlist id (matching
/// GET /api/content/playlists' PlaylistDto.Id), not our internal database Guid.</summary>
public sealed record AssignVideoRequest(string YoutubeVideoId, string Title, string Duration, string? YoutubePlaylistId, string Audience);

/// <summary>YoutubePlaylistId null is a deliberate "not tied to a real YouTube
/// playlist" choice — see CreatePlaylistCommand's doc comment.</summary>
public sealed record CreatePlaylistRequest(
    string? YoutubePlaylistId, string Title, string Audience, string? Description, string ColorFrom, string ColorTo);

public sealed record VerifyYoutubePlaylistRequest(string YoutubePlaylistId);

public sealed record ImportYoutubePlaylistRequest(
    string YoutubePlaylistId, string Title, string Audience, string? Description, string ColorFrom, string ColorTo);

public sealed record MoveVideoRequest(string? YoutubePlaylistId);

public sealed record UpsertWatchProgressRequest(string YoutubeVideoId, int WatchedPct);
