using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Commands.CreateFamilyHabitTask;

public sealed record CreateFamilyHabitTaskCommand(Guid FamilyId, Guid CategoryId, string Title, string? Note, int XpValue)
    : IRequest<HabitTaskDto>;
