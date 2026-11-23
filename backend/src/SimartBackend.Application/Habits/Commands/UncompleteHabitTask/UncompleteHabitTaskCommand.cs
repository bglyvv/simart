using MediatR;

namespace SimartBackend.Application.Habits.Commands.UncompleteHabitTask;

/// <summary>See CompleteHabitTaskCommand's doc comment for CallerFamilyId. Idempotent
/// like its counterpart: un-completing a task that isn't currently completed is a
/// silent no-op, not an error.</summary>
public sealed record UncompleteHabitTaskCommand(Guid CallerFamilyId, Guid ChildId, Guid TaskId, DateOnly LogDate)
    : IRequest;
