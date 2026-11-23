using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content.Commands.RestoreVideo;

public sealed class RestoreVideoCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<RestoreVideoCommand>
{
    public async Task Handle(RestoreVideoCommand request, CancellationToken cancellationToken)
    {
        var restored = await repository.RestoreVideoAsync(request.YoutubeVideoId, cancellationToken);
        if (!restored)
            throw new VideoNotFoundException(request.YoutubeVideoId);
    }
}
