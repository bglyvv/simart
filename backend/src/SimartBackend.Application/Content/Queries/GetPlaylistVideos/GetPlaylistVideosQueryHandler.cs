using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;
using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Content.Queries.GetPlaylistVideos;

public sealed class GetPlaylistVideosQueryHandler(IContentCatalogRepository repository)
    : IRequestHandler<GetPlaylistVideosQuery, IReadOnlyList<PlaylistVideoStatusDto>?>
{
    public async Task<IReadOnlyList<PlaylistVideoStatusDto>?> Handle(GetPlaylistVideosQuery request, CancellationToken cancellationToken)
    {
        var videos = await repository.GetPlaylistVideosAsync(request.PlaylistId, cancellationToken);
        return videos?
            .Select(v => new PlaylistVideoStatusDto(
                v.YoutubeVideoId, v.Title, DurationFormat.FormatFromSeconds(v.DurationSeconds), v.Audience,
                v.IsDeleted, v.DeletedAt))
            .ToList();
    }
}
