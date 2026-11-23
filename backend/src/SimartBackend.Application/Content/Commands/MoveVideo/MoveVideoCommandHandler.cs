using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content.Commands.MoveVideo;

public sealed class MoveVideoCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<MoveVideoCommand>
{
    public async Task Handle(MoveVideoCommand request, CancellationToken cancellationToken)
    {
        var moved = await repository.MoveVideoAsync(request.YoutubeVideoId, request.YoutubePlaylistId, cancellationToken);
        if (!moved)
            throw new VideoNotFoundException(request.YoutubeVideoId);
    }
}
