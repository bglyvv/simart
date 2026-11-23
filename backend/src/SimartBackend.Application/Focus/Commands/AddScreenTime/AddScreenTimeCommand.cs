using MediatR;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Commands.AddScreenTime;

/// <summary>Date is required from the caller, same reasoning as logDate
/// everywhere else in this backend (Habits) — only the frontend knows the
/// child's local "today" near midnight in a non-UTC timezone.</summary>
public sealed record AddScreenTimeCommand(Guid CallerFamilyId, Guid ChildId, DateOnly Date, int SecondsDelta)
    : IRequest<ScreenTimeDto>;
