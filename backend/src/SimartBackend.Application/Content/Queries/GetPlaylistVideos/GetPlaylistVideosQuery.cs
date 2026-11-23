using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetPlaylistVideos;

/// <summary>Every video in one playlist, deleted or not — the admin dashboard's
/// "Silinmiş" tab expand action on a deleted playlist. PlaylistId is the public
/// identifier (PlaylistDto.Id convention). Null result means no playlist (deleted
/// or active) matches it at all.</summary>
public sealed record GetPlaylistVideosQuery(string PlaylistId) : IRequest<IReadOnlyList<PlaylistVideoStatusDto>?>;
