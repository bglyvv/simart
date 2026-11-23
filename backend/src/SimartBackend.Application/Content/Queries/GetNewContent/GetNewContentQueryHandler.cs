using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetNewContent;

public sealed class GetNewContentQueryHandler(
    IContentCatalogRepository contentRepository, IYouTubeContentSource youtubeSource)
    : IRequestHandler<GetNewContentQuery, IReadOnlyList<DiscoveredVideoDto>>
{
    public async Task<IReadOnlyList<DiscoveredVideoDto>> Handle(GetNewContentQuery request, CancellationToken cancellationToken)
    {
        var playlists = await contentRepository.GetPlaylistSummariesAsync(cancellationToken);
        var playlistsByYoutubeId = playlists.ToDictionary(p => p.YoutubePlaylistId);

        var existingVideoIds = await contentRepository.GetExistingYoutubeVideoIdsAsync(cancellationToken);
        var channelVideos = await youtubeSource.FetchChannelVideosAsync(
            playlists.Select(p => p.YoutubePlaylistId).ToList(), cancellationToken);

        return channelVideos
            .Where(v => !existingVideoIds.Contains(v.YoutubeVideoId))
            .Select(v =>
            {
                var suggested = v.FoundInYoutubePlaylistId is not null
                    && playlistsByYoutubeId.TryGetValue(v.FoundInYoutubePlaylistId, out var match)
                        ? match
                        : null;
                return new DiscoveredVideoDto(
                    v.YoutubeVideoId, v.Title, v.Duration, v.FoundInYoutubePlaylistId, suggested?.Title, suggested?.Audience);
            })
            .ToList();
    }
}
