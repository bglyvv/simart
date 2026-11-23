using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Commands.CompleteHabitTask;

/// <summary>CallerFamilyId is the token's familyId, passed down from Program.cs so
/// the handler can verify the child actually belongs to the caller — same
/// ownership rule as AddChild/GetChildren, just resolved via the child instead of a
/// familyId already in the route (this endpoint is keyed by childId).</summary>
public sealed record CompleteHabitTaskCommand(Guid CallerFamilyId, Guid ChildId, Guid TaskId, DateOnly LogDate)
    : IRequest<HabitCompletionResultDto>;
