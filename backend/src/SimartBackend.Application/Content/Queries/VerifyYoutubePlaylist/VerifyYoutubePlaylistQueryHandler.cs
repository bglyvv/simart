using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.VerifyYoutubePlaylist;

public sealed class VerifyYoutubePlaylistQueryHandler(IYouTubeContentSource youtubeSource)
    : IRequestHandler<VerifyYoutubePlaylistQuery, YoutubePlaylistPreviewDto?>
{
    public async Task<YoutubePlaylistPreviewDto?> Handle(VerifyYoutubePlaylistQuery request, CancellationToken cancellationToken)
    {
        var metadata = await youtubeSource.GetPlaylistMetadataAsync(request.YoutubePlaylistId, cancellationToken);
        return metadata is null ? null : new YoutubePlaylistPreviewDto(request.YoutubePlaylistId, metadata.Title, metadata.VideoCount);
    }
}
