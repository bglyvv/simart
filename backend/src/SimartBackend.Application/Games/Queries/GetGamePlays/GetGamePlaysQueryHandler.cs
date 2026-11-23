using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Games.Dtos;

namespace SimartBackend.Application.Games.Queries.GetGamePlays;

public sealed class GetGamePlaysQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IGameRepository gameRepository, IHabitCatalogRepository xpLedger)
    : IRequestHandler<GetGamePlaysQuery, IReadOnlyList<GamePlayDto>>
{
    public async Task<IReadOnlyList<GamePlayDto>> Handle(GetGamePlaysQuery request, CancellationToken cancellationToken)
    {
        await GamesChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var results = await gameRepository.GetRecentResultsForChildAsync(request.ChildId, request.Limit, cancellationToken);

        // Batch-attach each play's real XpAwarded in one query — same shape
        // GetHabitCompletionsQueryHandler already uses, not an N+1.
        var amounts = await xpLedger.GetXpAmountsForSourceIdsAsync(
            GameXpAward.SourceType, results.Select(r => r.Id).ToList(), cancellationToken);

        return results
            .Select(r => new GamePlayDto(r.Id, r.Game.Slug, r.Game.Axis, r.Score, amounts.GetValueOrDefault(r.Id, 0), r.PlayedAt))
            .ToList();
    }
}
