using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.ImportYoutubePlaylist;

/// <summary>The create-playlist modal's "import from YouTube" submit — the admin
/// already confirmed the playlist is real via VerifyYoutubePlaylistQuery (the
/// "Yoxla" button), this re-verifies defensively, then registers the playlist and
/// pulls in every one of its videos in one go, all tagged with Audience. A video
/// already in our database (under this or any other playlist) is skipped, never
/// moved — an admin who actually wants that can do it by hand afterward via
/// "change playlist" (MoveVideoCommand).</summary>
public sealed record ImportYoutubePlaylistCommand(
    string YoutubePlaylistId, string Title, string Audience, string? Description, string ColorFrom, string ColorTo)
    : IRequest<ImportYoutubePlaylistResultDto>;
