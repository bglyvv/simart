using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.CreatePlaylist;

public sealed class CreatePlaylistCommandHandler(IContentCatalogRepository repository)
    : IRequestHandler<CreatePlaylistCommand, CreatedPlaylistDto>
{
    public async Task<CreatedPlaylistDto> Handle(CreatePlaylistCommand request, CancellationToken cancellationToken)
    {
        // Nothing to collide on when the playlist isn't tied to a real YouTube id.
        if (request.YoutubePlaylistId is { } youtubePlaylistId
            && await repository.PlaylistExistsAsync(youtubePlaylistId, cancellationToken))
            throw new PlaylistAlreadyExistsException(youtubePlaylistId);

        var id = await repository.AddPlaylistAsync(
            request.YoutubePlaylistId, request.Title, request.Audience, request.Description,
            request.ColorFrom, request.ColorTo, cancellationToken);

        return new CreatedPlaylistDto(
            id, request.YoutubePlaylistId ?? id.ToString(), request.YoutubePlaylistId, request.Title,
            request.Audience, request.Description, request.ColorFrom, request.ColorTo);
    }
}
