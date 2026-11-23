using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.AssignVideo;

/// <summary>Commits one video an admin reviewed (from GetNewContentQuery's result)
/// into the database — YoutubePlaylistId null is a deliberate "no playlist" choice,
/// not a missing value. It's the real YouTube playlist id (same as
/// DiscoveredVideoDto.SuggestedPlaylistId and PlaylistDto.Id), not our internal
/// database Guid — the handler resolves that itself. Title/Duration are passed
/// back in from the discover response rather than re-fetched from YouTube here —
/// this stays a pure "write what the admin confirmed" command, no second external
/// call.</summary>
public sealed record AssignVideoCommand(
    string YoutubeVideoId, string Title, string Duration, string? YoutubePlaylistId, string Audience)
    : IRequest<AssignedVideoDto>;
