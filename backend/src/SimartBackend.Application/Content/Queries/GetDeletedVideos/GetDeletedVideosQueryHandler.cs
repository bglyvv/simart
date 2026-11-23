using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;
using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Content.Queries.GetDeletedVideos;

public sealed class GetDeletedVideosQueryHandler(IContentCatalogRepository repository)
    : IRequestHandler<GetDeletedVideosQuery, IReadOnlyList<DeletedVideoDto>>
{
    public async Task<IReadOnlyList<DeletedVideoDto>> Handle(GetDeletedVideosQuery request, CancellationToken cancellationToken)
    {
        var deleted = await repository.GetDeletedVideosAsync(cancellationToken);
        return deleted
            .Select(v => new DeletedVideoDto(
                v.YoutubeVideoId, v.Title, DurationFormat.FormatFromSeconds(v.DurationSeconds), v.Audience,
                v.PlaylistTitle,
                // Same public-id fallback PlaylistDto.Id uses — computed here, not in
                // the repository's LINQ query, since Guid.ToString() isn't something
                // to lean on the EF provider to translate.
                v.PlaylistYoutubeId ?? v.PlaylistInternalId?.ToString(),
                v.IsPlaylistDeleted,
                v.DeletedAt))
            .ToList();
    }
}
