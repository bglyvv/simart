using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.CreatePlaylist;

/// <summary>An admin registering a playlist — either tied to a real YouTube
/// playlist (id + title they typed in, not fetched — unlike AssignVideo's video
/// metadata, which comes back from a prior discover call, nothing here round-trips
/// through GetNewContentQuery first) or, with YoutubePlaylistId null, a purely
/// internal grouping not tied to YouTube at all — along with the audience/color
/// metadata YouTube itself has no concept of either way. See ImportYoutubePlaylist
/// for the "verify it exists on YouTube and pull in all its videos" counterpart.</summary>
public sealed record CreatePlaylistCommand(
    string? YoutubePlaylistId, string Title, string Audience, string? Description, string ColorFrom, string ColorTo)
    : IRequest<CreatedPlaylistDto>;
