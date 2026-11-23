using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content.Commands.DeletePlaylist;

public sealed class DeletePlaylistCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<DeletePlaylistCommand>
{
    public async Task Handle(DeletePlaylistCommand request, CancellationToken cancellationToken)
    {
        var deleted = await repository.SoftDeletePlaylistAsync(
            request.YoutubePlaylistId, request.DeletedByAdminId, cancellationToken);
        if (!deleted)
            throw new PlaylistNotFoundException(request.YoutubePlaylistId);
    }
}
