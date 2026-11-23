using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Habits.Commands.UncompleteHabitTask;

public sealed class UncompleteHabitTaskCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IHabitCatalogRepository habitCatalogRepository)
    : IRequestHandler<UncompleteHabitTaskCommand>
{
    public async Task Handle(UncompleteHabitTaskCommand request, CancellationToken cancellationToken)
    {
        await HabitChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var existing = await habitCatalogRepository.FindCompletionAsync(
            request.ChildId, request.TaskId, request.LogDate, cancellationToken);
        if (existing is null)
            return;

        // Reverse the XP grant too, not just the completion row — otherwise the
        // ledger (XpTransaction) would keep an award for a task that's no longer
        // marked done.
        var xpTransaction = await habitCatalogRepository.FindXpTransactionBySourceAsync(
            HabitXpAward.SourceType, existing.Id, cancellationToken);
        if (xpTransaction is not null)
            await habitCatalogRepository.RemoveXpTransactionAsync(xpTransaction, cancellationToken);

        await habitCatalogRepository.RemoveCompletionAsync(existing, cancellationToken);
    }
}
