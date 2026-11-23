using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;
using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Content.Commands.ImportYoutubePlaylist;

public sealed class ImportYoutubePlaylistCommandHandler(
    IContentCatalogRepository repository, IYouTubeContentSource youtubeSource)
    : IRequestHandler<ImportYoutubePlaylistCommand, ImportYoutubePlaylistResultDto>
{
    public async Task<ImportYoutubePlaylistResultDto> Handle(ImportYoutubePlaylistCommand request, CancellationToken cancellationToken)
    {
        if (await repository.PlaylistExistsAsync(request.YoutubePlaylistId, cancellationToken))
            throw new PlaylistAlreadyExistsException(request.YoutubePlaylistId);

        // Defensive re-check — the admin already saw this via the "Yoxla" button's
        // VerifyYoutubePlaylistQuery, but nothing stops the playlist from going
        // private/deleted on YouTube's side in between.
        _ = await youtubeSource.GetPlaylistMetadataAsync(request.YoutubePlaylistId, cancellationToken)
            ?? throw new PlaylistNotFoundException(request.YoutubePlaylistId);

        var playlistId = await repository.AddPlaylistAsync(
            request.YoutubePlaylistId, request.Title, request.Audience, request.Description,
            request.ColorFrom, request.ColorTo, cancellationToken);

        var videos = await youtubeSource.FetchPlaylistVideosAsync(request.YoutubePlaylistId, cancellationToken);
        var existingVideoIds = await repository.GetExistingYoutubeVideoIdsAsync(cancellationToken);

        var importedCount = 0;
        var skippedCount = 0;
        foreach (var video in videos)
        {
            if (existingVideoIds.Contains(video.YoutubeVideoId))
            {
                skippedCount++;
                continue;
            }

            await repository.AddVideoAsync(
                video.YoutubeVideoId, video.Title, DurationFormat.ParseToSeconds(video.Duration), playlistId,
                request.Audience, cancellationToken);
            importedCount++;
        }

        var createdPlaylist = new CreatedPlaylistDto(
            playlistId, request.YoutubePlaylistId, request.YoutubePlaylistId, request.Title, request.Audience,
            request.Description, request.ColorFrom, request.ColorTo);
        return new ImportYoutubePlaylistResultDto(createdPlaylist, importedCount, skippedCount);
    }
}
