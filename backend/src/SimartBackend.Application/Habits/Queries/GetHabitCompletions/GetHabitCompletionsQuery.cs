using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitCompletions;

/// <summary>See CompleteHabitTaskCommand's doc comment for CallerFamilyId.</summary>
public sealed record GetHabitCompletionsQuery(Guid CallerFamilyId, Guid ChildId, DateOnly LogDate)
    : IRequest<IReadOnlyList<HabitCompletionDto>>;
