using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitStreak;

/// <summary>See CompleteHabitTaskCommand's doc comment for CallerFamilyId. Today is
/// passed in by the caller (same reason LogDate is on every other Habits endpoint,
/// not computed server-side from DateTime.UtcNow) — a child's "today" depends on
/// their own local timezone, which only the frontend actually knows.</summary>
public sealed record GetHabitStreakQuery(Guid CallerFamilyId, Guid ChildId, DateOnly Today) : IRequest<HabitStreakDto>;
