using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetDeletedPlaylists;

public sealed class GetDeletedPlaylistsQueryHandler(IContentCatalogRepository repository)
    : IRequestHandler<GetDeletedPlaylistsQuery, IReadOnlyList<DeletedPlaylistDto>>
{
    public async Task<IReadOnlyList<DeletedPlaylistDto>> Handle(GetDeletedPlaylistsQuery request, CancellationToken cancellationToken)
    {
        var deleted = await repository.GetDeletedPlaylistsAsync(cancellationToken);
        return deleted
            .Select(p => new DeletedPlaylistDto(
                p.Id, p.YoutubePlaylistId, p.Title, p.Audience, p.ColorFrom, p.ColorTo, p.DeletedAt, p.VideoCount))
            .ToList();
    }
}
