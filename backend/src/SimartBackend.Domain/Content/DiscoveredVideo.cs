namespace SimartBackend.Domain.Content;

/// <summary>A video found on the real YouTube channel that isn't in our database yet
/// — what IYouTubeContentSource returns, before any admin has assigned it to a
/// playlist/audience. See GetNewContentQuery.</summary>
/// <param name="FoundInYoutubePlaylistId">The real YouTube playlist ID this video was
/// found under, if it's in one of our already-known playlists — null if it's only on
/// the channel's upload list and not in any known playlist (a genuinely "loose"
/// video).</param>
public sealed record DiscoveredVideo(
    string YoutubeVideoId,
    string Title,
    string Duration,
    string? FoundInYoutubePlaylistId);
