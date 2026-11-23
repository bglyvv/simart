using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content.Commands.RestorePlaylist;

public sealed class RestorePlaylistCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<RestorePlaylistCommand>
{
    public async Task Handle(RestorePlaylistCommand request, CancellationToken cancellationToken)
    {
        var restored = await repository.RestorePlaylistAsync(request.YoutubePlaylistId, cancellationToken);
        if (!restored)
            throw new PlaylistNotFoundException(request.YoutubePlaylistId);
    }
}
