using MediatR;
using SimartBackend.Application.Content.Dtos;
using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Content.Queries.GetPlaylists;

/// <param name="Audience">Filter to one audience, or null for every playlist.</param>
public sealed record GetPlaylistsQuery(Audience? Audience) : IRequest<IReadOnlyList<PlaylistDto>>;
