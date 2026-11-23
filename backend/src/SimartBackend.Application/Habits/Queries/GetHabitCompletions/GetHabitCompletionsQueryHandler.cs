using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitCompletions;

public sealed class GetHabitCompletionsQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IHabitCatalogRepository habitCatalogRepository)
    : IRequestHandler<GetHabitCompletionsQuery, IReadOnlyList<HabitCompletionDto>>
{
    public async Task<IReadOnlyList<HabitCompletionDto>> Handle(GetHabitCompletionsQuery request, CancellationToken cancellationToken)
    {
        await HabitChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var completions = await habitCatalogRepository.GetCompletionsForChildOnDateAsync(
            request.ChildId, request.LogDate, cancellationToken);

        // So the frontend knows exactly how much to subtract locally if the user
        // un-completes a task that was already done before this page load (e.g.
        // completed earlier today, then the page was reloaded) — the amount has to
        // match what the backend will actually remove, streak bonus included, not
        // the task's static XpValue.
        var xpAmounts = await habitCatalogRepository.GetXpAmountsForSourceIdsAsync(
            HabitXpAward.SourceType, completions.Select(c => c.Id).ToList(), cancellationToken);

        return completions
            .Select(c => xpAmounts.TryGetValue(c.Id, out var amount)
                ? HabitCompletionDto.FromDomain(c, amount)
                : HabitCompletionDto.FromDomain(c))
            .ToList();
    }
}
