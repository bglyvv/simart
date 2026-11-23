using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.VerifyYoutubePlaylist;

/// <summary>The "Yoxla" (check) button in the create-playlist modal's "import from
/// YouTube" mode — a dry-run against the real YouTube Data API v3 confirming a
/// typed-in playlist id/URL is a real, public playlist, with enough of a preview
/// (title, video count) that the admin can confirm before committing to the actual
/// import. Writes nothing either way.</summary>
public sealed record VerifyYoutubePlaylistQuery(string YoutubePlaylistId) : IRequest<YoutubePlaylistPreviewDto?>;
