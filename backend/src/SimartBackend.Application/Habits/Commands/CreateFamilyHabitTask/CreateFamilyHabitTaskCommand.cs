using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Commands.CreateFamilyHabitTask;

/// <summary>ChildIds is the family's children this task is assigned to — the
/// parent must pick at least one (validated in the handler, 400 otherwise),
/// and can pick any subset, not just "all" or "none".</summary>
public sealed record CreateFamilyHabitTaskCommand(
    Guid FamilyId, Guid CategoryId, string Title, string? Note, int XpValue, IReadOnlyList<Guid> ChildIds)
    : IRequest<HabitTaskDto>;
