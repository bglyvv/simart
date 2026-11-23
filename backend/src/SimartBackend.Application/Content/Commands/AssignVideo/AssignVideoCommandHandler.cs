using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;
using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Content.Commands.AssignVideo;

public sealed class AssignVideoCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<AssignVideoCommand, AssignedVideoDto>
{
    public async Task<AssignedVideoDto> Handle(AssignVideoCommand request, CancellationToken cancellationToken)
    {
        Guid? playlistId = null;
        if (request.YoutubePlaylistId is { } youtubePlaylistId)
        {
            playlistId = await repository.ResolvePlaylistPublicIdAsync(youtubePlaylistId, cancellationToken)
                ?? throw new PlaylistNotFoundException(youtubePlaylistId);
        }

        var durationSeconds = DurationFormat.ParseToSeconds(request.Duration);
        var videoId = await repository.AddVideoAsync(
            request.YoutubeVideoId, request.Title, durationSeconds, playlistId, request.Audience, cancellationToken);

        return new AssignedVideoDto(videoId, request.YoutubeVideoId, request.Title, playlistId, request.Audience);
    }
}
