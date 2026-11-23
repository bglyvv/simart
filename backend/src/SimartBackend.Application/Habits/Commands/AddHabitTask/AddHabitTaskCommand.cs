using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Commands.AddHabitTask;

public sealed record AddHabitTaskCommand(Guid CategoryId, string Title, string? Note, int XpValue)
    : IRequest<HabitTaskDto>;
