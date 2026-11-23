using DomainAudience = SimartBackend.Domain.Content.Audience;
using Playlist = SimartBackend.Domain.Content.Playlist;
using PlaylistVideo = SimartBackend.Domain.Content.PlaylistVideo;

namespace SimartBackend.Application.Content.Dtos;

/// <summary>Wire shape for <c>GET /api/content/playlists</c> — matches the frontend's
/// existing <c>Playlist</c> type in <c>frontend/src/lib/contentService.ts</c> field for
/// field, so swapping that file's mock for a real fetch needs no shape changes there.</summary>
public sealed record PlaylistDto(
    string Id,
    string? YoutubePlaylistId,
    string Title,
    string Audience,
    string? Description,
    string ColorFrom,
    string ColorTo,
    IReadOnlyList<PlaylistVideoDto> Videos)
{
    public static PlaylistDto FromDomain(Playlist playlist) => new(
        playlist.Id,
        playlist.YoutubePlaylistId,
        playlist.Title,
        playlist.Audience == DomainAudience.Parent ? "parent" : "child",
        playlist.Description,
        playlist.ColorFrom,
        playlist.ColorTo,
        playlist.Videos.Select(PlaylistVideoDto.FromDomain).ToList());
}

public sealed record PlaylistVideoDto(string YoutubeId, string Title, string Duration)
{
    public static PlaylistVideoDto FromDomain(PlaylistVideo video) =>
        new(video.YoutubeId, video.Title, video.Duration);
}
