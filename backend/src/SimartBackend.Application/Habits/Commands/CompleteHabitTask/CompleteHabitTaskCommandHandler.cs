using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Commands.CompleteHabitTask;

public sealed class CompleteHabitTaskCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IHabitCatalogRepository habitCatalogRepository)
    : IRequestHandler<CompleteHabitTaskCommand, HabitCompletionResultDto>
{
    public async Task<HabitCompletionResultDto> Handle(CompleteHabitTaskCommand request, CancellationToken cancellationToken)
    {
        await HabitChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var task = await habitCatalogRepository.FindTaskAsync(request.TaskId, cancellationToken)
            ?? throw new HabitTaskNotFoundException(request.TaskId);

        // Idempotent: completing an already-completed task just reports back the
        // amount it was already granted, rather than creating a duplicate
        // HabitCompletion/XpTransaction pair or recomputing a (potentially
        // different) streak bonus after the fact.
        var existing = await habitCatalogRepository.FindCompletionAsync(
            request.ChildId, request.TaskId, request.LogDate, cancellationToken);
        if (existing is not null)
        {
            var existingTx = await habitCatalogRepository.FindXpTransactionBySourceAsync(
                HabitXpAward.SourceType, existing.Id, cancellationToken);
            var existingStreakDays = await habitCatalogRepository.GetConsecutiveStreakDaysAsync(
                request.ChildId, request.TaskId, request.LogDate, cancellationToken);
            var existingBonus = HabitXpAward.CalculateStreakBonus(existingStreakDays);
            var existingBase = (existingTx?.Amount ?? task.XpValue) - existingBonus;
            return HabitCompletionResultDto.FromDomain(existing, existingBase, existingBonus, existingStreakDays);
        }

        var completion = new HabitCompletion
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            TaskId = request.TaskId,
            LogDate = request.LogDate,
            CompletedAt = DateTimeOffset.UtcNow,
        };
        await habitCatalogRepository.AddCompletionAsync(completion, cancellationToken);

        // Called after the row above is written, so today counts as day 1 of the
        // streak (not day 0) — see GetConsecutiveStreakDaysAsync's own doc comment.
        var streakDays = await habitCatalogRepository.GetConsecutiveStreakDaysAsync(
            request.ChildId, request.TaskId, request.LogDate, cancellationToken);
        var bonusXp = HabitXpAward.CalculateStreakBonus(streakDays);
        var awardedXp = task.XpValue + bonusXp;

        await habitCatalogRepository.AddXpTransactionAsync(new XpTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Amount = awardedXp,
            Reason = $"Vərdiş: {task.Title}",
            SourceType = HabitXpAward.SourceType,
            SourceId = completion.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        return HabitCompletionResultDto.FromDomain(completion, task.XpValue, bonusXp, streakDays);
    }
}
