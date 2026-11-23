using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.UpsertWatchProgress;

public sealed class UpsertWatchProgressCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IContentCatalogRepository contentCatalogRepository)
    : IRequestHandler<UpsertWatchProgressCommand, WatchProgressDto>
{
    public async Task<WatchProgressDto> Handle(UpsertWatchProgressCommand request, CancellationToken cancellationToken)
    {
        await ContentChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (request.WatchedPct < 0 || request.WatchedPct > 100)
            throw new InvalidWatchedPctException(request.WatchedPct);

        var videoId = await contentCatalogRepository.ResolveVideoIdAsync(request.YoutubeVideoId, cancellationToken)
            ?? throw new VideoNotFoundException(request.YoutubeVideoId);

        var merged = await contentCatalogRepository.UpsertWatchProgressAsync(
            request.ChildId, videoId, request.WatchedPct, cancellationToken);

        return new WatchProgressDto(request.YoutubeVideoId, merged);
    }
}
