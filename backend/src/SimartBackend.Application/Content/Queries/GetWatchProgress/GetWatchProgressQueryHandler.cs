using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetWatchProgress;

public sealed class GetWatchProgressQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IContentCatalogRepository contentCatalogRepository)
    : IRequestHandler<GetWatchProgressQuery, IReadOnlyList<WatchProgressDto>>
{
    public async Task<IReadOnlyList<WatchProgressDto>> Handle(
        GetWatchProgressQuery request, CancellationToken cancellationToken)
    {
        await ContentChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var rows = await contentCatalogRepository.GetWatchProgressForChildAsync(request.ChildId, cancellationToken);
        return rows.Select(r => new WatchProgressDto(r.YoutubeVideoId, r.WatchedPct)).ToList();
    }
}
