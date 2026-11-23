using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetPlaylists;

public sealed class GetPlaylistsQueryHandler(IPlaylistCatalog catalog)
    : IRequestHandler<GetPlaylistsQuery, IReadOnlyList<PlaylistDto>>
{
    public async Task<IReadOnlyList<PlaylistDto>> Handle(GetPlaylistsQuery request, CancellationToken cancellationToken)
    {
        var playlists = await catalog.GetAllAsync(cancellationToken);

        return playlists
            .Where(p => request.Audience is null || p.Audience == request.Audience)
            .Select(PlaylistDto.FromDomain)
            .ToList();
    }
}
