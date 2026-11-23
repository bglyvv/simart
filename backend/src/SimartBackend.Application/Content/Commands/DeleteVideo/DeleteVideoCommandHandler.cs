using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Content.Commands.DeleteVideo;

public sealed class DeleteVideoCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<DeleteVideoCommand>
{
    public async Task Handle(DeleteVideoCommand request, CancellationToken cancellationToken)
    {
        var deleted = await repository.SoftDeleteVideoAsync(
            request.YoutubeVideoId, request.DeletedByAdminId, cancellationToken);
        if (!deleted)
            throw new VideoNotFoundException(request.YoutubeVideoId);
    }
}
